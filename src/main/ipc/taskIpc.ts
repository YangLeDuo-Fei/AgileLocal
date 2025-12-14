// 严格按照 V！.md v2025.PerfectScore.Final 生成
// 任务 IPC Handler

import { ipcMain } from 'electron';
import { z } from 'zod';
import { IpcChannels } from './IpcChannels';
import { updateStatus } from '../services/TaskService';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

// Zod 输入验证 Schema
const UpdateStatusInputSchema = z.object({
    taskId: z.number().int().positive(),
    newStatus: z.enum(['ToDo', 'Doing', 'Done']),
    newOrder: z.number().int().nonnegative(),
    expectedVersion: z.number().int().positive(),
});

/**
 * 注册任务相关的 IPC Handlers
 */
export function registerTaskIpcHandlers(): void {
    // 注册 UPDATE_TASK_STATUS handler
    ipcMain.handle(IpcChannels.UPDATE_TASK_STATUS, async (_event, data: unknown) => {
        try {
            // Zod 验证输入
            const validationResult = UpdateStatusInputSchema.safeParse(data);
            if (!validationResult.success) {
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                logger.error('IPC updateStatus validation failed', validationResult.error);
                return error.toSerializable();
            }

            const { taskId, newStatus, newOrder, expectedVersion } = validationResult.data;

            // 调用服务层方法
            await updateStatus(taskId, newStatus, newOrder, expectedVersion);

            // 返回成功（返回更新后的 version）
            return { success: true, newVersion: expectedVersion + 1 };
        } catch (error) {
            // 捕获所有错误并返回 AppError.toSerializable()
            if (error instanceof AppError) {
                logger.error(`IPC updateStatus failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }

            // 未知错误转换为 500_DB_ERROR
            const appError = new AppError(
                '500_DB_ERROR',
                error instanceof Error ? error.message : 'Unknown error occurred'
            );
            logger.error('IPC updateStatus failed with unknown error', error);
            return appError.toSerializable();
        }
    });

    logger.info('Task IPC handlers registered');
}


