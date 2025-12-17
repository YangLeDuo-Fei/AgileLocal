// 项目服务层 - 业务逻辑实现

import { z } from 'zod';
import { getDatabase } from '../database/connection';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

// Zod 输入验证 Schema
const CreateProjectSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().nullable().optional(),
});

type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

/**
 * 创建项目
 */
export async function createProject(name: string, description?: string | null): Promise<number> {
    const validationResult = CreateProjectSchema.safeParse({ name, description });

    if (!validationResult.success) {
        throw new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
    }

    const db = await getDatabase();

    try {
        const result = await db
            .insertInto('projects')
            .values({
                name: validationResult.data.name,
                description: validationResult.data.description || null,
            })
            .returning('id')
            .executeTakeFirstOrThrow();

        logger.info(`Project created: ${result.id}`);
        return result.id;
    } catch (error) {
        logger.error('Failed to create project', error);
        throw new AppError('500_DB_ERROR', `Failed to create project: ${error}`);
    }
}

/**
 * 获取所有项目列表
 */
export async function getAllProjects() {
    const db = await getDatabase();

    try {
        const projects = await db
            .selectFrom('projects')
            .selectAll()
            .orderBy('created_at', 'desc')
            .execute();

        return projects;
    } catch (error) {
        logger.error('Failed to get projects', error);
        throw new AppError('500_DB_ERROR', `Failed to get projects: ${error}`);
    }
}

/**
 * 删除项目（级联删除所有相关数据）
 */
export async function deleteProject(projectId: number): Promise<void> {
    const db = await getDatabase();

    try {
        // 检查项目是否存在
        const project = await db
            .selectFrom('projects')
            .select('id')
            .where('id', '=', projectId)
            .executeTakeFirst();

        if (!project) {
            throw new AppError('400_INVALID_INPUT', `Project with id ${projectId} not found`);
        }

        // 删除项目（外键约束会级联删除相关数据）
        await db
            .deleteFrom('projects')
            .where('id', '=', projectId)
            .execute();

        logger.info(`Project deleted: ${projectId}`);
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        logger.error('Failed to delete project', error);
        throw new AppError('500_DB_ERROR', `Failed to delete project: ${error}`);
    }
}







