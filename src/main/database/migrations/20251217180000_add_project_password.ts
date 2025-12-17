// 数据库迁移：为项目添加密码保护字段
// 添加时间：2025-12-17

import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    // 为 projects 表添加密码相关字段
    // SQLite 的 ALTER TABLE 一次只能添加一列，需要分别执行
    
    await db.schema
        .alterTable('projects')
        .addColumn('has_password', 'integer', col => col.notNull().defaultTo(0)) // SQLite 使用 integer (0/1) 表示 boolean
        .execute();
    
    await db.schema
        .alterTable('projects')
        .addColumn('encrypted_password', 'text')
        .execute();
    
    await db.schema
        .alterTable('projects')
        .addColumn('password_salt', 'text')
        .execute();
    
    await db.schema
        .alterTable('projects')
        .addColumn('password_iv', 'text')
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    // 回滚：删除密码相关字段
    await db.schema
        .alterTable('projects')
        .dropColumn('password_iv')
        .dropColumn('password_salt')
        .dropColumn('encrypted_password')
        .dropColumn('has_password')
        .execute();
}

