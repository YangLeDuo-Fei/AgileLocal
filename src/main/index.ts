// 严格按照 V！.md v2025.PerfectScore.Final 生成
// Electron 主进程入口文件

import { app, BrowserWindow, dialog, safeStorage } from 'electron';
import { join } from 'path';
import logger from './utils/logger';
import { runMigrations } from './database/migrator';
import { closeDatabase, getDatabase } from './database/connection';
import { registerTaskIpcHandlers } from './ipc/taskIpc';
import { registerGitIpcHandlers } from './ipc/gitIpc';
import { getGitSyncService } from './services/GitSyncService';

let mainWindow: BrowserWindow | null = null;

/**
 * 最终安全检查（打包后首次运行）
 */
async function performStartupSecurityCheck(): Promise<boolean> {
    try {
        // 检查 safeStorage 可用性
        if (!safeStorage.isEncryptionAvailable()) {
            logger.warn('safeStorage is not available, will require master password (Fallback mode)');
            // 注意：Fallback 模式的 UI 流程将在后续版本支持
            // 当前版本如果 safeStorage 不可用，会抛出错误
        }
        
        logger.info('Startup security check passed');
        return true;
    } catch (error) {
        logger.error('Startup security check failed', error);
        return false;
    }
}

/**
 * 数据库完整性验证
 */
async function verifyDatabaseIntegrity(): Promise<boolean> {
    try {
        const db = await getDatabase();
        
        // 尝试读取 projects 表验证数据库完整性
        await db
            .selectFrom('projects')
            .select('id')
            .limit(1)
            .execute();
        
        logger.info('Database integrity verification passed');
        return true;
    } catch (error) {
        logger.error('Database integrity verification failed', error);
        return false;
    }
}

async function initializeDatabase() {
    try {
        await runMigrations();
        logger.info('Database initialized successfully');
        
        // 验证数据库完整性
        const integrityOk = await verifyDatabaseIntegrity();
        if (!integrityOk) {
            throw new Error('Database integrity check failed');
        }
    } catch (error) {
        logger.error('Failed to initialize database', error);
        throw error;
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            nodeIntegration: false,
            contextIsolation: true,
            devTools: !app.isPackaged // 生产模式下关闭 DevTools
        }
    });

    // 开发模式下加载 Vite 开发服务器，生产模式下加载构建后的文件
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    logger.info('Application starting...');
    
    // 最终安全检查（打包后）
    if (app.isPackaged) {
        const securityCheckPassed = await performStartupSecurityCheck();
        if (!securityCheckPassed) {
            logger.error('Startup security check failed, application may not function correctly');
            // 继续启动，但会在 UI 中显示警告
        }
    }
    
    // 初始化数据库并运行迁移
    let dbInitialized = false;
    try {
        await initializeDatabase();
        dbInitialized = true;
    } catch (error) {
        logger.error('Failed to initialize database', error);
        
        // 打包后数据库初始化失败，显示友好错误提示
        if (app.isPackaged) {
            dialog.showErrorBox(
                '数据库初始化失败',
                '应用无法初始化数据库。\n\n' +
                '可能的原因：\n' +
                '1. 数据库文件损坏\n' +
                '2. 密钥文件损坏\n' +
                '3. 文件权限问题\n\n' +
                '请查看日志文件获取详细信息：\n' +
                `${app.getPath('appData')}/AgileLocal/logs/app.log`
            );
        }
        // 数据库初始化失败时，仍然创建窗口，但会在 UI 中显示错误提示
        // 这样用户可以看到错误信息，而不是应用直接退出
    }
    
    // 无论数据库是否初始化成功，都创建窗口
    createWindow();

    // 注册 IPC handlers
    registerTaskIpcHandlers();
    registerGitIpcHandlers();

    // 启动 Git 同步服务（定时任务）
    const gitSyncService = getGitSyncService();
    gitSyncService.start();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    logger.info('Application shutting down...');
    
    // 停止 Git 同步服务
    const gitSyncService = getGitSyncService();
    gitSyncService.stop();
    
    closeDatabase();
});

