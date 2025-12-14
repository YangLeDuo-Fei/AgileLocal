// 项目 IPC Handler

import { ipcMain } from 'electron';
import { z } from 'zod';
import { IpcChannels } from './IpcChannels';
import * as ProjectService from '../services/ProjectService';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

// Zod 验证 Schema
const CreateProjectSchema = z.object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
});

/**
 * 注册项目相关的 IPC Handlers
 */
export function registerProjectIpcHandlers(): void {
    // 创建项目
    ipcMain.handle(IpcChannels.CREATE_PROJECT, async (_event, data: unknown) => {
        try {
            const validationResult = CreateProjectSchema.safeParse(data);
            if (!validationResult.success) {
                logger.error('IPC createProject validation failed', validationResult.error);
                return AppError.toSerializable(
                    new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`)
                );
            }

            const { name, description } = validationResult.data;
            const projectId = await ProjectService.createProject(name, description || null);
            return { success: true, projectId };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC createProject failed with AppError: ${error.code}`, error.message);
                return AppError.toSerializable(error);
            }
            logger.error('IPC createProject failed with unknown error', error);
            return AppError.toSerializable(
                new AppError('500_DB_ERROR', `Failed to create project: ${error}`)
            );
        }
    });

    // 获取所有项目
    ipcMain.handle(IpcChannels.GET_PROJECTS, async () => {
        try {
            const projects = await ProjectService.getAllProjects();
            return { success: true, projects };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC getProjects failed with AppError: ${error.code}`, error.message);
                return AppError.toSerializable(error);
            }
            logger.error('IPC getProjects failed with unknown error', error);
            return AppError.toSerializable(
                new AppError('500_DB_ERROR', `Failed to get projects: ${error}`)
            );
        }
    });

    // 删除项目
    ipcMain.handle(IpcChannels.DELETE_PROJECT, async (_event, projectId: unknown) => {
        try {
            if (typeof projectId !== 'number' || projectId <= 0) {
                return AppError.toSerializable(
                    new AppError('400_INVALID_INPUT', 'Invalid projectId')
                );
            }

            await ProjectService.deleteProject(projectId);
            return { success: true };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC deleteProject failed with AppError: ${error.code}`, error.message);
                return AppError.toSerializable(error);
            }
            logger.error('IPC deleteProject failed with unknown error', error);
            return AppError.toSerializable(
                new AppError('500_DB_ERROR', `Failed to delete project: ${error}`)
            );
        }
    });

    logger.info('Project IPC handlers registered');
}
