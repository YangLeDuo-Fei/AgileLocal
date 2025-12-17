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
    assignee: z.string().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    priority: z.number().int().min(1).max(3).optional().default(2),
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
    sprintId?: number | null,
    assignee?: string | null,
    dueDate?: string | null,
    priority?: number
): Promise<number> {
    const validationResult = CreateTaskSchema.safeParse({
        projectId,
        sprintId: sprintId || null,
        title,
        description,
        storyPoints,
        status,
        assignee,
        dueDate,
        priority: priority || 2,
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
                assignee: validationResult.data.assignee || null,
                due_date: validationResult.data.dueDate || null,
                priority: validationResult.data.priority || 2,
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

        // 只有当 sprintId 明确传入（不是 undefined）时才进行过滤
        // undefined 表示不进行 sprintId 过滤，返回所有任务
        if (sprintId !== undefined && sprintId !== null) {
            query = query.where('sprint_id', '=', sprintId);
        } else if (sprintId === null) {
            // 明确传入 null，只查询 sprint_id 为 null 的任务
            query = query.where('sprint_id', 'is', null);
        }
        // sprintId === undefined 时不添加任何过滤，返回所有任务

        const tasks = await query
            .orderBy('status', 'asc')
            .orderBy('kanban_order', 'asc')
            .execute();

        logger.info(`getTasksByProject: projectId=${projectId}, sprintId=${sprintId}, returned ${tasks.length} tasks`);
        return tasks;
    } catch (error) {
        logger.error('Failed to get tasks', error);
        throw new AppError('500_DB_ERROR', `Failed to get tasks: ${error}`);
    }
}

/**
 * 更新任务信息
 */
export async function updateTask(
    taskId: number,
    title?: string,
    description?: string | null,
    storyPoints?: number,
    status?: 'ToDo' | 'Doing' | 'Done',
    assignee?: string | null,
    dueDate?: string | null,
    priority?: number
): Promise<{ taskId: number }> {
    const db = await getDatabase();

    try {
        // 构建更新对象
        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (title !== undefined) {
            updateData.title = title;
        }
        if (description !== undefined) {
            updateData.description = description;
        }
        if (storyPoints !== undefined) {
            updateData.story_points = storyPoints;
        }
        if (status !== undefined) {
            updateData.status = status;
        }
        if (assignee !== undefined) {
            updateData.assignee = assignee;
        }
        if (dueDate !== undefined) {
            updateData.due_date = dueDate;
        }
        if (priority !== undefined) {
            updateData.priority = priority;
        }

        // 检查是否有字段需要更新
        if (Object.keys(updateData).length === 1) {
            throw new AppError('400_INVALID_INPUT', 'No fields to update');
        }

        const result = await db
            .updateTable('tasks')
            .set(updateData)
            .where('id', '=', taskId)
            .returning('id')
            .executeTakeFirst();

        if (!result) {
            throw new AppError('400_INVALID_INPUT', `Task with id ${taskId} not found`);
        }

        logger.info(`Task updated: ${taskId}`);
        return { taskId: result.id };
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        logger.error('Failed to update task', error);
        throw new AppError('500_DB_ERROR', `Failed to update task: ${error}`);
    }
}

/**
 * 删除任务
 */
export async function deleteTask(taskId: number): Promise<void> {
    const db = await getDatabase();

    try {
        // 先查询任务是否存在，用于日志
        const task = await db
            .selectFrom('tasks')
            .select(['id', 'project_id', 'title'])
            .where('id', '=', taskId)
            .executeTakeFirst();

        if (!task) {
            logger.warn(`Task ${taskId} not found, cannot delete`);
            throw new AppError('404_NOT_FOUND', `Task with id ${taskId} not found`);
        }

        // 执行删除
        const result = await db
            .deleteFrom('tasks')
            .where('id', '=', taskId)
            .execute();

        logger.info(`Task deleted: id=${taskId}, project_id=${task.project_id}, title="${task.title}", deleted ${result.length} row(s)`);
        
        // 验证删除是否成功
        const verifyDeleted = await db
            .selectFrom('tasks')
            .select('id')
            .where('id', '=', taskId)
            .executeTakeFirst();
        
        if (verifyDeleted) {
            logger.error(`Task ${taskId} still exists after delete operation!`);
            throw new AppError('500_DB_ERROR', 'Task deletion failed: task still exists');
        }
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        logger.error('Failed to delete task', error);
        throw new AppError('500_DB_ERROR', `Failed to delete task: ${error}`);
    }
}







