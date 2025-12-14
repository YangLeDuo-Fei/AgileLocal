// 严格按照 V！.md v2025.PerfectScore.Final 生成
// Git 同步服务

import * as schedule from 'node-schedule';
import { Octokit } from '@octokit/core';
import { retry } from '@octokit/plugin-retry';
import { safeStorage } from 'electron';
import { getDatabase } from '../database/connection';
import { KeyManager } from '../security/KeyManager';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

// 任务ID提取正则表达式
const TASK_ID_REGEX = /#task[-_]?(\d+)|fix\s*#(\d+)|resolves\s*#(\d+)/i;

// 创建带重试插件的 Octokit
const MyOctokit = Octokit.plugin(retry);

/**
 * Git 同步服务
 */
export class GitSyncService {
    private scheduledJob: schedule.Job | null = null;

    /**
     * 启动定时同步任务（每5分钟执行一次）
     */
    start(): void {
        // 使用 cron 表达式：'*/5 * * * *' 表示每5分钟执行一次
        this.scheduledJob = schedule.scheduleJob('*/5 * * * *', this.syncRepositories.bind(this));
        logger.info('Git sync service started (runs every 5 minutes)');
    }

    /**
     * 停止定时同步任务
     */
    stop(): void {
        if (this.scheduledJob) {
            this.scheduledJob.cancel();
            this.scheduledJob = null;
            logger.info('Git sync service stopped');
        }
    }

