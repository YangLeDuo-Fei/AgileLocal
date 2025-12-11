// 严格按照 V！.md v2025.PerfectScore.Final 生成
// electron-log 封装

import log from 'electron-log';
import { app } from 'electron';
import path from 'path';

// 配置日志路径: %APPDATA%/AgileLocal/logs/app.log
log.transports.file.resolvePathFn = () => {
    const appDataPath = app.getPath('appData');
    const logDir = path.join(appDataPath, 'AgileLocal', 'logs');
    return path.join(logDir, 'app.log');
};

// 开发模式下设置为 debug 级别
if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    log.transports.console.level = 'debug';
    log.transports.file.level = 'debug';
}

export default log;

