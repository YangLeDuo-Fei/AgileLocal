// 严格按照 V！.md v2025.PerfectScore.Final 生成
// Electron 主进程入口文件

import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import logger from './utils/logger';
import { runMigrations } from './database/migrator';
import { closeDatabase } from './database/connection';

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
        createWindow();
    } catch (error) {
        logger.error('Failed to start application', error);
        app.quit();
    }

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
    closeDatabase();
});

