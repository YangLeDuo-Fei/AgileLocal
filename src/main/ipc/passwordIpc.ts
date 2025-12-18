// 主密码 IPC Handler

import { ipcMain } from 'electron';
import { z } from 'zod';
import { IpcChannels } from './IpcChannels';
import { checkMasterPasswordRequired, setMasterPassword, verifyMasterPassword } from '../services/KeyManagerService';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

/**
 * 注册主密码相关的 IPC Handlers
 */
export function registerPasswordIpcHandlers(): void {
    // 检查是否需要主密码
    ipcMain.handle(IpcChannels.CHECK_MASTER_PASSWORD_REQUIRED, async () => {
        try {
            const result = checkMasterPasswordRequired();
            return { success: true, required: result.required, needsSetup: result.needsSetup };
        } catch (error) {
            logger.error('IPC checkMasterPasswordRequired failed', error);
            const appError = new AppError(
                '500_INTERNAL_ERROR',
                error instanceof Error ? error.message : 'Unknown error'
            );
            return appError.toSerializable();
        }
    });

    // 设置主密码
    ipcMain.handle(IpcChannels.SET_MASTER_PASSWORD, async (_event, data: unknown) => {
        try {
            const SetPasswordSchema = z.object({
                masterPassword: z.string().min(12, 'Master password must be at least 12 characters'),
            });

            const validationResult = SetPasswordSchema.safeParse(data);
            if (!validationResult.success) {
                logger.error('IPC setMasterPassword validation failed', validationResult.error);
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }

            const { masterPassword } = validationResult.data;
            await setMasterPassword(masterPassword);
            return { success: true };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC setMasterPassword failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }
            logger.error('IPC setMasterPassword failed with unknown error', error);
            const appError = new AppError(
                '500_INTERNAL_ERROR',
                `Failed to set master password: ${error instanceof Error ? error.message : String(error)}`
            );
            return appError.toSerializable();
        }
    });

    // 验证主密码
    ipcMain.handle(IpcChannels.VERIFY_MASTER_PASSWORD, async (_event, data: unknown) => {
        try {
            const VerifyPasswordSchema = z.object({
                masterPassword: z.string().min(1, 'Master password is required'),
            });

            const validationResult = VerifyPasswordSchema.safeParse(data);
            if (!validationResult.success) {
                logger.error('IPC verifyMasterPassword validation failed', validationResult.error);
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }

            const { masterPassword } = validationResult.data;
            const verified = await verifyMasterPassword(masterPassword);
            return { success: true, verified };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC verifyMasterPassword failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }
            logger.error('IPC verifyMasterPassword failed with unknown error', error);
            const appError = new AppError(
                '500_INTERNAL_ERROR',
                `Failed to verify master password: ${error instanceof Error ? error.message : String(error)}`
            );
            return appError.toSerializable();
        }
    });

    logger.info('Password IPC handlers registered');
}





