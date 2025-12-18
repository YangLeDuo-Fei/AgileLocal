// 严格按照 V！.md v2025.PerfectScore.Final 生成
// 数据库迁移运行逻辑

import { FileMigrationProvider, Migrator } from 'kysely';
import { promises as fs } from 'fs';
import path, { join } from 'path';
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
        // 开发模式：直接从源码目录读取（electron-vite 不复制文件）
        // 生产模式：优先尝试便携版本路径，然后尝试 asar 打包路径
        let migrationsPath: string;
        if (app.isPackaged) {
            // 打包后：尝试多种可能的路径
            const possiblePackagedPaths = [
                // 方式1: 便携版本（无 asar）
                join(process.resourcesPath, 'app', 'main', 'database', 'migrations'),
                // 方式2: asar 打包版本（解包）
                join(process.resourcesPath, 'app.asar.unpacked', 'out', 'main', 'database', 'migrations'),
                // 方式3: asar 打包版本（备用）
                join(process.resourcesPath, 'app.asar.unpacked', 'main', 'database', 'migrations'),
            ];
            
            // 尝试找到第一个存在的路径
            let found = false;
            for (const path of possiblePackagedPaths) {
                try {
                    await fs.access(path);
                    migrationsPath = path;
                    found = true;
                    logger.info(`Found migrations path (packaged): ${path}`);
                    break;
                } catch {
                    // 继续尝试下一个路径
                }
            }
            
            if (!found) {
                const errorMsg = `Migrations directory not found in packaged app. Tried: ${possiblePackagedPaths.join(', ')}`;
                logger.error(errorMsg);
                throw new AppError('500_DB_ERROR', errorMsg);
            }
        } else {
            // 开发模式：从源码目录读取
            // 尝试多种路径解析方式
            const possiblePaths = [
                // 方式1: 从 app.getAppPath() 解析（通常是项目根目录）
                join(app.getAppPath(), 'src', 'main', 'database', 'migrations'),
                // 方式2: 从 __dirname 向上解析到项目根目录
                join(__dirname, '..', '..', '..', 'src', 'main', 'database', 'migrations'),
                // 方式3: 从 process.cwd() 解析（当前工作目录）
                join(process.cwd(), 'src', 'main', 'database', 'migrations'),
            ];
            
            // 找到第一个存在的路径
            let found = false;
            for (const path of possiblePaths) {
                try {
                    await fs.access(path);
                    migrationsPath = path;
                    found = true;
                    logger.info(`Found migrations path: ${path}`);
                    break;
                } catch {
                    // 继续尝试下一个路径
                }
            }
            
            if (!found) {
                const errorMsg = `Migrations directory not found. Tried: ${possiblePaths.join(', ')}`;
                logger.error(errorMsg);
                throw new AppError('500_DB_ERROR', errorMsg);
            }
        }

        logger.info(`Using migrations path: ${migrationsPath}`);

        const migrator = new Migrator({
            db,
            provider: new FileMigrationProvider({
                fs,
                path: path,
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
        
        // 获取迁移文件目录路径（使用与 runMigrations 相同的逻辑）
        let migrationsPath: string;
        if (app.isPackaged) {
            // 打包后：尝试多种可能的路径
            const possiblePackagedPaths = [
                join(process.resourcesPath, 'app', 'main', 'database', 'migrations'),
                join(process.resourcesPath, 'app.asar.unpacked', 'out', 'main', 'database', 'migrations'),
                join(process.resourcesPath, 'app.asar.unpacked', 'main', 'database', 'migrations'),
            ];
            
            let found = false;
            for (const path of possiblePackagedPaths) {
                try {
                    await fs.access(path);
                    migrationsPath = path;
                    found = true;
                    break;
                } catch {
                    // 继续尝试下一个路径
                }
            }
            
            if (!found) {
                const errorMsg = `Migrations directory not found in packaged app. Tried: ${possiblePackagedPaths.join(', ')}`;
                logger.error(errorMsg);
                throw new AppError('500_DB_ERROR', errorMsg);
            }
        } else {
            // 开发模式：从源码目录读取（使用与 runMigrations 相同的逻辑）
            const possiblePaths = [
                join(app.getAppPath(), 'src', 'main', 'database', 'migrations'),
                join(__dirname, '..', '..', '..', 'src', 'main', 'database', 'migrations'),
                join(process.cwd(), 'src', 'main', 'database', 'migrations'),
            ];
            
            let found = false;
            for (const path of possiblePaths) {
                try {
                    await fs.access(path);
                    migrationsPath = path;
                    found = true;
                    break;
                } catch {
                    // 继续尝试下一个路径
                }
            }
            
            if (!found) {
                const errorMsg = `Migrations directory not found. Tried: ${possiblePaths.join(', ')}`;
                logger.error(errorMsg);
                throw new AppError('500_DB_ERROR', errorMsg);
            }
        }

        logger.info(`Using migrations path (rollback): ${migrationsPath}`);

        const migrator = new Migrator({
            db,
            provider: new FileMigrationProvider({
                fs,
                path: path,
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

