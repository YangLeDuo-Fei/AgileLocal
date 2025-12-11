# Phase 2: 数据库层 - 完成总结

## ✅ 已生成的文件

### 1. src/main/database/schema.ts
- ✅ 包含所有 8 张表的 Kysely 接口定义
- ✅ TasksTable 包含 `version: number` 字段（乐观锁）
- ✅ 所有字段类型和约束符合文档要求

**8 张表**：
1. `ProjectsTable` - 项目表
2. `SprintsTable` - 冲刺表
3. `TasksTable` - 任务表（包含 version 字段）
4. `TaskCommentsTable` - 任务评论表
5. `GitRepositoriesTable` - Git 仓库配置表（包含 last_synced_commit_sha）
6. `GitCommitsTable` - Git 提交日志表
7. `BurndownSnapshotsTable` - 燃尽图快照表
8. `UsersTable` - 用户表（包含 role 字段）

### 2. src/main/database/connection.ts
- ✅ 使用 KeyManager 获取数据库密钥
- ✅ 注入密钥到 SQLite 数据库
- ✅ 设置 WAL 模式 (`journal_mode = WAL`)
- ✅ 创建 Kysely 实例
- ✅ 单例模式管理数据库连接

### 3. src/main/database/migrations/20251211124939_initial_schema.ts
- ✅ 使用事务封装所有 DDL 操作
- ✅ 执行 `PRAGMA foreign_keys = ON`
- ✅ 创建所有 8 张表
- ✅ TasksTable 包含 `version` 字段，默认值 1
- ✅ 创建所有外键约束（ON DELETE CASCADE/SET NULL）
- ✅ 创建复合索引 `tasks_sprint_status_order_idx`
- ✅ 创建唯一索引 `burndown_sprint_date_unique_idx`
- ✅ 包含 `down` 函数用于回滚

### 4. src/main/database/migrator.ts
- ✅ 实现 `runMigrations()` 函数
- ✅ 实现 `rollbackLastMigration()` 函数
- ✅ 使用 FileMigrationProvider
- ✅ 支持开发和生产环境路径
- ✅ 错误处理和日志记录

### 5. src/main/index.ts (已更新)
- ✅ 在应用启动时自动运行迁移
- ✅ 在应用退出时关闭数据库连接

## 📋 实现细节验证

### 数据库连接
- ✅ 密钥注入：`db.pragma(\`key='${decryptedHexKey}'\`)`
- ✅ WAL 模式：`db.pragma('journal_mode = WAL')`
- ✅ 使用 better-sqlite3-multiple-ciphers

### 迁移脚本
- ✅ 事务封装：`await db.transaction().execute(async (trx) => { ... })`
- ✅ 外键检查：`await trx.raw('PRAGMA foreign_keys = ON;').execute()`
- ✅ TasksTable version 字段：`.addColumn('version', 'integer', col => col.notNull().defaultTo(1))`
- ✅ 复合索引：`tasks_sprint_status_order_idx` on `(sprint_id, status, kanban_order)`
- ✅ 唯一索引：`burndown_sprint_date_unique_idx` on `(sprint_id, snapshot_date)`

### 外键约束
- ✅ `tasks.project_id` → `projects.id` (ON DELETE CASCADE)
- ✅ `tasks.sprint_id` → `sprints.id` (ON DELETE SET NULL)
- ✅ `sprints.project_id` → `projects.id` (ON DELETE CASCADE)
- ✅ `task_comments.task_id` → `tasks.id` (ON DELETE CASCADE)
- ✅ `task_comments.user_id` → `users.id` (ON DELETE CASCADE)
- ✅ `git_repositories.project_id` → `projects.id` (ON DELETE CASCADE)
- ✅ `git_commits.repo_id` → `git_repositories.id` (ON DELETE CASCADE)
- ✅ `git_commits.task_id` → `tasks.id` (ON DELETE SET NULL)
- ✅ `burndown_snapshots.sprint_id` → `sprints.id` (ON DELETE CASCADE)

## 🚀 如何运行迁移

### 自动运行（推荐）
迁移会在应用启动时自动运行。只需启动应用：

```powershell
npm run dev
```

应用启动时会：
1. 初始化数据库连接
2. 自动运行所有待执行的迁移
3. 记录迁移日志

### 手动运行（如果需要）
如果需要手动运行迁移，可以在代码中调用：

```typescript
import { runMigrations } from './database/migrator';

await runMigrations();
```

### 回滚迁移
如果需要回滚最后一次迁移：

```typescript
import { rollbackLastMigration } from './database/migrator';

await rollbackLastMigration();
```

## 📝 迁移文件位置

- **开发模式**: `src/main/database/migrations/`
- **生产模式**: 需要配置 electron-builder 将迁移文件打包到 `app.asar.unpacked`

## ⚠️ 注意事项

1. **原生模块编译**：如果 bcrypt 和 better-sqlite3-multiple-ciphers 尚未编译，迁移可能无法运行。需要先安装 Visual Studio Build Tools 并运行 `npm run rebuild:native`。

2. **数据库文件位置**：数据库文件存储在 `%APPDATA%/AgileLocal/agilelocal.db`

3. **密钥文件位置**：密钥文件存储在 `%APPDATA%/AgileLocal/secrets.enc`

4. **迁移状态**：Kysely 会自动管理迁移状态，在数据库中创建 `_kysely_migration` 表记录已执行的迁移。

## ✅ 验证清单

- [x] 所有 8 张表已定义
- [x] TasksTable 包含 version 字段
- [x] 所有外键约束已创建
- [x] 所有索引已创建
- [x] 迁移脚本使用事务封装
- [x] PRAGMA foreign_keys = ON 已设置
- [x] 数据库连接注入密钥
- [x] WAL 模式已启用
- [x] 迁移在应用启动时自动运行

## 🎯 下一步

Phase 2 已完成！可以继续 Phase 3: 看板核心 的开发。

