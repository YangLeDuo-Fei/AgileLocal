// 严格按照 V！.md v2025.PerfectScore.Final 生成
// Electron API 类型定义

export interface IElectronAPI {
    task: {
        getBySprint: (sprintId: number) => Promise<any[]>;
        updateStatus: (taskId: number, status: string, index: number, expectedVersion: number) => Promise<boolean>;
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

