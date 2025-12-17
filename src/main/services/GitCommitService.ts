// Git 提交服务层 - 查询提交历史和关闭的任务

import { getDatabase } from '../database/connection';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

/**
 * 获取仓库的提交历史
 */
export async function getCommitsByRepository(repoId: number, limit: number = 50): Promise<Array<{
    id: number;
    repo_id: number;
    commit_sha: string;
    message: string;
    task_id: number | null;
    committed_at: string;
}>> {
    if (!Number.isInteger(repoId) || repoId <= 0) {
        throw new AppError('400_INVALID_INPUT', 'Invalid repoId');
    }

    try {
        const db = await getDatabase();

        const commits = await db
            .selectFrom('git_commits')
            .selectAll()
            .where('repo_id', '=', repoId)
            .orderBy('committed_at', 'desc')
            .limit(limit)
            .execute();

        return commits;
    } catch (error) {
        logger.error('Failed to get commits by repository', error);
        throw new AppError(
            '500_DB_ERROR',
            error instanceof Error ? error.message : 'Failed to get commits'
        );
    }
}

/**
 * 获取项目的所有提交历史（跨仓库）
 */
export async function getCommitsByProject(projectId: number, limit: number = 100): Promise<Array<{
    id: number;
    repo_id: number;
    commit_sha: string;
    message: string;
    task_id: number | null;
    committed_at: string;
    repo_url: string | null;
}>> {
    if (!Number.isInteger(projectId) || projectId <= 0) {
        throw new AppError('400_INVALID_INPUT', 'Invalid projectId');
    }

    try {
        const db = await getDatabase();

        const commits = await db
            .selectFrom('git_commits')
            .innerJoin('git_repositories', 'git_repositories.id', 'git_commits.repo_id')
            .select([
                'git_commits.id',
                'git_commits.repo_id',
                'git_commits.commit_sha',
                'git_commits.message',
                'git_commits.task_id',
                'git_commits.committed_at',
                'git_repositories.repo_url',
            ])
            .where('git_repositories.project_id', '=', projectId)
            .orderBy('git_commits.committed_at', 'desc')
            .limit(limit)
            .execute();

        return commits;
    } catch (error) {
        logger.error('Failed to get commits by project', error);
        throw new AppError(
            '500_DB_ERROR',
            error instanceof Error ? error.message : 'Failed to get commits'
        );
    }
}

/**
 * 获取最近关闭的任务（通过 commit 消息自动识别并关闭的任务）
 */
export async function getRecentlyClosedTasks(projectId: number, limit: number = 20): Promise<Array<{
    commit_id: number;
    commit_sha: string;
    commit_message: string;
    committed_at: string;
    task_id: number;
    task_title: string;
    repo_url: string | null;
}>> {
    if (!Number.isInteger(projectId) || projectId <= 0) {
        throw new AppError('400_INVALID_INPUT', 'Invalid projectId');
    }

    try {
        const db = await getDatabase();

        // 查询有关联任务 ID 的提交（这些是通过 commit 消息自动识别并关闭的任务）
        const closedTasks = await db
            .selectFrom('git_commits')
            .innerJoin('git_repositories', 'git_repositories.id', 'git_commits.repo_id')
            .innerJoin('tasks', 'tasks.id', 'git_commits.task_id')
            .select([
                'git_commits.id as commit_id',
                'git_commits.commit_sha',
                'git_commits.message as commit_message',
                'git_commits.committed_at',
                'tasks.id as task_id',
                'tasks.title as task_title',
                'git_repositories.repo_url',
            ])
            .where('git_repositories.project_id', '=', projectId)
            .where('git_commits.task_id', 'is not', null)
            .orderBy('git_commits.committed_at', 'desc')
            .limit(limit)
            .execute();

        return closedTasks;
    } catch (error) {
        logger.error('Failed to get recently closed tasks', error);
        throw new AppError(
            '500_DB_ERROR',
            error instanceof Error ? error.message : 'Failed to get recently closed tasks'
        );
    }
}

