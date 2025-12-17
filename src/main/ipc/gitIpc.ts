// 严格按照 V！.md v2025.PerfectScore.Final 生成
// Git IPC Handler

import { ipcMain } from 'electron';
import { z } from 'zod';
import { IpcChannels } from './IpcChannels';
import { getGitSyncService } from '../services/GitSyncService';
import { getCommitsByRepository, getCommitsByProject, getRecentlyClosedTasks } from '../services/GitCommitService';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

/**
 * 注册 Git 相关的 IPC Handlers
 */
export function registerGitIpcHandlers(): void {
    // 注册 SYNC_GIT handler
    ipcMain.handle(IpcChannels.SYNC_GIT, async () => {
        try {
            const gitSyncService = getGitSyncService();
            await gitSyncService.syncRepositories();
            return { success: true };
        } catch (error) {
            // 捕获所有错误并返回 AppError.toSerializable()
            if (error instanceof AppError) {
                logger.error(`IPC syncGit failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }

            // 未知错误转换为 500_DB_ERROR
            const appError = new AppError(
                '500_DB_ERROR',
                error instanceof Error ? error.message : 'Unknown error occurred'
            );
            logger.error('IPC syncGit failed with unknown error', error);
            return appError.toSerializable();
        }
    });

    // 获取仓库的提交历史
    ipcMain.handle(IpcChannels.GET_COMMITS_BY_REPOSITORY, async (_event, data: unknown) => {
        try {
            const schema = z.object({
                repoId: z.number().int().positive(),
                limit: z.number().int().positive().optional().default(50),
            });
            const validationResult = schema.safeParse(data);
            if (!validationResult.success) {
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }
            const { repoId, limit } = validationResult.data;
            const commits = await getCommitsByRepository(repoId, limit);
            return { success: true, commits };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC getCommitsByRepository failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }
            const appError = new AppError('500_DB_ERROR', error instanceof Error ? error.message : 'Unknown error occurred');
            logger.error('IPC getCommitsByRepository failed with unknown error', error);
            return appError.toSerializable();
        }
    });

    // 获取项目的所有提交历史
    ipcMain.handle(IpcChannels.GET_COMMITS_BY_PROJECT, async (_event, data: unknown) => {
        try {
            const schema = z.object({
                projectId: z.number().int().positive(),
                limit: z.number().int().positive().optional().default(100),
            });
            const validationResult = schema.safeParse(data);
            if (!validationResult.success) {
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }
            const { projectId, limit } = validationResult.data;
            const commits = await getCommitsByProject(projectId, limit);
            return { success: true, commits };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC getCommitsByProject failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }
            const appError = new AppError('500_DB_ERROR', error instanceof Error ? error.message : 'Unknown error occurred');
            logger.error('IPC getCommitsByProject failed with unknown error', error);
            return appError.toSerializable();
        }
    });

    // 获取最近关闭的任务
    ipcMain.handle(IpcChannels.GET_RECENTLY_CLOSED_TASKS, async (_event, data: unknown) => {
        try {
            const schema = z.object({
                projectId: z.number().int().positive(),
                limit: z.number().int().positive().optional().default(20),
            });
            const validationResult = schema.safeParse(data);
            if (!validationResult.success) {
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }
            const { projectId, limit } = validationResult.data;
            const closedTasks = await getRecentlyClosedTasks(projectId, limit);
            return { success: true, closedTasks };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC getRecentlyClosedTasks failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }
            const appError = new AppError('500_DB_ERROR', error instanceof Error ? error.message : 'Unknown error occurred');
            logger.error('IPC getRecentlyClosedTasks failed with unknown error', error);
            return appError.toSerializable();
        }
    });

    logger.info('Git IPC handlers registered');
}












