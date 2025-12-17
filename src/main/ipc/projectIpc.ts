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
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }

            const { name, description } = validationResult.data;
            const projectId = await ProjectService.createProject(name, description || null);
            
            // 获取创建的项目信息（通过查询数据库）
            const projects = await ProjectService.getAllProjects();
            const newProject = projects.find(p => p.id === projectId);
            
            if (!newProject) {
                // 如果找不到项目，只返回 projectId
                return { success: true, projectId };
            }
            
            return { success: true, projectId, project: newProject };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC createProject failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }
            logger.error('IPC createProject failed with unknown error', error);
            const appError = new AppError(
                '500_DB_ERROR',
                `Failed to create project: ${error instanceof Error ? error.message : String(error)}`
            );
            return appError.toSerializable();
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
                return error.toSerializable();
            }
            logger.error('IPC getProjects failed with unknown error', error);
            const appError = new AppError(
                '500_DB_ERROR',
                `Failed to get projects: ${error instanceof Error ? error.message : String(error)}`
            );
            return appError.toSerializable();
        }
    });

    // 删除项目
    ipcMain.handle(IpcChannels.DELETE_PROJECT, async (_event, projectId: unknown) => {
        try {
            if (typeof projectId !== 'number' || projectId <= 0) {
                const error = new AppError('400_INVALID_INPUT', 'Invalid projectId');
                return error.toSerializable();
            }

            await ProjectService.deleteProject(projectId);
            return { success: true };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC deleteProject failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }
            logger.error('IPC deleteProject failed with unknown error', error);
            const appError = new AppError(
                '500_DB_ERROR',
                `Failed to delete project: ${error instanceof Error ? error.message : String(error)}`
            );
            return appError.toSerializable();
        }
    });

    logger.info('Project IPC handlers registered');
}







