// 严格按照 V！.md v2025.PerfectScore.Final 生成
// Electron 预加载脚本 - 安全暴露 API

import { contextBridge, ipcRenderer } from 'electron';

// IPC Channels (需要与主进程保持一致)
const IpcChannels = {
    UPDATE_TASK_STATUS: 'task:updateStatus',
} as const;

// 安全暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 任务模块
    task: {
        updateStatus: async (
            taskId: number,
            newStatus: 'ToDo' | 'Doing' | 'Done',
            newOrder: number,
            expectedVersion: number
        ) => {
            return await ipcRenderer.invoke(IpcChannels.UPDATE_TASK_STATUS, {
                taskId,
                newStatus,
                newOrder,
                expectedVersion,
            });
        },
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