    /**
     * 手动触发同步（供 IPC 调用）
     */
    async syncRepositories(): Promise<void> {
        logger.info('Starting Git repositories sync...');

        try {
            const db = await getDatabase();

            // 获取所有 Git 仓库配置
            const repositories = await db
                .selectFrom('git_repositories')
                .selectAll()
                .execute();

            if (repositories.length === 0) {
                logger.info('No Git repositories configured');
                return;
            }

            logger.info(`Found ${repositories.length} Git repository(ies) to sync`);

            // 遍历所有仓库进行同步
            for (const repo of repositories) {
                try {
                    await this.syncRepository(repo);
                } catch (error) {
                    // 单个仓库同步失败不影响其他仓库
                    logger.error(`Failed to sync repository ${repo.id} (${repo.repo_url})`, error);
                }
            }

            logger.info('Git repositories sync completed');
        } catch (error) {
            logger.error('Git repositories sync failed', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('500_DB_ERROR', `Failed to sync repositories: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * 同步单个仓库
     */
    private async syncRepository(repo: any): Promise<void> {
        const db = await getDatabase();

        // 解密 Token
        const keyManager = new KeyManager();
        let token: string;

        try {
            // 从 encrypted_token_content 和 encrypted_token_iv 解密 Token
            // Token 加密方式与数据库密钥类似，但存储在 GitRepositoriesTable 中
            token = await this.decryptToken(repo.encrypted_token_content, repo.encrypted_token_iv);
        } catch (error) {
            logger.error(`Failed to decrypt token for repository ${repo.id}`, error);
            throw new AppError('500_DB_ERROR', `Failed to decrypt Git token: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // 从 repo_url 提取 owner 和 repo 名称
        // 支持格式：https://github.com/owner/repo 或 git@github.com:owner/repo.git
        const urlMatch = repo.repo_url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
        if (!urlMatch) {
            logger.warn(`Invalid GitHub repository URL format: ${repo.repo_url}`);
            return;
        }

        const owner = urlMatch[1];
        const repoName = urlMatch[2].replace(/\.git$/, '');

        // 创建 Octokit 实例（带重试插件）
        const octokit = new MyOctokit({
            auth: token,
        });

        try {
            // 获取默认分支（main 或 master）
            let defaultBranch: string;
            try {
                const repoInfo = await octokit.request('GET /repos/{owner}/{repo}', {
                    owner,
                    repo: repoName,
                });
                defaultBranch = repoInfo.data.default_branch;
            } catch (error: any) {
                logger.error(`Failed to get repository info for ${owner}/${repoName}`, error);
                throw new AppError('503_NETWORK_TIMEOUT', `Failed to get repository info: ${error.message}`);
            }

            // 只同步 main 或 master 分支
            if (defaultBranch !== 'main' && defaultBranch !== 'master') {
                logger.info(`Skipping repository ${owner}/${repoName}: default branch is ${defaultBranch}, only syncing main/master`);
                return;
            }

            // 获取提交列表（使用 since 参数实现断点续传）
            let commits: any[] = [];
            let since: string | undefined = undefined;

            if (repo.last_synced_commit_sha) {
                // 如果有上次同步的 commit SHA，获取该 commit 的时间作为 since
                try {
                    const lastCommit = await octokit.request('GET /repos/{owner}/{repo}/commits/{ref}', {
                        owner,
                        repo: repoName,
                        ref: repo.last_synced_commit_sha,
                    });
                    // GitHub API 的 since 参数使用 ISO 8601 格式
                    // 获取该 commit 的提交时间，然后获取之后的所有 commit
                    since = lastCommit.data.commit.committer?.date || lastCommit.data.commit.author?.date;
                } catch (error: any) {
                    // 如果获取失败（commit 不存在或被删除），从头开始同步
                    logger.warn(`Failed to get last commit info (SHA: ${repo.last_synced_commit_sha}), syncing from beginning`, error);
                    since = undefined;
                }
            }

            try {
                // 获取提交列表（GitHub API 返回的 commits 按时间从新到旧排序）
                const commitsResponse = await octokit.request('GET /repos/{owner}/{repo}/commits', {
                    owner,
                    repo: repoName,
                    sha: defaultBranch,
                    since: since, // 基于时间过滤（ISO 8601 格式）
                    per_page: 100,
                });
                commits = commitsResponse.data;
            } catch (error: any) {
                logger.error(`Failed to get commits for ${owner}/${repoName}`, error);
                throw new AppError('503_NETWORK_TIMEOUT', `Failed to get commits: ${error.message}`);
            }

            if (commits.length === 0) {
                logger.info(`No new commits for repository ${owner}/${repoName}`);
                return;
            }

            logger.info(`Found ${commits.length} new commit(s) for repository ${owner}/${repoName}`);

            // 在事务中处理提交
            // 注意：GitHub API 返回的 commits 按时间从新到旧排序，第一个是最新的
            await db.transaction().execute(async (trx) => {
                let latestCommitSha: string | null = null;

                for (const commit of commits) {
                    const commitSha = commit.sha;
                    const commitMessage = commit.commit.message;
                    const committedAt = commit.commit.committer?.date || commit.commit.author?.date || new Date().toISOString();

                    // 使用正则表达式提取任务ID
                    // 正则：/#task[-_]?(\d+)|fix\s*#(\d+)|resolves\s*#(\d+)/i
                    const taskIdMatch = commitMessage.match(TASK_ID_REGEX);
                    let taskId: number | null = null;

                    if (taskIdMatch) {
                        // 匹配到任务ID（可能是 #task-123, #task_123, fix #123, resolves #123 等格式）
                        taskId = parseInt(taskIdMatch[1] || taskIdMatch[2] || taskIdMatch[3] || '0');

                        // 验证任务是否存在
                        if (taskId > 0) {
                            const task = await trx
                                .selectFrom('tasks')
                                .select('id')
                                .where('id', '=', taskId)
                                .executeTakeFirst();

                            if (task) {
                                // 任务存在，更新任务状态为 Done
                                await trx
                                    .updateTable('tasks')
                                    .set({
                                        status: 'Done',
                                        updated_at: new Date().toISOString(),
                                    })
                                    .where('id', '=', taskId)
                                    .execute();

                                logger.info(`Task ${taskId} status updated to Done (from commit ${commitSha})`);
                            } else {
                                taskId = null; // 任务不存在，不关联
                            }
                        }
                    }

                    // 检查该 commit 是否已存在
                    const existingCommit = await trx
                        .selectFrom('git_commits')
                        .select('id')
                        .where('repo_id', '=', repo.id)
                        .where('commit_sha', '=', commitSha)
                        .executeTakeFirst();

                    if (!existingCommit) {
                        // 插入 GitCommitsTable 记录
                        await trx
                            .insertInto('git_commits')
                            .values({
                                repo_id: repo.id,
                                commit_sha: commitSha,
                                message: commitMessage,
                                task_id: taskId,
                                committed_at: committedAt,
                            })
                            .execute();

                        logger.debug(`Inserted commit ${commitSha} for repository ${repo.id}`);
                    }

                    // 更新最新 commit SHA（commits 数组的第一个是最新的）
                    if (!latestCommitSha) {
                        latestCommitSha = commitSha;
                    }
                }

                // 更新 git_repositories.last_synced_commit_sha（使用最新的 commit SHA）
                if (latestCommitSha) {
                    await trx
                        .updateTable('git_repositories')
                        .set({
                            last_synced_commit_sha: latestCommitSha,
                        })
                        .where('id', '=', repo.id)
                        .execute();

                    logger.info(`Updated last_synced_commit_sha to ${latestCommitSha} for repository ${repo.id}`);
                } else if (commits.length > 0) {
                    // 如果没有更新 latestCommitSha，但 commits 不为空，使用第一个 commit
                    latestCommitSha = commits[0].sha;
                    await trx
                        .updateTable('git_repositories')
                        .set({
                            last_synced_commit_sha: latestCommitSha,
                        })
                        .where('id', '=', repo.id)
                        .execute();

                    logger.info(`Updated last_synced_commit_sha to ${latestCommitSha} for repository ${repo.id}`);
                }
            });

            logger.info(`Successfully synced repository ${owner}/${repoName}`);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error(`Error syncing repository ${owner}/${repoName}`, error);
            throw new AppError('503_NETWORK_TIMEOUT', `Failed to sync repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * 解密 Git Token
     * Token 加密方式与数据库密钥相同（使用 safeStorage 或 AES-256-GCM）
     */
    private async decryptToken(encryptedContent: string, encryptedIv: string): Promise<string> {
        // 检查是否使用 safeStorage（如果 encryptedIv 为空，说明使用 safeStorage）
        if (!encryptedIv || encryptedIv === '') {
            // 使用 safeStorage 解密
            if (!safeStorage.isEncryptionAvailable()) {
                throw new Error('safeStorage not available');
            }
            
            const encryptedBuffer = Buffer.from(encryptedContent, 'hex');
            return safeStorage.decryptString(encryptedBuffer);
        } else {
            // 使用 AES-256-GCM 解密
            // 注意：这里需要主密码，但根据文档要求，我们假设 Token 使用 safeStorage 加密
            // 如果使用 Fallback，需要实现 UI 获取主密码的流程
            // 为简化实现，这里暂时抛出错误提示使用 safeStorage
            throw new Error('AES-256-GCM token decryption requires master password. Please use safeStorage for token encryption.');
        }
    }
}

// 单例实例
let gitSyncServiceInstance: GitSyncService | null = null;

/**
 * 获取 GitSyncService 单例
 */
export function getGitSyncService(): GitSyncService {
    if (!gitSyncServiceInstance) {
        gitSyncServiceInstance = new GitSyncService();
    }
    return gitSyncServiceInstance;
}
