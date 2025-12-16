// 系统 IPC Handler

import { ipcMain } from 'electron';
import { app } from 'electron';
import { join } from 'path';
import { IpcChannels } from './IpcChannels';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

/**
 * 注册系统相关的 IPC Handlers
 */
export function registerSystemIpcHandlers(): void {
    // 获取系统信息
    ipcMain.handle(IpcChannels.GET_SYSTEM_INFO, async () => {
        try {
            const userDataPath = app.getPath('userData');
            const dbPath = join(userDataPath, 'agilelocal.db');
            const logPath = join(userDataPath, 'logs', 'app.log');
            const secretsPath = join(userDataPath, 'secrets.enc');

            return {
                success: true,
                info: {
                    userDataPath,
                    dbPath,
                    logPath,
                    secretsPath,
                    version: app.getVersion(),
                },
            };
        } catch (error) {
            logger.error('IPC getSystemInfo failed', error);
            const appError = new AppError(
                '500_INTERNAL_ERROR',
                `Failed to get system info: ${error instanceof Error ? error.message : String(error)}`
            );
            return appError.toSerializable();
        }
    });

    logger.info('System IPC handlers registered');
}






