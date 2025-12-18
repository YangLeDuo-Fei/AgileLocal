// 密钥管理服务层（用于 IPC）

import { KeyManager } from '../security/KeyManager';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';
import { existsSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

let keyManagerInstance: KeyManager | null = null;

function getKeyManager(): KeyManager {
    if (!keyManagerInstance) {
        keyManagerInstance = new KeyManager();
    }
    return keyManagerInstance;
}

/**
 * 检查是否需要主密码
 */
export function checkMasterPasswordRequired(): { required: boolean; needsSetup: boolean } {
    try {
        const keyManager = getKeyManager();
        const required = keyManager.requiresMasterPassword();
        
        // 检查密钥文件是否存在
        const userDataPath = app.getPath('userData');
        const secretsPath = join(userDataPath, 'secrets.enc');
        const needsSetup = required && !existsSync(secretsPath);
        
        return { required, needsSetup };
    } catch (error) {
        logger.error('Failed to check master password requirement', error);
        return { required: false, needsSetup: false };
    }
}

/**
 * 设置主密码（首次启动时）
 * @param masterPassword 主密码（长度 >= 12）
 * @param dbKey 数据库密钥（如果已有）
 */
export async function setMasterPassword(masterPassword: string, dbKey?: Buffer): Promise<void> {
    if (masterPassword.length < 12) {
        throw new AppError('400_INVALID_INPUT', 'Master password must be at least 12 characters long');
    }

    try {
        const keyManager = getKeyManager();
        
        // 如果 dbKey 未提供，生成新的
        if (!dbKey) {
            const crypto = await import('crypto');
            dbKey = crypto.randomBytes(32);
        }
        
        // 使用 Fallback 方法加密并存储
        await keyManager.storeWithFallback(dbKey, masterPassword);
        
        // 设置成功后，将密钥缓存到 KeyManager 实例中
        // 这样 getDatabase() 下次调用时就能使用
        (keyManager as any).dbKey = dbKey;
        
        logger.info('Master password set successfully');
        
        // 设置成功后，初始化数据库连接
        try {
            const { getDatabase } = await import('../database/connection');
            await getDatabase();
            logger.info('Database connection initialized after password setup');
        } catch (dbError) {
            logger.error('Failed to initialize database after password setup', dbError);
            // 数据库初始化失败不影响密码设置结果
        }
    } catch (error) {
        logger.error('Failed to set master password', error);
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError('500_INTERNAL_ERROR', `Failed to set master password: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * 验证主密码（启动时验证）
 * @param masterPassword 主密码
 */
export async function verifyMasterPassword(masterPassword: string): Promise<boolean> {
    try {
        const keyManager = getKeyManager();
        await keyManager.loadWithFallback(masterPassword);
        logger.info('Master password verified successfully');
        
        // 验证成功后，初始化数据库连接
        // 这样 getDatabase() 下次调用时就能使用缓存的密钥
        try {
            const { getDatabase } = await import('../database/connection');
            await getDatabase();
            logger.info('Database connection initialized after password verification');
        } catch (dbError) {
            logger.error('Failed to initialize database after password verification', dbError);
            // 数据库初始化失败不影响密码验证结果，返回 true
        }
        
        return true;
    } catch (error) {
        logger.error('Master password verification failed', error);
        return false;
    }
}






