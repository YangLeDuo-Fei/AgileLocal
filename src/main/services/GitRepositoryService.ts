// Git 仓库服务层 - 业务逻辑实现

import { z } from 'zod';
import { getDatabase } from '../database/connection';
import { AppError } from '../utils/AppError';
import { KeyManager } from '../security/KeyManager';
import logger from '../utils/logger';

const CreateRepositorySchema = z.object({
    projectId: z.number().int().positive(),
    repoUrl: z.string().url(),
    token: z.string().min(1),
});

/**
 * 创建 Git 仓库配置
 */
export async function createRepository(projectId: number, repoUrl: string, token: string): Promise<number> {
    const validationResult = CreateRepositorySchema.safeParse({ projectId, repoUrl, token });

    if (!validationResult.success) {
        throw new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
    }

    const db = await getDatabase();
    const keyManager = new KeyManager();

    try {
        // 加密 Token
        const encrypted = await keyManager.encrypt(Buffer.from(token, 'utf-8'));

        const result = await db
            .insertInto('git_repositories')
            .values({
                project_id: projectId,
                repo_url: repoUrl,
                encrypted_token_iv: encrypted.iv.toString('hex'),
                encrypted_token_content: encrypted.content.toString('hex'),
                last_synced_commit_sha: null,
            })
            .returning('id')
            .executeTakeFirstOrThrow();

        logger.info(`Git repository created: ${result.id}`);
        return result.id;
    } catch (error) {
        logger.error('Failed to create git repository', error);
        throw new AppError('500_DB_ERROR', `Failed to create git repository: ${error}`);
    }
}

/**
 * 获取项目的所有 Git 仓库
 */
export async function getRepositoriesByProject(projectId: number) {
    const db = await getDatabase();

    try {
        const repos = await db
            .selectFrom('git_repositories')
            .select([
                'id',
                'project_id',
                'repo_url',
                'last_synced_commit_sha',
            ])
            .where('project_id', '=', projectId)
            .execute();

        return repos;
    } catch (error) {
        logger.error('Failed to get git repositories', error);
        throw new AppError('500_DB_ERROR', `Failed to get git repositories: ${error}`);
    }
}

/**
 * 删除 Git 仓库
 */
export async function deleteRepository(repoId: number): Promise<void> {
    const db = await getDatabase();

    try {
        await db
            .deleteFrom('git_repositories')
            .where('id', '=', repoId)
            .execute();

        logger.info(`Git repository deleted: ${repoId}`);
    } catch (error) {
        logger.error('Failed to delete git repository', error);
        throw new AppError('500_DB_ERROR', `Failed to delete git repository: ${error}`);
    }
}











