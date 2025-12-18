// 严格按照 V！.md v2025.PerfectScore.Final 生成
// Sprint IPC Handler

import { ipcMain } from 'electron';
import { z } from 'zod';
import { IpcChannels } from './IpcChannels';
import { createSprint, getSprintsByProject, getSprintById, updateSprint, deleteSprint } from '../services/SprintService';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

/**
 * 注册 Sprint 相关的 IPC Handlers
 */
export function registerSprintIpcHandlers(): void {
    // 创建 Sprint
    ipcMain.handle(IpcChannels.CREATE_SPRINT, async (_event, data: unknown) => {
        try {
            const CreateSprintSchema = z.object({
                projectId: z.number().int().positive(),
                name: z.string().min(1),
                startDate: z.string(),
                endDate: z.string(),
                status: z.enum(['Planned', 'Active', 'Closed']).optional().default('Planned'),
            });

            const validationResult = CreateSprintSchema.safeParse(data);
            if (!validationResult.success) {
                logger.error('IPC createSprint validation failed', validationResult.error);
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }

            const { projectId, name, startDate, endDate, status } = validationResult.data;
            const sprintId = await createSprint(projectId, name, startDate, endDate, status);

            return { success: true, sprintId };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC createSprint failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }

            const appError = new AppError(
                '500_DB_ERROR',
                error instanceof Error ? error.message : 'Unknown error occurred'
            );
            logger.error('IPC createSprint failed with unknown error', error);
            return appError.toSerializable();
        }
    });

    // 获取项目的所有 Sprint
    ipcMain.handle(IpcChannels.GET_SPRINTS, async (_event, data: unknown) => {
        try {
            const GetSprintsSchema = z.object({
                projectId: z.number().int().positive(),
            });

            const validationResult = GetSprintsSchema.safeParse(data);
            if (!validationResult.success) {
                logger.error('IPC getSprints validation failed', validationResult.error);
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }

            const { projectId } = validationResult.data;
            const sprints = await getSprintsByProject(projectId);

            return { success: true, sprints };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC getSprints failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }

            const appError = new AppError(
                '500_DB_ERROR',
                error instanceof Error ? error.message : 'Unknown error occurred'
            );
            logger.error('IPC getSprints failed with unknown error', error);
            return appError.toSerializable();
        }
    });

    // 根据 ID 获取 Sprint
    ipcMain.handle(IpcChannels.GET_SPRINT, async (_event, data: unknown) => {
        try {
            const GetSprintSchema = z.object({
                sprintId: z.number().int().positive(),
            });

            const validationResult = GetSprintSchema.safeParse(data);
            if (!validationResult.success) {
                logger.error('IPC getSprint validation failed', validationResult.error);
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }

            const { sprintId } = validationResult.data;
            const sprint = await getSprintById(sprintId);

            if (!sprint) {
                const error = new AppError('404_SPRINT_NOT_FOUND', `Sprint ${sprintId} not found`);
                return error.toSerializable();
            }

            return { success: true, sprint };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC getSprint failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }

            const appError = new AppError(
                '500_DB_ERROR',
                error instanceof Error ? error.message : 'Unknown error occurred'
            );
            logger.error('IPC getSprint failed with unknown error', error);
            return appError.toSerializable();
        }
    });

    // 更新 Sprint
    ipcMain.handle(IpcChannels.UPDATE_SPRINT, async (_event, data: unknown) => {
        try {
            const UpdateSprintSchema = z.object({
                sprintId: z.number().int().positive(),
                name: z.string().min(1).optional(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
                status: z.enum(['Planned', 'Active', 'Closed']).optional(),
            });

            const validationResult = UpdateSprintSchema.safeParse(data);
            if (!validationResult.success) {
                logger.error('IPC updateSprint validation failed', validationResult.error);
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }

            const { sprintId, ...updates } = validationResult.data;
            
            // 转换字段名（前端使用 camelCase，后端使用 snake_case）
            const updateData: {
                name?: string;
                startDate?: string;
                endDate?: string;
                status?: 'Planned' | 'Active' | 'Closed';
            } = {};

            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.startDate !== undefined) updateData.startDate = updates.startDate;
            if (updates.endDate !== undefined) updateData.endDate = updates.endDate;
            if (updates.status !== undefined) updateData.status = updates.status;

            await updateSprint(sprintId, updateData);

            return { success: true };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC updateSprint failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }

            const appError = new AppError(
                '500_DB_ERROR',
                error instanceof Error ? error.message : 'Unknown error occurred'
            );
            logger.error('IPC updateSprint failed with unknown error', error);
            return appError.toSerializable();
        }
    });

    // 删除 Sprint
    ipcMain.handle(IpcChannels.DELETE_SPRINT, async (_event, data: unknown) => {
        try {
            const DeleteSprintSchema = z.object({
                sprintId: z.number().int().positive(),
            });

            const validationResult = DeleteSprintSchema.safeParse(data);
            if (!validationResult.success) {
                logger.error('IPC deleteSprint validation failed', validationResult.error);
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }

            const { sprintId } = validationResult.data;
            await deleteSprint(sprintId);

            return { success: true };
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`IPC deleteSprint failed with AppError: ${error.code}`, error.message);
                return error.toSerializable();
            }

            const appError = new AppError(
                '500_DB_ERROR',
                error instanceof Error ? error.message : 'Unknown error occurred'
            );
            logger.error('IPC deleteSprint failed with unknown error', error);
            return appError.toSerializable();
        }
    });
}


