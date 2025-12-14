// 严格按照 V！.md v2025.PerfectScore.Final 生成
// Electron API 类型定义

export interface IElectronAPI {
    task: {
        updateStatus: (
            taskId: number,
            newStatus: 'ToDo' | 'Doing' | 'Done',
            newOrder: number,
            expectedVersion: number
        ) => Promise<{ success: boolean; newVersion?: number } | { isAppError: true; code: string; message: string }>;
    };
    git: {
        sync: () => Promise<{ success: boolean } | { isAppError: true; code: string; message: string }>;
    };
    user: {
        login: (username: string, password: string) => Promise<any>;
    };
    system: {
        createBackup: () => Promise<string>;
        restoreBackup: (backupPath: string) => Promise<boolean>;
    };
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}

