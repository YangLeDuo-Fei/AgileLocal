// 严格按照 V！.md v2025.PerfectScore.Final 生成
// Git IPC Handler

import { ipcMain } from 'electron';
import { IpcChannels } from './IpcChannels';
import { getGitSyncService } from '../services/GitSyncService';
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

    logger.info('Git IPC handlers registered');
}

