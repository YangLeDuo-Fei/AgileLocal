// 严格按照 V！.md v2025.PerfectScore.Final 生成
// 数据库迁移运行逻辑

import { FileMigrationProvider, Migrator } from 'kysely';
import { promises as fs } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { getDatabase } from './connection';
import logger from '../utils/logger';
import { AppError } from '../utils/AppError';

/**
 * 运行数据库迁移
 */
export async function runMigrations(): Promise<void> {
    try {
        const db = await getDatabase();
        
        // 获取迁移文件目录路径
        // 开发模式：使用源码目录
        // 生产模式：使用打包后的目录
        const migrationsPath = app.isPackaged
            ? join(process.resourcesPath, 'app.asar.unpacked', 'src', 'main', 'database', 'migrations')
            : join(__dirname, 'migrations');

        const migrator = new Migrator({
            db,
            provider: new FileMigrationProvider({
                fs,
                path: migrationsPath,
                migrationFolder: migrationsPath,
            }),
        });

        logger.info('Starting database migrations...');

        const { error, results } = await migrator.migrateToLatest();

        if (error) {
            logger.error('Migration failed', error);
            throw new AppError('500_DB_ERROR', `Migration failed: ${error.message}`);
        }

        if (results) {
            results.forEach(({ migrationName, direction, status }) => {
                if (status === 'Success') {
                    logger.info(`Migration ${migrationName} ${direction} completed successfully`);
                } else if (status === 'Error') {
                    logger.error(`Migration ${migrationName} ${direction} failed`);
                }
            });
        }

        logger.info('Database migrations completed successfully');
    } catch (error) {
        logger.error('Failed to run migrations', error);
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError('500_DB_ERROR', `Failed to run migrations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * 回滚最后一次迁移
 */
export async function rollbackLastMigration(): Promise<void> {
    try {
        const db = await getDatabase();
        
        // 获取迁移文件目录路径
        const migrationsPath = app.isPackaged
            ? join(process.resourcesPath, 'app.asar.unpacked', 'src', 'main', 'database', 'migrations')
            : join(__dirname, 'migrations');

        const migrator = new Migrator({
            db,
            provider: new FileMigrationProvider({
                fs,
                path: migrationsPath,
                migrationFolder: migrationsPath,
            }),
        });

        logger.info('Rolling back last migration...');

        const { error, results } = await migrator.migrateDown();

        if (error) {
            logger.error('Rollback failed', error);
            throw new AppError('500_DB_ERROR', `Rollback failed: ${error.message}`);
        }

        if (results) {
            results.forEach(({ migrationName, direction, status }) => {
                if (status === 'Success') {
                    logger.info(`Migration ${migrationName} ${direction} completed successfully`);
                } else if (status === 'Error') {
                    logger.error(`Migration ${migrationName} ${direction} failed`);
                }
            });
        }

        logger.info('Rollback completed successfully');
    } catch (error) {
        logger.error('Failed to rollback migration', error);
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError('500_DB_ERROR', `Failed to rollback migration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

