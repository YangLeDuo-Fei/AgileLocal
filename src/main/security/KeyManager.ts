// 严格按照 V！.md v2025.PerfectScore.Final 生成
// 密钥管理核心逻辑 (KeyManager.ts)

import { safeStorage } from 'electron';
import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import logger from '../utils/logger';

// EncryptedSecret 接口定义
export interface EncryptedSecret {
    iv: string;         // 16-byte IV (hex)
    content: string;    // 加密后的 dbKey (hex)
    algorithm: 'AES-256-GCM' | 'safeStorage'; // 算法标识
    salt?: string;      // 仅 Fallback (PBKDF2) 使用 (32-byte hex)
}

export class KeyManager {
    private secretsPath: string;
    private dbKey: Buffer | null = null;

    constructor() {
        const userDataPath = app.getPath('userData');
        this.secretsPath = join(userDataPath, 'secrets.enc');
    }

    /**
     * 获取数据库密钥
     * 如果密钥不存在，生成新密钥并加密存储
     */
    async getDbKey(): Promise<Buffer> {
        if (this.dbKey) {
            return this.dbKey;
        }

        // 检查是否已存在加密密钥文件
        if (existsSync(this.secretsPath)) {
            try {
                this.dbKey = await this.loadDbKey();
            } catch (error) {
                // 如果 loadDbKey 失败（可能是因为需要主密码），抛出错误
                // 让调用者知道需要通过 UI 获取主密码
                throw error;
            }
        } else {
            // 密钥文件不存在，检查 safeStorage 是否可用
            if (safeStorage.isEncryptionAvailable()) {
                // 使用 safeStorage 生成并存储
                this.dbKey = await this.generateAndStoreDbKey();
            } else {
                // safeStorage 不可用，需要主密码
                // 这里不直接抛出错误，而是抛出特殊错误，让调用者知道需要通过 UI 设置主密码
                throw new Error('Master password required. Please set a master password (min 12 characters) through the UI.');
            }
        }

        return this.dbKey;
    }

    /**
     * 生成新的数据库密钥并加密存储
     */
    private async generateAndStoreDbKey(): Promise<Buffer> {
        // DB Key 生成规则: 必须是 crypto.randomBytes(32)
        const dbKey = randomBytes(32);
        
        // 检查 safeStorage 是否可用
        if (safeStorage.isEncryptionAvailable()) {
            // 使用 safeStorage 加密
            const encrypted = safeStorage.encryptString(dbKey.toString('hex'));
            const secret: EncryptedSecret = {
                iv: '', // safeStorage 不需要 IV
                content: encrypted.toString('hex'),
                algorithm: 'safeStorage'
            };
            writeFileSync(this.secretsPath, JSON.stringify(secret, null, 2));
            logger.info('Database key generated and encrypted using safeStorage');
        } else {
            // Fallback: 使用 AES-256-GCM + PBKDF2
            logger.warn('safeStorage not available, using fallback encryption');
            await this.generateAndStoreWithFallback(dbKey);
        }

        return dbKey;
    }

    /**
     * Fallback 加密: 使用 PBKDF2 + AES-256-GCM
     * 主密码策略: 长度必须 >= 12 字符
     * PBKDF2 参数:
     *   - 算法: sha512
     *   - 迭代次数: 100000
     *   - 密钥长度: 32 字节
     */
    private async generateAndStoreWithFallback(dbKey: Buffer): Promise<void> {
        // 提示用户设置主密码 (这里需要从 UI 获取，暂时抛出错误提示)
        // 实际实现中，应该通过 IPC 与渲染进程通信获取主密码
        throw new Error('Master password required. Please set a master password (min 12 characters) through the UI.');
    }

