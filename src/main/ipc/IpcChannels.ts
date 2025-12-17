// 严格按照 V！.md v2025.PerfectScore.Final 生成
// IPC Channels 常量定义

export const IpcChannels = {
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
    
    // Sprint 相关
    CREATE_SPRINT: 'sprint:create',
    GET_SPRINTS: 'sprint:getSprints',
    GET_SPRINT: 'sprint:getSprint',
    UPDATE_SPRINT: 'sprint:update',
    DELETE_SPRINT: 'sprint:delete',
    
    // Git 相关
    SYNC_GIT: 'git:sync',
    CREATE_REPOSITORY: 'git:createRepository',
    GET_REPOSITORIES: 'git:getRepositories',
    DELETE_REPOSITORY: 'git:deleteRepository',
    GET_COMMITS_BY_REPOSITORY: 'git:getCommitsByRepository',
    GET_COMMITS_BY_PROJECT: 'git:getCommitsByProject',
    GET_RECENTLY_CLOSED_TASKS: 'git:getRecentlyClosedTasks',
    
    // 系统相关
    GET_SYSTEM_INFO: 'system:getInfo',
    CREATE_BACKUP: 'system:createBackup',
    RESTORE_BACKUP: 'system:restoreBackup',
    
    // 主密码相关
    CHECK_MASTER_PASSWORD_REQUIRED: 'password:checkRequired',
    SET_MASTER_PASSWORD: 'password:set',
    VERIFY_MASTER_PASSWORD: 'password:verify',
    
    // 导出相关
    EXPORT_PROJECT_REPORT_MARKDOWN: 'export:projectReportMarkdown',
    
    // 项目密码相关
    SET_PROJECT_PASSWORD: 'project:setPassword',
    VERIFY_PROJECT_PASSWORD: 'project:verifyPassword',
    REMOVE_PROJECT_PASSWORD: 'project:removePassword',
} as const;








