// 严格按照 V！.md v2025.PerfectScore.Final 生成
// 数据库连接与密钥注入

import Database from 'better-sqlite3-multiple-ciphers';
import { Kysely, SqliteDialect } from 'kysely';
import { join } from 'path';
import { app } from 'electron';
import { KeyManager } from '../security/KeyManager';
import { DB } from './schema';
import logger from '../utils/logger';

let dbInstance: Kysely<DB> | null = null;
let sqliteDb: Database.Database | null = null;

/**
 * 获取数据库实例（单例模式）
 */
export async function getDatabase(): Promise<Kysely<DB>> {
    if (dbInstance) {
        return dbInstance;
    }

    try {
        // 获取数据库密钥
        const keyManager = new KeyManager();
        const dbKey = await keyManager.getDbKey();
        const decryptedHexKey = dbKey.toString('hex');

        // 数据库文件路径
        const userDataPath = app.getPath('userData');
        const dbPath = join(userDataPath, 'agilelocal.db');

        // 创建 SQLite 数据库连接
        sqliteDb = new Database(dbPath);

        // 1. 注入密钥
        sqliteDb.pragma(`key='${decryptedHexKey}'`);

        // 2. 设置 WAL 模式，提升并发性能
        sqliteDb.pragma('journal_mode = WAL');

        // 创建 Kysely 实例
        const dialect = new SqliteDialect({
            database: sqliteDb,
        });

        dbInstance = new Kysely<DB>({
            dialect,
        });

        logger.info('Database connection established successfully');
        return dbInstance;
    } catch (error) {
        logger.error('Failed to establish database connection', error);
        throw error;
    }
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
    if (sqliteDb) {
        sqliteDb.close();
        sqliteDb = null;
        dbInstance = null;
        logger.info('Database connection closed');
    }
}

/**
 * 获取原生 SQLite 数据库实例（用于直接 SQL 操作）
 */
export function getSqliteDatabase(): Database.Database | null {
    return sqliteDb;
}

