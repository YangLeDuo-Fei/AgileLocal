// 严格按照 V！.md v2025.PerfectScore.Final 生成
// 任务服务层 - 业务逻辑实现

import { z } from 'zod';
import { sql } from 'kysely';
import { getDatabase } from '../database/connection';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

// Zod 输入验证 Schema
const UpdateStatusSchema = z.object({
    taskId: z.number().int().positive(),
    newStatus: z.enum(['ToDo', 'Doing', 'Done']),
    newOrder: z.number().int().nonnegative(),
    expectedVersion: z.number().int().positive(),
});

const CreateTaskSchema = z.object({
    projectId: z.number().int().positive(),
    sprintId: z.number().int().positive().nullable(),
    title: z.string().min(1).max(500),
    description: z.string().nullable().optional(),
    storyPoints: z.number().int().nonnegative().default(0),
    status: z.enum(['ToDo', 'Doing', 'Done']).default('ToDo'),
});

/**
 * 更新任务状态和看板排序
 * 严格按照文档 4.1 节逻辑实现
 */
export async function updateStatus(
    taskId: number,
    newStatus: 'ToDo' | 'Doing' | 'Done',
    newOrder: number,
    expectedVersion: number
): Promise<{ newVersion: number }> {
    // 1. Zod 输入验证
    const validationResult = UpdateStatusSchema.safeParse({
        taskId,
        newStatus,
        newOrder,
        expectedVersion,
    });

    if (!validationResult.success) {
        throw new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
    }

    const db = await getDatabase();

    let newVersion: number;

    // 2. 事务内执行所有操作
    await db.transaction().execute(async (trx) => {
        // 2.1 查询目标任务（包含乐观锁检查）
        const task = await trx
            .selectFrom('tasks')
            .selectAll()
            .where('id', '=', taskId)
            .executeTakeFirst();

        if (!task) {
            throw new AppError('400_INVALID_INPUT', `Task with id ${taskId} not found`);
        }

        // 2.2 乐观锁检查（version 必须匹配）
        if (task.version !== expectedVersion) {
            throw new AppError(
                '409_CONFLICT',
                `Version mismatch: expected ${expectedVersion}, but task version is ${task.version}`
            );
        }

        const oldStatus = task.status;
        const oldOrder = task.kanban_order;
        const sprintId = task.sprint_id;

        // 2.3 如果是同一列内的拖拽（oldStatus === newStatus），需要特殊处理
        if (oldStatus === newStatus) {
            // 列内拖拽：调整同一列内其他任务的 order
            if (oldOrder < newOrder) {
                // 向后拖拽：oldOrder 到 newOrder 之间的任务 order 减 1
                await trx
                    .updateTable('tasks')
                    .set({
                        kanban_order: sql`kanban_order - 1`,
                        updated_at: new Date().toISOString(),
                    })
                    .where('sprint_id', '=', sprintId)
                    .where('status', '=', oldStatus)
                    .where('kanban_order', '>', oldOrder)
                    .where('kanban_order', '<=', newOrder)
                    .where('id', '!=', taskId)
                    .execute();
            } else if (oldOrder > newOrder) {
                // 向前拖拽：newOrder 到 oldOrder 之间的任务 order 加 1
                await trx
                    .updateTable('tasks')
                    .set({
                        kanban_order: sql`kanban_order + 1`,
                        updated_at: new Date().toISOString(),
                    })
                    .where('sprint_id', '=', sprintId)
                    .where('status', '=', oldStatus)
                    .where('kanban_order', '>=', newOrder)
                    .where('kanban_order', '<', oldOrder)
                    .where('id', '!=', taskId)
                    .execute();
            }
            // 如果 oldOrder === newOrder，不需要调整其他任务
        } else {
            // 2.4 跨列拖拽：旧列 kanban_order > oldOrder 的任务减 1
            await trx
                .updateTable('tasks')
                .set({
                    kanban_order: sql`kanban_order - 1`,
                    updated_at: new Date().toISOString(),
                })
                .where('sprint_id', '=', sprintId)
                .where('status', '=', oldStatus)
                .where('kanban_order', '>', oldOrder)
                .execute();

            // 2.5 新列 kanban_order >= newOrder 的任务加 1
            await trx
                .updateTable('tasks')
                .set({
                    kanban_order: sql`kanban_order + 1`,
                    updated_at: new Date().toISOString(),
                })
                .where('sprint_id', '=', sprintId)
                .where('status', '=', newStatus)
                .where('kanban_order', '>=', newOrder)
                .execute();
        }

        newVersion = task.version + 1;

        // 2.6 更新目标任务 status、kanban_order、version = version + 1
        await trx
            .updateTable('tasks')
            .set({
                status: newStatus,
                kanban_order: newOrder,
                version: newVersion,
                updated_at: new Date().toISOString(),
            })
            .where('id', '=', taskId)
            .where('version', '=', expectedVersion) // 再次检查 version（双重保险）
            .execute();

        logger.info(`Task ${taskId} status updated from ${oldStatus} to ${newStatus}, order from ${oldOrder} to ${newOrder}`);
    });

    return { newVersion };
}

/**
 * 创建任务
 */
export async function createTask(
    projectId: number,
    title: string,
    description?: string | null,
    storyPoints: number = 0,
    status: 'ToDo' | 'Doing' | 'Done' = 'ToDo',
    sprintId?: number | null
): Promise<number> {
    const validationResult = CreateTaskSchema.safeParse({
        projectId,
        sprintId: sprintId || null,
        title,
        description,
        storyPoints,
        status,
    });

    if (!validationResult.success) {
        throw new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
    }

    const db = await getDatabase();

    try {
        // 计算新任务的 kanban_order（同一状态下的最大值 + 1）
        const maxOrderResult = await db
            .selectFrom('tasks')
            .select((eb) => eb.fn.max('kanban_order').as('max_order'))
            .where('project_id', '=', projectId)
            .where('status', '=', status)
            .where('sprint_id', '=', sprintId || null)
            .executeTakeFirst();

        const newOrder = (maxOrderResult?.max_order ?? -1) + 1;

        const result = await db
            .insertInto('tasks')
            .values({
                project_id: projectId,
                sprint_id: sprintId || null,
                title: validationResult.data.title,
                description: validationResult.data.description || null,
                story_points: validationResult.data.storyPoints,
                status: validationResult.data.status,
                kanban_order: newOrder,
                version: 1,
            })
            .returning('id')
            .executeTakeFirstOrThrow();

        logger.info(`Task created: ${result.id}`);
        return result.id;
    } catch (error) {
        logger.error('Failed to create task', error);
        throw new AppError('500_DB_ERROR', `Failed to create task: ${error}`);
    }
}

/**
 * 获取项目的所有任务
 */
export async function getTasksByProject(projectId: number, sprintId?: number | null) {
    const db = await getDatabase();

    try {
        let query = db
            .selectFrom('tasks')
            .selectAll()
            .where('project_id', '=', projectId);

        if (sprintId !== undefined) {
            query = query.where('sprint_id', '=', sprintId || null);
        }

        const tasks = await query
            .orderBy('status', 'asc')
            .orderBy('kanban_order', 'asc')
            .execute();

        return tasks;
    } catch (error) {
        logger.error('Failed to get tasks', error);
        throw new AppError('500_DB_ERROR', `Failed to get tasks: ${error}`);
    }
}
