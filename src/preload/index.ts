// 严格按照 V！.md v2025.PerfectScore.Final 生成
// Electron 预加载脚本 - 安全暴露 API

import { contextBridge, ipcRenderer } from 'electron';

// 安全暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 任务模块 (将在后续 Phase 中实现)
    task: {
        // 占位方法，后续实现
    },
    // 用户模块 (将在后续 Phase 中实现)
    user: {
        // 占位方法，后续实现
    },
    // 系统模块 (将在后续 Phase 中实现)
    system: {
        // 占位方法，后续实现
    }
});

