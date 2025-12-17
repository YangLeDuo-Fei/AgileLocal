// 项目密码服务 - 项目级别密码保护

import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto';
import { getDatabase } from '../database/connection';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

/**
 * 加密项目密码验证令牌
 * 使用固定令牌（项目ID的哈希）而不是直接加密密码，以便验证时能正确比较
 * @param password 原始密码
 * @param projectId 项目ID（用于生成固定令牌）
 * @returns { salt: string, iv: string, encrypted: string }
 */
function encryptPasswordToken(password: string, projectId: number): { salt: string; iv: string; encrypted: string } {
    // 生成 32 字节 Salt (用于 PBKDF2)
    const salt = randomBytes(32);
    
    // PBKDF2 派生 AES Key
    // 算法: sha512, 迭代次数: 100000, 密钥长度: 32 字节
    const derivedKey = pbkdf2Sync(password, salt, 100000, 32, 'sha512');
    
    // 生成 16 字节 IV (用于 AES-GCM)
    const iv = randomBytes(16);
    
    // 使用固定令牌（基于项目ID）而不是直接加密密码
    // 这样可以确保相同的密码每次验证时都能匹配
    const token = Buffer.from(`project_${projectId}_token`, 'utf-8');
    
    // 使用 AES-256-GCM 加密令牌
    const cipher = createCipheriv('aes-256-gcm', derivedKey, iv);
    const encrypted = Buffer.concat([
        cipher.update(token),
        cipher.final()
    ]);
    const authTag = cipher.getAuthTag();
    
    // 将 authTag 附加到加密内容
    const encryptedWithTag = Buffer.concat([encrypted, authTag]);
    
    return {
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        encrypted: encryptedWithTag.toString('hex'),
    };
}

/**
 * 验证项目密码
 * @param password 输入的密码
 * @param encryptedToken 加密后的令牌（hex）
 * @param salt Salt（hex）
 * @param iv IV（hex）
 * @param projectId 项目ID（用于生成期望的令牌）
 * @returns boolean
 */
function verifyPassword(
    password: string,
    encryptedToken: string,
    salt: string,
    iv: string,
    projectId: number
): boolean {
    try {
        // PBKDF2 派生 AES Key
        const saltBuffer = Buffer.from(salt, 'hex');
        const derivedKey = pbkdf2Sync(password, saltBuffer, 100000, 32, 'sha512');
        
        // 解密
        const ivBuffer = Buffer.from(iv, 'hex');
        const encryptedWithTag = Buffer.from(encryptedToken, 'hex');
        
        // 分离加密内容和 authTag (GCM 模式 authTag 为 16 字节)
        const authTag = encryptedWithTag.slice(-16);
        const encrypted = encryptedWithTag.slice(0, -16);
        
        const decipher = createDecipheriv('aes-256-gcm', derivedKey, ivBuffer);
        decipher.setAuthTag(authTag);
        
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);
        
        // 将解密后的内容与期望的令牌比较
        const expectedToken = Buffer.from(`project_${projectId}_token`, 'utf-8');
        return decrypted.equals(expectedToken);
    } catch (error) {
        logger.error('Failed to verify project password', error);
        return false;
    }
}

/**
 * 为项目设置密码
 * @param projectId 项目ID
 * @param password 密码（至少6个字符）
 */
export async function setProjectPassword(projectId: number, password: string): Promise<void> {
    if (password.length < 6) {
        throw new AppError('400_INVALID_INPUT', 'Project password must be at least 6 characters long');
    }

    try {
        const db = await getDatabase();
        
        // 检查项目是否存在
        const project = await db
            .selectFrom('projects')
            .select('id')
            .where('id', '=', projectId)
            .executeTakeFirst();
        
        if (!project) {
            throw new AppError('400_INVALID_INPUT', `Project with id ${projectId} not found`);
        }
        
        // 加密密码令牌
        const { salt, iv, encrypted } = encryptPasswordToken(password, projectId);
        
        // 更新项目记录
        await db
            .updateTable('projects')
            .set({
                has_password: 1,
                encrypted_password: encrypted,
                password_salt: salt,
                password_iv: iv,
            })
            .where('id', '=', projectId)
            .execute();
        
        logger.info(`Project password set for project ${projectId}`);
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        logger.error('Failed to set project password', error);
        throw new AppError('500_DB_ERROR', `Failed to set project password: ${error}`);
    }
}

/**
 * 验证项目密码
 * @param projectId 项目ID
 * @param password 输入的密码
 * @returns boolean
 */
export async function verifyProjectPassword(projectId: number, password: string): Promise<boolean> {
    try {
        const db = await getDatabase();
        
        // 获取项目的密码信息
        const project = await db
            .selectFrom('projects')
            .select(['has_password', 'encrypted_password', 'password_salt', 'password_iv'])
            .where('id', '=', projectId)
            .executeTakeFirst();
        
        if (!project) {
            throw new AppError('400_INVALID_INPUT', `Project with id ${projectId} not found`);
        }
        
        // 如果项目没有设置密码，返回 true
        if (!project.has_password || !project.encrypted_password || !project.password_salt || !project.password_iv) {
            return true; // 没有密码保护的项目，直接允许访问
        }
        
        // 验证密码
        const isValid = verifyPassword(
            password,
            project.encrypted_password,
            project.password_salt,
            project.password_iv,
            projectId
        );
        
        if (isValid) {
            logger.info(`Project password verified for project ${projectId}`);
        } else {
            logger.warn(`Project password verification failed for project ${projectId}`);
        }
        
        return isValid;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        logger.error('Failed to verify project password', error);
        throw new AppError('500_DB_ERROR', `Failed to verify project password: ${error}`);
    }
}

/**
 * 移除项目密码
 * @param projectId 项目ID
 */
export async function removeProjectPassword(projectId: number): Promise<void> {
    try {
        const db = await getDatabase();
        
        // 检查项目是否存在
        const project = await db
            .selectFrom('projects')
            .select('id')
            .where('id', '=', projectId)
            .executeTakeFirst();
        
        if (!project) {
            throw new AppError('400_INVALID_INPUT', `Project with id ${projectId} not found`);
        }
        
        // 清除密码相关字段
        await db
            .updateTable('projects')
            .set({
                has_password: 0,
                encrypted_password: null,
                password_salt: null,
                password_iv: null,
            })
            .where('id', '=', projectId)
            .execute();
        
        logger.info(`Project password removed for project ${projectId}`);
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        logger.error('Failed to remove project password', error);
        throw new AppError('500_DB_ERROR', `Failed to remove project password: ${error}`);
    }
}

