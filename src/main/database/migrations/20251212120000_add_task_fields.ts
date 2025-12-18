// 添加任务表字段：assignee、due_date、priority

import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.transaction().execute(async (trx) => {
        // 添加 assignee 字段（负责人）
        await trx.schema
            .alterTable('tasks')
            .addColumn('assignee', 'text')
            .execute();

        // 添加 due_date 字段（截止日期，ISO 格式字符串）
        await trx.schema
            .alterTable('tasks')
            .addColumn('due_date', 'text')
            .execute();

        // 添加 priority 字段（优先级：1高、2中、3低，默认为2）
        await trx.schema
            .alterTable('tasks')
            .addColumn('priority', 'integer', col => col.defaultTo(2).notNull())
            .execute();
    });
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.transaction().execute(async (trx) => {
        // 删除添加的字段
        await trx.schema
            .alterTable('tasks')
            .dropColumn('assignee')
            .execute();

        await trx.schema
            .alterTable('tasks')
            .dropColumn('due_date')
            .execute();

        await trx.schema
            .alterTable('tasks')
            .dropColumn('priority')
            .execute();
    });
}