    /**
     * 使用 Fallback 方法加密并存储密钥
     * @param dbKey 数据库密钥
     * @param masterPassword 主密码 (长度 >= 12)
     */
    async storeWithFallback(dbKey: Buffer, masterPassword: string): Promise<void> {
        if (masterPassword.length < 12) {
            throw new Error('Master password must be at least 12 characters long');
        }

        // 生成 32 字节 Salt (用于 PBKDF2)
        const salt = randomBytes(32);
        
        // PBKDF2 派生 AES Key
        // 算法: sha512, 迭代次数: 100000, 密钥长度: 32 字节
        const derivedKey = pbkdf2Sync(masterPassword, salt, 100000, 32, 'sha512');
        
        // 生成 16 字节 IV (用于 AES-GCM)
        const iv = randomBytes(16);
        
        // 使用 AES-256-GCM 加密
        const cipher = createCipheriv('aes-256-gcm', derivedKey, iv);
        const encrypted = Buffer.concat([
            cipher.update(dbKey),
            cipher.final()
        ]);
        const authTag = cipher.getAuthTag();
        
        // 将 authTag 附加到加密内容
        const encryptedWithTag = Buffer.concat([encrypted, authTag]);
        
        const secret: EncryptedSecret = {
            iv: iv.toString('hex'),
            content: encryptedWithTag.toString('hex'),
            algorithm: 'AES-256-GCM',
            salt: salt.toString('hex')
        };
        
        writeFileSync(this.secretsPath, JSON.stringify(secret, null, 2));
        logger.info('Database key encrypted using AES-256-GCM fallback');
    }

    /**
     * 从加密文件加载数据库密钥
     */
    private async loadDbKey(): Promise<Buffer> {
        const secretData = readFileSync(this.secretsPath, 'utf-8');
        const secret: EncryptedSecret = JSON.parse(secretData);

        if (secret.algorithm === 'safeStorage') {
            // 使用 safeStorage 解密
            const encryptedBuffer = Buffer.from(secret.content, 'hex');
            const decryptedHex = safeStorage.decryptString(encryptedBuffer);
            return Buffer.from(decryptedHex, 'hex');
        } else if (secret.algorithm === 'AES-256-GCM') {
            // Fallback 解密需要主密码
            throw new Error('Master password required for decryption. Please provide through UI.');
        } else {
            throw new Error(`Unknown encryption algorithm: ${secret.algorithm}`);
        }
    }

    /**
     * 使用 Fallback 方法解密并加载密钥
     * @param masterPassword 主密码
     */
    async loadWithFallback(masterPassword: string): Promise<Buffer> {
        if (!existsSync(this.secretsPath)) {
            throw new Error('Encrypted secret file not found');
        }

        const secretData = readFileSync(this.secretsPath, 'utf-8');
        const secret: EncryptedSecret = JSON.parse(secretData);

        if (secret.algorithm !== 'AES-256-GCM' || !secret.salt || !secret.iv) {
            throw new Error('Invalid encrypted secret format for fallback decryption');
        }

        // PBKDF2 派生 AES Key
        const salt = Buffer.from(secret.salt, 'hex');
        const derivedKey = pbkdf2Sync(masterPassword, salt, 100000, 32, 'sha512');
        
        // 解密
        const iv = Buffer.from(secret.iv, 'hex');
        const encryptedWithTag = Buffer.from(secret.content, 'hex');
        
        // 分离加密内容和 authTag (GCM 模式 authTag 为 16 字节)
        const authTag = encryptedWithTag.slice(-16);
        const encrypted = encryptedWithTag.slice(0, -16);
        
        const decipher = createDecipheriv('aes-256-gcm', derivedKey, iv);
        decipher.setAuthTag(authTag);
        
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);

        this.dbKey = decrypted;
        return decrypted;
    }

    /**
     * 检查是否使用 Fallback 加密
     */
    isUsingFallback(): boolean {
        if (!existsSync(this.secretsPath)) {
            return !safeStorage.isEncryptionAvailable();
        }

        const secretData = readFileSync(this.secretsPath, 'utf-8');
        const secret: EncryptedSecret = JSON.parse(secretData);
        return secret.algorithm === 'AES-256-GCM';
    }

    /**
     * 检查是否需要主密码
     */
    requiresMasterPassword(): boolean {
        return this.isUsingFallback();
    }
}

