// 备份与恢复服务

import { app, dialog } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';
import { closeDatabase } from '../database/connection';
import logger from '../utils/logger';
import { AppError } from '../utils/AppError';
import * as AdmZip from 'adm-zip';

/**
 * 备份服务
 */
export class BackupService {
    /**
     * 备份数据库和密钥文件
     */
    async createBackup(): Promise<string> {
        try {
            const userDataPath = app.getPath('userData');
            const dbPath = join(userDataPath, 'agilelocal.db');
            const secretsPath = join(userDataPath, 'secrets.enc');

            // 检查文件是否存在
            try {
                await fs.access(dbPath);
            } catch {
                throw new AppError('404_NOT_FOUND', '数据库文件不存在，无法备份');
            }

            // 关闭数据库连接（备份前必须关闭）
            closeDatabase();

            // 创建备份文件名（包含时间戳）
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const backupFileName = `agilelocal-backup-${timestamp}.zip`;
            
            // 使用 dialog 让用户选择保存位置
            const result = await dialog.showSaveDialog({
                title: '保存备份文件',
                defaultPath: backupFileName,
                filters: [
                    { name: 'ZIP 文件', extensions: ['zip'] },
                    { name: '所有文件', extensions: ['*'] },
                ],
            });

            if (result.canceled || !result.filePath) {
                throw new AppError('400_CANCELLED', '用户取消备份操作');
            }

            const backupPath = result.filePath;

            // 创建 ZIP 压缩包
            const zip = new AdmZip();

            // 添加数据库文件
            try {
                const dbData = await fs.readFile(dbPath);
                zip.addFile('agilelocal.db', dbData);
            } catch (error) {
                logger.error('Failed to read database file', error);
                throw new AppError('500_IO_ERROR', `读取数据库文件失败: ${error instanceof Error ? error.message : String(error)}`);
            }

            // 添加密钥文件（如果存在）
            try {
                await fs.access(secretsPath);
                const secretsData = await fs.readFile(secretsPath);
                zip.addFile('secrets.enc', secretsData);
            } catch {
                // 密钥文件不存在时跳过（可能是使用了主密码模式）
                logger.warn('Secrets file not found, skipping in backup');
            }

            // 添加备份元数据
            const metadata = {
                version: app.getVersion(),
                timestamp: new Date().toISOString(),
                userDataPath,
            };
            zip.addFile('backup-metadata.json', Buffer.from(JSON.stringify(metadata, null, 2)));

            // 保存 ZIP 文件
            zip.writeZip(backupPath);

            logger.info(`Backup created successfully: ${backupPath}`);
            return backupPath;
        } catch (error) {
            logger.error('Failed to create backup', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('500_BACKUP_ERROR', `创建备份失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 从备份文件恢复
     */
    async restoreBackup(): Promise<void> {
        try {
            // 使用 dialog 让用户选择备份文件
            const result = await dialog.showOpenDialog({
                title: '选择备份文件',
                filters: [
                    { name: 'ZIP 文件', extensions: ['zip'] },
                    { name: '所有文件', extensions: ['*'] },
                ],
                properties: ['openFile'],
            });

            if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
                throw new AppError('400_CANCELLED', '用户取消恢复操作');
            }

            const backupPath = result.filePaths[0];

            // 读取 ZIP 文件
            const zip = new AdmZip(backupPath);

            // 验证备份文件格式
            const entries = zip.getEntries();
            const hasDb = entries.some(e => e.entryName === 'agilelocal.db');
            if (!hasDb) {
                throw new AppError('400_INVALID_BACKUP', '备份文件格式无效：缺少数据库文件');
            }

            // 关闭数据库连接（恢复前必须关闭）
            closeDatabase();

            const userDataPath = app.getPath('userData');
            const dbPath = join(userDataPath, 'agilelocal.db');
            const secretsPath = join(userDataPath, 'secrets.enc');

            // 备份当前文件（以防恢复失败）
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            try {
                await fs.access(dbPath);
                await fs.copyFile(dbPath, `${dbPath}.backup-${timestamp}`);
            } catch {
                // 当前数据库不存在，无需备份
            }

            try {
                await fs.access(secretsPath);
                await fs.copyFile(secretsPath, `${secretsPath}.backup-${timestamp}`);
            } catch {
                // 当前密钥文件不存在，无需备份
            }

            // 解压数据库文件
            const dbEntry = zip.getEntry('agilelocal.db');
            if (dbEntry) {
                const dbData = dbEntry.getData();
                await fs.writeFile(dbPath, dbData);
            }

            // 解压密钥文件（如果存在）
            const secretsEntry = zip.getEntry('secrets.enc');
            if (secretsEntry) {
                const secretsData = secretsEntry.getData();
                await fs.writeFile(secretsPath, secretsData);
            }

            logger.info(`Backup restored successfully from: ${backupPath}`);
        } catch (error) {
            logger.error('Failed to restore backup', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('500_RESTORE_ERROR', `恢复备份失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

let backupServiceInstance: BackupService | null = null;

/**
 * 获取 BackupService 单例
 */
export function getBackupService(): BackupService {
    if (!backupServiceInstance) {
        backupServiceInstance = new BackupService();
    }
    return backupServiceInstance;
}






