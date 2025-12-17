// 系统 IPC Handler

import { ipcMain } from 'electron';
import { app } from 'electron';
import { join } from 'path';
import { IpcChannels } from './IpcChannels';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';
import { getBackupService } from '../services/BackupService';

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

    // 创建备份
    ipcMain.handle(IpcChannels.CREATE_BACKUP, async () => {
        try {
            const backupService = getBackupService();
            const backupPath = await backupService.createBackup();
            return { success: true, backupPath };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC createBackup failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }
            logger.error('IPC createBackup failed with unknown error', error);
            const appError = new AppError(
                '500_BACKUP_ERROR',
                error instanceof Error ? error.message : 'Unknown error occurred'
            );
            return appError.toSerializable();
        }
    });

    // 恢复备份
    ipcMain.handle(IpcChannels.RESTORE_BACKUP, async () => {
        try {
            const backupService = getBackupService();
            await backupService.restoreBackup();
            return { success: true };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC restoreBackup failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }
            logger.error('IPC restoreBackup failed with unknown error', error);
            const appError = new AppError(
                '500_RESTORE_ERROR',
                error instanceof Error ? error.message : 'Unknown error occurred'
            );
            return appError.toSerializable();
        }
    });

    logger.info('System IPC handlers registered');
}







