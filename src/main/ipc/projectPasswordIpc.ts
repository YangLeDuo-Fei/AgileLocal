// 项目密码 IPC Handlers

import { ipcMain } from 'electron';
import { z } from 'zod';
import { IpcChannels } from './IpcChannels';
import { setProjectPassword, verifyProjectPassword, removeProjectPassword } from '../services/ProjectPasswordService';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

// Zod 验证 Schema
const SetProjectPasswordSchema = z.object({
    projectId: z.number().int().positive(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

const VerifyProjectPasswordSchema = z.object({
    projectId: z.number().int().positive(),
    password: z.string().min(1, 'Password is required'),
});

const RemoveProjectPasswordSchema = z.object({
    projectId: z.number().int().positive(),
});

/**
 * 注册项目密码相关的 IPC Handlers
 */
export function registerProjectPasswordIpcHandlers(): void {
    /**
     * 设置项目密码
     */
    ipcMain.handle(IpcChannels.SET_PROJECT_PASSWORD, async (_event, data: unknown) => {
        try {
            const validationResult = SetProjectPasswordSchema.safeParse(data);
            if (!validationResult.success) {
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }

            const { projectId, password } = validationResult.data;
            await setProjectPassword(projectId, password);
            return { success: true };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC setProjectPassword failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }
            logger.error('IPC setProjectPassword failed with unknown error', error);
            const appError = new AppError(
                '500_INTERNAL_ERROR',
                `Failed to set project password: ${error instanceof Error ? error.message : String(error)}`
            );
            return appError.toSerializable();
        }
    });

    /**
     * 验证项目密码
     */
    ipcMain.handle(IpcChannels.VERIFY_PROJECT_PASSWORD, async (_event, data: unknown) => {
        try {
            const validationResult = VerifyProjectPasswordSchema.safeParse(data);
            if (!validationResult.success) {
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }

            const { projectId, password } = validationResult.data;
            const isValid = await verifyProjectPassword(projectId, password);
            return { success: true, valid: isValid };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC verifyProjectPassword failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }
            logger.error('IPC verifyProjectPassword failed with unknown error', error);
            const appError = new AppError(
                '500_INTERNAL_ERROR',
                `Failed to verify project password: ${error instanceof Error ? error.message : String(error)}`
            );
            return appError.toSerializable();
        }
    });

    /**
     * 移除项目密码
     */
    ipcMain.handle(IpcChannels.REMOVE_PROJECT_PASSWORD, async (_event, data: unknown) => {
        try {
            const validationResult = RemoveProjectPasswordSchema.safeParse(data);
            if (!validationResult.success) {
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }

            const { projectId } = validationResult.data;
            await removeProjectPassword(projectId);
            return { success: true };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC removeProjectPassword failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }
            logger.error('IPC removeProjectPassword failed with unknown error', error);
            const appError = new AppError(
                '500_INTERNAL_ERROR',
                `Failed to remove project password: ${error instanceof Error ? error.message : String(error)}`
            );
            return appError.toSerializable();
        }
    });

    logger.info('Project password IPC handlers registered');
}



