// 严格按照 V！.md v2025.PerfectScore.Final 生成
// 数据库 Schema (Kysely Interfaces)

import { Generated } from 'kysely';

export interface ProjectsTable { // 项目表 (1/8)
  id: Generated<number>;
  name: string;
  description: string | null;
  created_at: string;
}

export interface SprintsTable { // 冲刺表 (2/8)
  id: Generated<number>;
  project_id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: 'Planned' | 'Active' | 'Closed';
}

export interface TasksTable { // 任务表 (3/8) - 核心表
  id: Generated<number>;
  project_id: number;
  sprint_id: number | null;
  title: string;
  status: 'ToDo' | 'Doing' | 'Done'; 
  story_points: number; 
  kanban_order: number; // 看板排序字段 (用于拖拽排序)
  version: number; // 乐观锁字段，默认值 1
  description: string | null;
  created_at: string;
  updated_at: string;
  // 索引与外键约束 (在迁移脚本中实现):
  // 1. 复合索引: (sprint_id, status, kanban_order)
  // 2. 外键: FOREIGN KEY(sprint_id) REFERENCES SprintsTable(id) ON DELETE SET NULL
  // 3. 外键: FOREIGN KEY(project_id) REFERENCES ProjectsTable(id) ON DELETE CASCADE
}

export interface TaskCommentsTable { // 任务评论 (4/8)
  id: Generated<number>;
  task_id: number;
  content: string;
  user_id: number; 
  created_at: string;
}

export interface GitRepositoriesTable { // Git 仓库配置 (5/8)
  id: Generated<number>;
  project_id: number;
  repo_url: string;
  encrypted_token_iv: string; 
  encrypted_token_content: string;
  last_synced_commit_sha: string | null; // Git Checkpoint 字段
}

export interface GitCommitsTable { // Git 提交日志 (6/8)
  id: Generated<number>;
  repo_id: number;
  commit_sha: string;
  message: string;
  task_id: number | null; // 关联的任务ID
  committed_at: string;
}

export interface BurndownSnapshotsTable { // 燃尽图快照 (7/8) - 实时性关键
  id: Generated<number>;
  sprint_id: number;
  snapshot_date: string; // 每日快照日期
  remaining_points: number; // 剩余 Story Points
  // 索引与外键约束 (在迁移脚本中实现):
  // 1. 唯一索引: (sprint_id, snapshot_date)
  // 2. 外键: FOREIGN KEY(sprint_id) REFERENCES SprintsTable(id) ON DELETE CASCADE
}

export interface UsersTable { // 用户表 (8/8)
  id: Generated<number>;
  username: string;
  email: string;
  password_hash: string; // 必须使用 bcryptjs 存储
  role: 'admin' | 'user'; // 权限字段
}

export interface DB {
  projects: ProjectsTable;
  sprints: SprintsTable;
  tasks: TasksTable;
  task_comments: TaskCommentsTable;
  git_repositories: GitRepositoriesTable;
  git_commits: GitCommitsTable;
  burndown_snapshots: BurndownSnapshotsTable;
  users: UsersTable;
}

