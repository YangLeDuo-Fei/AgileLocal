// Electron API 类型定义

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
            assignee?: string | null;
            dueDate?: string | null;
            priority?: number;
        }) => Promise<{ success: boolean; taskId?: number } | { isAppError: true; code: string; message: string }>;
        getTasks: (
            projectId: number,
            sprintId?: number | null
        ) => Promise<{ success: boolean; tasks?: any[] } | { isAppError: true; code: string; message: string }>;
        update: (data: {
            taskId: number;
            title?: string;
            description?: string | null;
            storyPoints?: number;
            status?: 'ToDo' | 'Doing' | 'Done';
            assignee?: string | null;
            dueDate?: string | null;
            priority?: number;
        }) => Promise<{ success: boolean; taskId?: number } | { isAppError: true; code: string; message: string }>;
        delete: (taskId: number) => Promise<{ success: boolean } | { isAppError: true; code: string; message: string }>;
    };
    project: {
        create: (
            name: string,
            description?: string | null
        ) => Promise<{ success: boolean; projectId?: number } | { isAppError: true; code: string; message: string }>;
        getAll: () => Promise<{ success: boolean; projects?: any[] } | { isAppError: true; code: string; message: string }>;
        delete: (projectId: number) => Promise<{ success: boolean } | { isAppError: true; code: string; message: string }>;
        setPassword: (projectId: number, password: string) => Promise<{ success: boolean } | { isAppError: true; code: string; message: string }>;
        verifyPassword: (projectId: number, password: string) => Promise<{ success: boolean; valid: boolean } | { isAppError: true; code: string; message: string }>;
        removePassword: (projectId: number) => Promise<{ success: boolean } | { isAppError: true; code: string; message: string }>;
    };
    sprint: {
        create: (data: {
            projectId: number;
            name: string;
            startDate: string;
            endDate: string;
            status?: 'Planned' | 'Active' | 'Closed';
        }) => Promise<{ success: boolean; sprintId?: number } | { isAppError: true; code: string; message: string }>;
        getSprints: (projectId: number) => Promise<{ success: boolean; sprints?: any[] } | { isAppError: true; code: string; message: string }>;
        getSprint: (sprintId: number) => Promise<{ success: boolean; sprint?: any } | { isAppError: true; code: string; message: string }>;
        update: (data: {
            sprintId: number;
            name?: string;
            startDate?: string;
            endDate?: string;
            status?: 'Planned' | 'Active' | 'Closed';
        }) => Promise<{ success: boolean } | { isAppError: true; code: string; message: string }>;
        delete: (sprintId: number) => Promise<{ success: boolean } | { isAppError: true; code: string; message: string }>;
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
        getCommitsByRepository: (
            repoId: number,
            limit?: number
        ) => Promise<{ success: boolean; commits?: any[] } | { isAppError: true; code: string; message: string }>;
        getCommitsByProject: (
            projectId: number,
            limit?: number
        ) => Promise<{ success: boolean; commits?: any[] } | { isAppError: true; code: string; message: string }>;
        getRecentlyClosedTasks: (
            projectId: number,
            limit?: number
        ) => Promise<{ success: boolean; closedTasks?: any[] } | { isAppError: true; code: string; message: string }>;
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
    export: {
        exportProjectReportMarkdown: (projectId: number) => Promise<
            | { success: boolean; filePath?: string; canceled?: boolean }
            | { isAppError: true; code: string; message: string }
        >;
    };
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}
