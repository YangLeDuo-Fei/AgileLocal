// 严格按照 V！.md v2025.PerfectScore.Final 生成
// 初始数据库 Schema 迁移脚本

import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    // 确保 DDL 操作的原子性
    // 注意：外键检查已在连接级别设置（connection.ts），此处无需重复设置
    await db.transaction().execute(async (trx) => {
        // 1. 创建 Projects 表 (1/8)
        await trx.schema
            .createTable('projects')
            .addColumn('id', 'integer', col => col.primaryKey().autoIncrement().notNull())
            .addColumn('name', 'text', col => col.notNull())
            .addColumn('description', 'text')
            .addColumn('created_at', 'text', col => col.defaultTo(sql`(datetime('now'))`).notNull())
            .execute();

        // 3. 创建 Sprints 表 (2/8)
        await trx.schema
            .createTable('sprints')
            .addColumn('id', 'integer', col => col.primaryKey().autoIncrement().notNull())
            .addColumn('project_id', 'integer', col => col.notNull())
            .addColumn('name', 'text', col => col.notNull())
            .addColumn('start_date', 'text', col => col.notNull())
            .addColumn('end_date', 'text', col => col.notNull())
            .addColumn('status', 'text', col => col.notNull())
            .addForeignKeyConstraint('sprints_project_fk', ['project_id'], 'projects', ['id'], 
                cb => cb.onDelete('cascade'))
            .execute();

        // 4. 创建 Tasks 表 (3/8) - 核心表，包含 version 字段
        await trx.schema
            .createTable('tasks')
            .addColumn('id', 'integer', col => col.primaryKey().autoIncrement().notNull())
            .addColumn('project_id', 'integer', col => col.notNull())
            .addColumn('sprint_id', 'integer')
            .addColumn('title', 'text', col => col.notNull())
            .addColumn('status', 'text', col => col.notNull())
            .addColumn('story_points', 'integer', col => col.notNull())
            .addColumn('kanban_order', 'integer', col => col.notNull())
            .addColumn('version', 'integer', col => col.defaultTo(1).notNull()) // 乐观锁字段
            .addColumn('description', 'text')
            .addColumn('created_at', 'text', col => col.defaultTo(sql`(datetime('now'))`).notNull())
            .addColumn('updated_at', 'text', col => col.defaultTo(sql`(datetime('now'))`).notNull())
            .addForeignKeyConstraint('tasks_project_fk', ['project_id'], 'projects', ['id'], 
                cb => cb.onDelete('cascade'))
            .addForeignKeyConstraint('tasks_sprint_fk', ['sprint_id'], 'sprints', ['id'], 
                cb => cb.onDelete('set null'))
            .execute();

        // 5. 创建 Tasks 表的复合索引 (sprint_id, status, kanban_order)
        await trx.schema
            .createIndex('tasks_sprint_status_order_idx')
            .on('tasks')
            .columns(['sprint_id', 'status', 'kanban_order'])
            .execute();

        // 6. 创建 Users 表 (8/8) - 需要在 TaskComments 之前创建
        await trx.schema
            .createTable('users')
            .addColumn('id', 'integer', col => col.primaryKey().autoIncrement().notNull())
            .addColumn('username', 'text', col => col.notNull().unique())
            .addColumn('email', 'text', col => col.notNull().unique())
            .addColumn('password_hash', 'text', col => col.notNull())
            .addColumn('role', 'text', col => col.defaultTo('user').notNull())
            .execute();

        // 7. 创建 TaskComments 表 (4/8)
        await trx.schema
            .createTable('task_comments')
            .addColumn('id', 'integer', col => col.primaryKey().autoIncrement().notNull())
            .addColumn('task_id', 'integer', col => col.notNull())
            .addColumn('content', 'text', col => col.notNull())
            .addColumn('user_id', 'integer', col => col.notNull())
            .addColumn('created_at', 'text', col => col.defaultTo(sql`(datetime('now'))`).notNull())
            .addForeignKeyConstraint('task_comments_task_fk', ['task_id'], 'tasks', ['id'], 
                cb => cb.onDelete('cascade'))
            .addForeignKeyConstraint('task_comments_user_fk', ['user_id'], 'users', ['id'], 
                cb => cb.onDelete('cascade'))
            .execute();

        // 8. 创建 GitRepositories 表 (5/8)
        await trx.schema
            .createTable('git_repositories')
            .addColumn('id', 'integer', col => col.primaryKey().autoIncrement().notNull())
            .addColumn('project_id', 'integer', col => col.notNull())
            .addColumn('repo_url', 'text', col => col.notNull())
            .addColumn('encrypted_token_iv', 'text', col => col.notNull())
            .addColumn('encrypted_token_content', 'text', col => col.notNull())
            .addColumn('last_synced_commit_sha', 'text') // Git Checkpoint 字段
            .addForeignKeyConstraint('git_repositories_project_fk', ['project_id'], 'projects', ['id'], 
                cb => cb.onDelete('cascade'))
            .execute();

        // 9. 创建 GitCommits 表 (6/8)
        await trx.schema
            .createTable('git_commits')
            .addColumn('id', 'integer', col => col.primaryKey().autoIncrement().notNull())
            .addColumn('repo_id', 'integer', col => col.notNull())
            .addColumn('commit_sha', 'text', col => col.notNull())
            .addColumn('message', 'text', col => col.notNull())
            .addColumn('task_id', 'integer')
            .addColumn('committed_at', 'text', col => col.notNull())
            .addForeignKeyConstraint('git_commits_repo_fk', ['repo_id'], 'git_repositories', ['id'], 
                cb => cb.onDelete('cascade'))
            .addForeignKeyConstraint('git_commits_task_fk', ['task_id'], 'tasks', ['id'], 
                cb => cb.onDelete('set null'))
            .execute();

        // 10. 创建 BurndownSnapshots 表 (7/8)
        await trx.schema
            .createTable('burndown_snapshots')
            .addColumn('id', 'integer', col => col.primaryKey().autoIncrement().notNull())
            .addColumn('sprint_id', 'integer', col => col.notNull())
            .addColumn('snapshot_date', 'text', col => col.notNull())
            .addColumn('remaining_points', 'integer', col => col.notNull())
            .addForeignKeyConstraint('burndown_snapshots_sprint_fk', ['sprint_id'], 'sprints', ['id'], 
                cb => cb.onDelete('cascade'))
            .execute();

        // 11. 创建 BurndownSnapshots 唯一索引 (sprint_id, snapshot_date)
        await trx.schema
            .createIndex('burndown_sprint_date_unique_idx')
            .on('burndown_snapshots')
            .columns(['sprint_id', 'snapshot_date'])
            .unique()
            .execute();
    });
}

export async function down(db: Kysely<any>): Promise<void> {
    // 回滚操作：删除所有表（按依赖关系逆序）
    // 注意：外键检查已在连接级别设置，此处无需重复设置
    await db.transaction().execute(async (trx) => {
        // 删除索引
        await trx.schema.dropIndex('burndown_sprint_date_unique_idx').on('burndown_snapshots').execute().catch(() => {});
        await trx.schema.dropIndex('tasks_sprint_status_order_idx').on('tasks').execute().catch(() => {});

        // 删除表（按依赖关系逆序）
        await trx.schema.dropTable('burndown_snapshots').execute().catch(() => {});
        await trx.schema.dropTable('git_commits').execute().catch(() => {});
        await trx.schema.dropTable('git_repositories').execute().catch(() => {});
        await trx.schema.dropTable('task_comments').execute().catch(() => {});
        await trx.schema.dropTable('users').execute().catch(() => {});
        await trx.schema.dropTable('tasks').execute().catch(() => {});
        await trx.schema.dropTable('sprints').execute().catch(() => {});
        await trx.schema.dropTable('projects').execute().catch(() => {});
    });
}

