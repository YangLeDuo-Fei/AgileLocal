// Git 仓库 IPC Handler

import { ipcMain } from 'electron';
import { z } from 'zod';
import { IpcChannels } from './IpcChannels';
import * as GitRepositoryService from '../services/GitRepositoryService';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

/**
 * 注册 Git 仓库相关的 IPC Handlers
 */
export function registerGitRepositoryIpcHandlers(): void {
    // 创建 Git 仓库
    ipcMain.handle(IpcChannels.CREATE_REPOSITORY, async (_event, data: unknown) => {
        try {
            const CreateRepositorySchema = z.object({
                projectId: z.number().int().positive(),
                repoUrl: z.string().url(),
                token: z.string().min(1),
            });

            const validationResult = CreateRepositorySchema.safeParse(data);
            if (!validationResult.success) {
                logger.error('IPC createRepository validation failed', validationResult.error);
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }

            const { projectId, repoUrl, token } = validationResult.data;
            const repoId = await GitRepositoryService.createRepository(projectId, repoUrl, token);
            return { success: true, repoId };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC createRepository failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }
            logger.error('IPC createRepository failed with unknown error', error);
            const appError = new AppError(
                '500_DB_ERROR',
                `Failed to create repository: ${error instanceof Error ? error.message : String(error)}`
            );
            return appError.toSerializable();
        }
    });

    // 获取项目的 Git 仓库列表
    ipcMain.handle(IpcChannels.GET_REPOSITORIES, async (_event, projectId: unknown) => {
        try {
            if (typeof projectId !== 'number' || projectId <= 0) {
                const error = new AppError('400_INVALID_INPUT', 'Invalid projectId');
                return error.toSerializable();
            }

            const repos = await GitRepositoryService.getRepositoriesByProject(projectId);
            return { success: true, repositories: repos };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC getRepositories failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }
            logger.error('IPC getRepositories failed with unknown error', error);
            const appError = new AppError(
                '500_DB_ERROR',
                `Failed to get repositories: ${error instanceof Error ? error.message : String(error)}`
            );
            return appError.toSerializable();
        }
    });

    // 删除 Git 仓库
    ipcMain.handle(IpcChannels.DELETE_REPOSITORY, async (_event, repoId: unknown) => {
        try {
            if (typeof repoId !== 'number' || repoId <= 0) {
                const error = new AppError('400_INVALID_INPUT', 'Invalid repoId');
                return error.toSerializable();
            }

            await GitRepositoryService.deleteRepository(repoId);
            return { success: true };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC deleteRepository failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }
            logger.error('IPC deleteRepository failed with unknown error', error);
            const appError = new AppError(
                '500_DB_ERROR',
                `Failed to delete repository: ${error instanceof Error ? error.message : String(error)}`
            );
            return appError.toSerializable();
        }
    });

    logger.info('Git Repository IPC handlers registered');
}







