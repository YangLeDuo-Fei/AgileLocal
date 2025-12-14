// 严格按照 V！.md v2025.PerfectScore.Final 生成
// IPC Channels 常量定义

export const IpcChannels = {
    // 任务相关
    UPDATE_TASK_STATUS: 'task:updateStatus',
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
} as const;

