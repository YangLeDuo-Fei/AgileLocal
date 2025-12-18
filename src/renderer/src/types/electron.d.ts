// Electron API 类型定义 - 渲染进程使用
// 从 preload 的类型定义复制，确保渲染进程可以访问

export interface IElectronAPI {
    task: {
        updateStatus: (
            taskId: number,
            newStatus: 'ToDo' | 'Doing' | 'Done',
            newOrder: number,
            expectedVersion: number
        ) => Promise<{ success: boolean; newVersion?: number } | { isAppError: true; code: string; message: string }>;
        create: (data: {
            projectId: number;
            title: string;
            description?: string | null;
            storyPoints?: number;
            status?: 'ToDo' | 'Doing' | 'Done';
            sprintId?: number | null;
        }) => Promise<{ success: boolean; taskId?: number } | { isAppError: true; code: string; message: string }>;
        getTasks: (
            projectId: number,
            sprintId?: number | null
        ) => Promise<{ success: boolean; tasks?: any[] } | { isAppError: true; code: string; message: string }>;
    };
    project: {
        create: (
            name: string,
            description?: string | null
        ) => Promise<{ success: boolean; projectId?: number } | { isAppError: true; code: string; message: string }>;
        getAll: () => Promise<{ success: boolean; projects?: any[] } | { isAppError: true; code: string; message: string }>;
        delete: (projectId: number) => Promise<{ success: boolean } | { isAppError: true; code: string; message: string }>;
    };
    git: {
        sync: () => Promise<{ success: boolean } | { isAppError: true; code: string; message: string }>;
        createRepository: (
            projectId: number,
            repoUrl: string,
            token: string
        ) => Promise<{ success: boolean; repoId?: number } | { isAppError: true; code: string; message: string }>;
        getRepositories: (
            projectId: number
        ) => Promise<{ success: boolean; repositories?: any[] } | { isAppError: true; code: string; message: string }>;
        deleteRepository: (repoId: number) => Promise<{ success: boolean } | { isAppError: true; code: string; message: string }>;
    };
    system: {
        getInfo: () => Promise<{
            success: boolean;
            info?: {
                userDataPath: string;
                dbPath: string;
                logPath: string;
                secretsPath: string;
                version: string;
            };
        } | { isAppError: true; code: string; message: string }>;
        createBackup: () => Promise<{ success: boolean; backupPath?: string } | { isAppError: true; code: string; message: string }>;
        restoreBackup: () => Promise<{ success: boolean } | { isAppError: true; code: string; message: string }>;
    };
    password: {
        checkRequired: () => Promise<{ success: boolean; required?: boolean; needsSetup?: boolean } | { isAppError: true; code: string; message: string }>;
        set: (masterPassword: string) => Promise<{ success: boolean } | { isAppError: true; code: string; message: string }>;
        verify: (masterPassword: string) => Promise<{ success: boolean; verified?: boolean } | { isAppError: true; code: string; message: string }>;
    };
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}







