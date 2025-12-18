// 严格按照 V！.md v2025.PerfectScore.Final 生成
// Sprint 服务层 - 业务逻辑实现

import { z } from 'zod';
import { getDatabase } from '../database/connection';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

// Zod 输入验证 Schema
const CreateSprintSchema = z.object({
    projectId: z.number().int().positive(),
    name: z.string().min(1).max(200),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date format: YYYY-MM-DD
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(['Planned', 'Active', 'Closed']).default('Planned'),
});

const UpdateSprintSchema = z.object({
    sprintId: z.number().int().positive(),
    name: z.string().min(1).max(200).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    status: z.enum(['Planned', 'Active', 'Closed']).optional(),
});

/**
 * 创建 Sprint
 */
export async function createSprint(
    projectId: number,
    name: string,
    startDate: string,
    endDate: string,
    status: 'Planned' | 'Active' | 'Closed' = 'Planned'
): Promise<number> {
    // Zod 输入验证
    const validationResult = CreateSprintSchema.safeParse({
        projectId,
        name,
        startDate,
        endDate,
        status,
    });

    if (!validationResult.success) {
        throw new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
    }

    // 验证日期范围
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
        throw new AppError('400_INVALID_INPUT', 'End date must be after start date');
    }

    try {
        const db = await getDatabase();

        // 验证项目是否存在
        const project = await db
            .selectFrom('projects')
            .select('id')
            .where('id', '=', projectId)
            .executeTakeFirst();

        if (!project) {
            throw new AppError('404_PROJECT_NOT_FOUND', `Project ${projectId} not found`);
        }

        // 插入 Sprint
        const result = await db
            .insertInto('sprints')
            .values({
                project_id: projectId,
                name: name.trim(),
                start_date: startDate,
                end_date: endDate,
                status: status,
            })
            .returning('id')
            .executeTakeFirstOrThrow();

        logger.info(`Sprint created: id=${result.id}, projectId=${projectId}, name=${name}`);
        return result.id;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        logger.error('Failed to create sprint', error);
        throw new AppError(
            '500_DB_ERROR',
            error instanceof Error ? error.message : 'Failed to create sprint'
        );
    }
}

/**
 * 获取项目的所有 Sprint
 */
export async function getSprintsByProject(projectId: number): Promise<Array<{
    id: number;
    project_id: number;
    name: string;
    start_date: string;
    end_date: string;
    status: 'Planned' | 'Active' | 'Closed';
}>> {
    if (!Number.isInteger(projectId) || projectId <= 0) {
        throw new AppError('400_INVALID_INPUT', 'Invalid projectId');
    }

    try {
        const db = await getDatabase();

        const sprints = await db
            .selectFrom('sprints')
            .selectAll()
            .where('project_id', '=', projectId)
            .orderBy('start_date', 'desc')
            .orderBy('id', 'desc')
            .execute();

        return sprints;
    } catch (error) {
        logger.error('Failed to get sprints by project', error);
        throw new AppError(
            '500_DB_ERROR',
            error instanceof Error ? error.message : 'Failed to get sprints'
        );
    }
}

/**
 * 根据 ID 获取 Sprint
 */
export async function getSprintById(sprintId: number): Promise<{
    id: number;
    project_id: number;
    name: string;
    start_date: string;
    end_date: string;
    status: 'Planned' | 'Active' | 'Closed';
} | null> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
        throw new AppError('400_INVALID_INPUT', 'Invalid sprintId');
    }

    try {
        const db = await getDatabase();

        const sprint = await db
            .selectFrom('sprints')
            .selectAll()
            .where('id', '=', sprintId)
            .executeTakeFirst();

        return sprint || null;
    } catch (error) {
        logger.error('Failed to get sprint by id', error);
        throw new AppError(
            '500_DB_ERROR',
            error instanceof Error ? error.message : 'Failed to get sprint'
        );
    }
}

/**
 * 更新 Sprint
 */
export async function updateSprint(
    sprintId: number,
    updates: {
        name?: string;
        startDate?: string;
        endDate?: string;
        status?: 'Planned' | 'Active' | 'Closed';
    }
): Promise<void> {
    // Zod 输入验证
    const validationResult = UpdateSprintSchema.safeParse({
        sprintId,
        ...updates,
    });

    if (!validationResult.success) {
        throw new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
    }

    // 如果更新了日期，验证日期范围
    if (updates.startDate && updates.endDate) {
        const start = new Date(updates.startDate);
        const end = new Date(updates.endDate);
        if (start >= end) {
            throw new AppError('400_INVALID_INPUT', 'End date must be after start date');
        }
    }

    try {
        const db = await getDatabase();

        // 检查 Sprint 是否存在
        const existingSprint = await db
            .selectFrom('sprints')
            .selectAll()
            .where('id', '=', sprintId)
            .executeTakeFirst();

        if (!existingSprint) {
            throw new AppError('404_SPRINT_NOT_FOUND', `Sprint ${sprintId} not found`);
        }

        // 构建更新对象
        const updateData: {
            name?: string;
            start_date?: string;
            end_date?: string;
            status?: 'Planned' | 'Active' | 'Closed';
        } = {};

        if (updates.name !== undefined) {
            updateData.name = updates.name.trim();
        }
        if (updates.startDate !== undefined) {
            updateData.start_date = updates.startDate;
        }
        if (updates.endDate !== undefined) {
            updateData.end_date = updates.endDate;
        }
        if (updates.status !== undefined) {
            updateData.status = updates.status;
        }

        // 如果没有任何更新，直接返回
        if (Object.keys(updateData).length === 0) {
            return;
        }

        // 执行更新
        await db
            .updateTable('sprints')
            .set(updateData)
            .where('id', '=', sprintId)
            .execute();

        logger.info(`Sprint updated: id=${sprintId}, updates=${JSON.stringify(updateData)}`);
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        logger.error('Failed to update sprint', error);
        throw new AppError(
            '500_DB_ERROR',
            error instanceof Error ? error.message : 'Failed to update sprint'
        );
    }
}

/**
 * 删除 Sprint（注意：任务中的 sprint_id 会被设置为 NULL）
 */
export async function deleteSprint(sprintId: number): Promise<void> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
        throw new AppError('400_INVALID_INPUT', 'Invalid sprintId');
    }

    try {
        const db = await getDatabase();

        // 检查 Sprint 是否存在
        const existingSprint = await db
            .selectFrom('sprints')
            .select('id')
            .where('id', '=', sprintId)
            .executeTakeFirst();

        if (!existingSprint) {
            throw new AppError('404_SPRINT_NOT_FOUND', `Sprint ${sprintId} not found`);
        }

        // 删除 Sprint（外键约束会自动将相关任务的 sprint_id 设置为 NULL）
        await db
            .deleteFrom('sprints')
            .where('id', '=', sprintId)
            .execute();

        logger.info(`Sprint deleted: id=${sprintId}`);
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        logger.error('Failed to delete sprint', error);
        throw new AppError(
            '500_DB_ERROR',
            error instanceof Error ? error.message : 'Failed to delete sprint'
        );
    }
}



