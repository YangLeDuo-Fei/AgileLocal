// 严格按照 V！.md v2025.PerfectScore.Final 生成
// 任务 IPC Handler

import { ipcMain } from 'electron';
import { z } from 'zod';
import { IpcChannels } from './IpcChannels';
import { updateStatus, createTask, getTasksByProject, updateTask, deleteTask } from '../services/TaskService';
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
            const result = await updateStatus(taskId, newStatus, newOrder, expectedVersion);

            // 返回成功（返回更新后的 version）
            return { success: true, newVersion: result.newVersion };
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

    // 创建任务
    ipcMain.handle(IpcChannels.CREATE_TASK, async (_event, data: unknown) => {
        try {
            const CreateTaskSchema = z.object({
                projectId: z.number().int().positive(),
                title: z.string().min(1),
                description: z.string().nullable().optional(),
                storyPoints: z.number().int().nonnegative().default(0),
                status: z.enum(['ToDo', 'Doing', 'Done']).default('ToDo'),
                sprintId: z.number().int().positive().nullable().optional(),
                assignee: z.string().nullable().optional(),
                dueDate: z.string().nullable().optional(),
                priority: z.number().int().min(1).max(3).optional().default(2),
            });

            const validationResult = CreateTaskSchema.safeParse(data);
            if (!validationResult.success) {
                logger.error('IPC createTask validation failed', validationResult.error);
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }

            const { projectId, title, description, storyPoints, status, sprintId, assignee, dueDate, priority } = validationResult.data;
            const taskId = await createTask(projectId, title, description || null, storyPoints, status, sprintId || null, assignee || null, dueDate || null, priority);
            return { success: true, taskId };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC createTask failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }
            logger.error('IPC createTask failed with unknown error', error);
            const appError = new AppError(
                '500_DB_ERROR',
                `Failed to create task: ${error instanceof Error ? error.message : String(error)}`
            );
            return appError.toSerializable();
        }
    });

    // 获取任务列表
    ipcMain.handle(IpcChannels.GET_TASKS, async (_event, data: unknown) => {
        try {
            const GetTasksSchema = z.object({
                projectId: z.number().int().positive(),
                sprintId: z.number().int().positive().nullable().optional(),
            });

            const validationResult = GetTasksSchema.safeParse(data);
            if (!validationResult.success) {
                logger.error('IPC getTasks validation failed', validationResult.error);
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }

            const { projectId, sprintId } = validationResult.data;
            // 如果 sprintId 是 undefined（未传递），则传递 undefined 给 getTasksByProject
            // 这样会返回所有任务（不进行 sprintId 过滤）
            // 如果 sprintId 存在（包括 null），则传递它进行过滤
            const actualSprintId = 'sprintId' in validationResult.data ? sprintId : undefined;
            logger.info(`IPC getTasks: projectId=${projectId}, sprintId=${actualSprintId} (original: ${sprintId})`);
            const tasks = await getTasksByProject(projectId, actualSprintId);
            return { success: true, tasks };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC getTasks failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }
            logger.error('IPC getTasks failed with unknown error', error);
            const appError = new AppError(
                '500_DB_ERROR',
                `Failed to get tasks: ${error instanceof Error ? error.message : String(error)}`
            );
            return appError.toSerializable();
        }
    });

    // 更新任务信息
    ipcMain.handle(IpcChannels.UPDATE_TASK, async (_event, data: unknown) => {
        try {
            const UpdateTaskSchema = z.object({
                taskId: z.number().int().positive(),
                title: z.string().min(1).optional(),
                description: z.string().nullable().optional(),
                storyPoints: z.number().int().nonnegative().optional(),
                status: z.enum(['ToDo', 'Doing', 'Done']).optional(),
                assignee: z.string().nullable().optional(),
                dueDate: z.string().nullable().optional(),
                priority: z.number().int().min(1).max(3).optional(),
            });

            const validationResult = UpdateTaskSchema.safeParse(data);
            if (!validationResult.success) {
                logger.error('IPC updateTask validation failed', validationResult.error);
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }

            const { taskId, title, description, storyPoints, status, assignee, dueDate, priority } = validationResult.data;
            const result = await updateTask(taskId, title, description, storyPoints, status, assignee, dueDate, priority);
            return { success: true, taskId: result.taskId };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC updateTask failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }
            logger.error('IPC updateTask failed with unknown error', error);
            const appError = new AppError(
                '500_DB_ERROR',
                `Failed to update task: ${error instanceof Error ? error.message : String(error)}`
            );
            return appError.toSerializable();
        }
    });

    // 删除任务
    ipcMain.handle(IpcChannels.DELETE_TASK, async (_event, data: unknown) => {
        try {
            const DeleteTaskSchema = z.object({
                taskId: z.number().int().positive(),
            });

            const validationResult = DeleteTaskSchema.safeParse(data);
            if (!validationResult.success) {
                logger.error('IPC deleteTask validation failed', validationResult.error);
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }

            const { taskId } = validationResult.data;
            await deleteTask(taskId);
            return { success: true };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC deleteTask failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }
            logger.error('IPC deleteTask failed with unknown error', error);
            const appError = new AppError(
                '500_DB_ERROR',
                `Failed to delete task: ${error instanceof Error ? error.message : String(error)}`
            );
            return appError.toSerializable();
        }
    });

    logger.info('Task IPC handlers registered');
}














