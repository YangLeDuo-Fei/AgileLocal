// 严格按照 V！.md v2025.PerfectScore.Final 生成
// Electron 预加载脚本 - 安全暴露 API

import { contextBridge, ipcRenderer } from 'electron';

// IPC Channels (需要与主进程保持一致)
const IpcChannels = {
    // 任务相关
    UPDATE_TASK_STATUS: 'task:updateStatus',
    UPDATE_TASK: 'task:update',
    DELETE_TASK: 'task:delete',
    CREATE_TASK: 'task:create',
    GET_TASKS: 'task:getTasks',
    
    // 项目相关
    CREATE_PROJECT: 'project:create',
    GET_PROJECTS: 'project:getProjects',
    DELETE_PROJECT: 'project:delete',
    
    // Git 相关
    SYNC_GIT: 'git:sync',
    CREATE_REPOSITORY: 'git:createRepository',
    GET_REPOSITORIES: 'git:getRepositories',
    DELETE_REPOSITORY: 'git:deleteRepository',
    
    // 系统相关
    GET_SYSTEM_INFO: 'system:getInfo',
    CREATE_BACKUP: 'system:createBackup',
    RESTORE_BACKUP: 'system:restoreBackup',
    
    // 主密码相关
    CHECK_MASTER_PASSWORD_REQUIRED: 'password:checkRequired',
    SET_MASTER_PASSWORD: 'password:set',
    VERIFY_MASTER_PASSWORD: 'password:verify',
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
        create: async (data: {
            projectId: number;
            title: string;
            description?: string | null;
            storyPoints?: number;
            status?: 'ToDo' | 'Doing' | 'Done';
            sprintId?: number | null;
            assignee?: string | null;
            dueDate?: string | null;
            priority?: number;
        }) => {
            return await ipcRenderer.invoke(IpcChannels.CREATE_TASK, data);
        },
        getTasks: async (projectId: number, sprintId?: number | null) => {
            return await ipcRenderer.invoke(IpcChannels.GET_TASKS, { projectId, sprintId });
        },
        update: async (data: {
            taskId: number;
            title?: string;
            description?: string | null;
            storyPoints?: number;
            status?: 'ToDo' | 'Doing' | 'Done';
            assignee?: string | null;
            dueDate?: string | null;
            priority?: number;
        }) => {
            return await ipcRenderer.invoke(IpcChannels.UPDATE_TASK, data);
        },
        delete: async (taskId: number) => {
            return await ipcRenderer.invoke(IpcChannels.DELETE_TASK, { taskId });
        },
    },
    // 项目模块
    project: {
        create: async (name: string, description?: string | null) => {
            return await ipcRenderer.invoke(IpcChannels.CREATE_PROJECT, { name, description });
        },
        getAll: async () => {
            return await ipcRenderer.invoke(IpcChannels.GET_PROJECTS);
        },
        delete: async (projectId: number) => {
            return await ipcRenderer.invoke(IpcChannels.DELETE_PROJECT, projectId);
        },
    },
    // Git 模块
    git: {
        sync: async () => {
            return await ipcRenderer.invoke(IpcChannels.SYNC_GIT);
        },
        createRepository: async (projectId: number, repoUrl: string, token: string) => {
            return await ipcRenderer.invoke(IpcChannels.CREATE_REPOSITORY, {
                projectId,
                repoUrl,
                token,
            });
        },
        getRepositories: async (projectId: number) => {
            return await ipcRenderer.invoke(IpcChannels.GET_REPOSITORIES, projectId);
        },
        deleteRepository: async (repoId: number) => {
            return await ipcRenderer.invoke(IpcChannels.DELETE_REPOSITORY, repoId);
        },
    },
    // 系统模块
    system: {
        getInfo: async () => {
            return await ipcRenderer.invoke(IpcChannels.GET_SYSTEM_INFO);
        },
        createBackup: async () => {
            return await ipcRenderer.invoke(IpcChannels.CREATE_BACKUP);
        },
        restoreBackup: async () => {
            return await ipcRenderer.invoke(IpcChannels.RESTORE_BACKUP);
        },
    },
    // 主密码模块
    password: {
        checkRequired: async () => {
            return await ipcRenderer.invoke(IpcChannels.CHECK_MASTER_PASSWORD_REQUIRED);
        },
        set: async (masterPassword: string) => {
            return await ipcRenderer.invoke(IpcChannels.SET_MASTER_PASSWORD, { masterPassword });
        },
        verify: async (masterPassword: string) => {
            return await ipcRenderer.invoke(IpcChannels.VERIFY_MASTER_PASSWORD, { masterPassword });
        },
    },
});
