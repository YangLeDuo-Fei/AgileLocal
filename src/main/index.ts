// 严格按照 V！.md v2025.PerfectScore.Final 生成
// Electron 主进程入口文件

import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import logger from './utils/logger';
import { runMigrations } from './database/migrator';
import { closeDatabase } from './database/connection';
import { registerTaskIpcHandlers } from './ipc/taskIpc';
import { registerGitIpcHandlers } from './ipc/gitIpc';
import { getGitSyncService } from './services/GitSyncService';

let mainWindow: BrowserWindow | null = null;

async function initializeDatabase() {
    try {
        await runMigrations();
        logger.info('Database initialized successfully');
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
            devTools: true // 开发模式下开启调试工具
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
    
    // 初始化数据库并运行迁移
    try {
        await initializeDatabase();
    } catch (error) {
        logger.error('Failed to initialize database', error);
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

