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

type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;

/**
 * 更新任务状态和看板排序
 * 严格按照文档 4.1 节逻辑实现
 */
export async function updateStatus(
    taskId: number,
    newStatus: 'ToDo' | 'Doing' | 'Done',
    newOrder: number,
    expectedVersion: number
): Promise<void> {
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

        // 2.6 更新目标任务 status、kanban_order、version = version + 1
        await trx
            .updateTable('tasks')
            .set({
                status: newStatus,
                kanban_order: newOrder,
                version: task.version + 1,
                updated_at: new Date().toISOString(),
            })
            .where('id', '=', taskId)
            .where('version', '=', expectedVersion) // 再次检查 version（双重保险）
            .execute();

        logger.info(`Task ${taskId} status updated from ${oldStatus} to ${newStatus}, order from ${oldOrder} to ${newOrder}`);
    });
}
