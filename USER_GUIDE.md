# AgileLocal 操作指南 & 快速上手手册

**版本**：v1.0.0（Phase 1-4 完成版）  
**最后更新**：Phase 4 完成时  
**基于实现**：Phase 1-4（基础设施、数据库、看板、Git 同步）

---

## 1. 首次运行与初始化

### 1.1 如何运行应用

1. **安装依赖**：
```bash
npm install
```

2. **如果首次安装或更新了原生模块（better-sqlite3、bcrypt），需要重新编译**：
```bash
npm run rebuild:native
```

3. **启动开发模式**：
```bash
npm run dev
```

### 1.2 首次启动会发生什么

应用启动时会自动执行以下流程：

1. **检查 safeStorage 可用性**
   - Windows：通常可用（用户已登录）
   - 若不可用：进入 Fallback 流程（见 1.3）

2. **生成数据库密钥（dbKey）**
   - 使用 `crypto.randomBytes(32)` 生成 32 字节密钥

3. **加密并存储密钥**
   - 使用 safeStorage：生成 `secrets.enc` 文件
   - 文件位置：`%APPDATA%/AgileLocal/secrets.enc`

4. **初始化数据库**
   - 创建加密数据库：`%APPDATA%/AgileLocal/agilelocal.db`
   - 自动运行数据库迁移，创建 8 张表：
     - Projects（项目）
     - Sprints（冲刺）
     - Tasks（任务）
     - TaskComments（任务评论）
     - GitRepositories（Git 仓库配置）
     - GitCommits（Git 提交记录）
     - BurndownSnapshots（燃尽图快照）
     - Users（用户）

5. **启动 Git 同步服务**
   - 定时任务每 5 分钟执行一次

### 1.3 如果 safeStorage 不可用，如何设置主密码（Fallback 流程）

如果 safeStorage 不可用，需要使用主密码（Fallback 模式）：

- **主密码要求**：至少 12 个字符
- **加密方式**：PBKDF2（sha512，100000 次迭代）+ AES-256-GCM
- **注意**：当前版本需要通过代码设置主密码，UI 流程将在后续版本支持

**临时处理方案**：确保 Windows 用户已登录以启用 safeStorage。

### 1.4 成功初始化后的提示

启动成功后，你应该看到：

- ✅ Electron 窗口正常打开（1200x800）
- ✅ 控制台日志显示：
  - `Database connection established successfully`
  - `Database initialized successfully`
  - `Task IPC handlers registered`
  - `Git IPC handlers registered`
  - `Git sync service started (runs every 5 minutes)`

**检查文件**：
- `%APPDATA%/AgileLocal/agilelocal.db` 已创建
- `%APPDATA%/AgileLocal/secrets.enc` 已创建
- `%APPDATA%/AgileLocal/logs/app.log` 已创建

---

## 2. 用户登录与注册

> **注意**：当前版本（Phase 1-4）的登录/注册 UI 尚未实现。以下步骤需要通过数据库直接操作，或等待后续版本支持。

### 2.1 如何创建第一个用户（admin 角色）

**方式 1：通过数据库工具（推荐用于测试）**

```sql
-- 密码需要使用 bcrypt 加密
-- 假设密码为 "admin123456"（bcrypt hash）
-- 可以使用在线工具生成 bcrypt hash：https://bcrypt-generator.com/

INSERT INTO users (username, email, password_hash, role)
VALUES ('admin', 'admin@example.com', '$2b$10$...', 'admin');
```

**方式 2：通过代码（等待后续版本）**

UI 创建用户功能将在后续版本中提供。

### 2.2 登录流程

UI 登录功能将在后续版本中提供。当前可以通过以下方式验证：

- 查看日志确认用户认证流程
- 数据库中的 `users` 表存储用户信息

### 2.3 密码要求

- **长度建议**：≥12 个字符
- **存储方式**：bcrypt 加密
- **角色**：`admin` 或 `user`

---

## 3. 项目与冲刺管理

> **注意**：当前版本的 UI 尚未实现。以下为数据库层面的操作说明，UI 功能将在后续版本提供。

### 3.1 创建新项目

通过数据库：

```sql
INSERT INTO projects (name, description)
VALUES ('我的项目', '项目描述');
```

### 3.2 创建冲刺（Sprint）

通过数据库：

```sql
INSERT INTO sprints (project_id, name, start_date, end_date, status)
VALUES (1, 'Sprint 1', '2024-01-01', '2024-01-14', 'Planned');
```

**状态说明**：
- `Planned`：计划中
- `Active`：进行中
- `Closed`：已关闭

### 3.3 冲刺状态切换

通过数据库更新：

```sql
-- 激活冲刺
UPDATE sprints SET status = 'Active' WHERE id = 1;

-- 关闭冲刺
UPDATE sprints SET status = 'Closed' WHERE id = 1;
```

---

## 4. 看板核心操作（重点详细说明）

看板功能已完整实现（Phase 3），包含拖拽排序和状态变更。

### 4.1 添加新任务

> **注意**：当前版本的任务添加 UI 尚未完全集成。可通过以下方式添加测试数据：

**通过数据库**：

```sql
INSERT INTO tasks (project_id, sprint_id, title, status, story_points, kanban_order, version, description)
VALUES (1, 1, '实现用户登录功能', 'ToDo', 5, 0, 1, '任务描述');
```

**字段说明**：
- `status`：`ToDo`、`Doing`、`Done`
- `story_points`：故事点数（数字）
- `kanban_order`：看板排序（从 0 开始）
- `version`：乐观锁版本号（初始为 1）

### 4.2 拖拽任务在列内排序

**操作步骤**：

1. 打开看板视图（BoardView）
2. 在同一列内拖拽任务卡片
3. **拖拽时**：
   - UI 立即更新（乐观更新）
   - 其他任务自动调整位置
   - 100ms 防抖后调用后端保存
4. **成功后**：任务 `kanban_order` 更新，UI 保持新顺序

### 4.3 拖拽任务跨列变更状态（ToDo → Doing → Done）

**操作步骤**：

1. 从源列（如 ToDo）拖拽任务到目标列（如 Doing）
2. **拖拽结束时**：
   - UI 立即更新到目标列（乐观更新）
   - 源列后续任务顺序自动调整
   - 目标列插入到目标位置
3. **后端处理**：
   - 更新任务 `status` 和 `kanban_order`
   - 调整相关任务顺序
   - 使用乐观锁检查并发冲突

### 4.4 拖拽时的实时反馈（乐观更新）

**机制说明**：

1. **拖拽结束立即更新 Pinia store**
2. **100ms 防抖后调用 IPC**（`window.electronAPI.task.updateStatus`）
3. **后端验证 version**（乐观锁）
4. **成功后更新**：`version = expectedVersion + 1`

### 4.5 如果拖拽失败或冲突会发生什么（回滚 + 提示）

**错误处理**：

1. **如果后端返回错误**（如 `409_CONFLICT`）：
   - Pinia store 自动回滚到拖拽前状态
   - UI 恢复到原始位置
   - 显示错误提示：`任务已被其他操作修改，请刷新后重试`

2. **其他错误**（网络、数据库等）：
   - 同样回滚状态
   - 显示相应错误信息

### 4.6 并发操作测试建议

**测试并发冲突**：

**方法 1：快速拖拽多个任务**
- 快速连续拖拽多个任务，观察是否出现冲突提示

**方法 2：数据库直接修改**
- 在拖拽进行时，直接更新任务的 `version`
- 预期：拖拽完成后显示冲突错误，UI 回滚

**方法 3：多窗口测试**（如果支持）
- 在两个窗口同时操作同一任务
- 预期：后操作者看到冲突提示

---

## 5. Git 仓库同步配置与使用

Git 同步功能已完整实现（Phase 4），支持自动和手动同步。

### 5.1 如何添加一个 Git 仓库（repo URL + Personal Access Token）

**步骤**：

1. **获取 GitHub Personal Access Token**
   - 访问：Settings → Developer settings → Personal access tokens → Tokens (classic)
   - 生成新 token，勾选 `repo` 权限

2. **加密存储 Token**（通过代码或数据库工具）

**使用代码加密**（在主进程中）：

```typescript
import { safeStorage } from 'electron';

const token = 'your_github_token';
const encrypted = safeStorage.encryptString(token);
const encryptedHex = encrypted.toString('hex');

// 存储到数据库
await db.insertInto('git_repositories').values({
    project_id: 1,
    repo_url: 'https://github.com/owner/repo',
    encrypted_token_content: encryptedHex,
    encrypted_token_iv: '', // safeStorage 不需要 IV
    last_synced_commit_sha: null,
}).execute();
```

### 5.2 Token 如何安全加密存储

**加密方式**：

- **优先使用 Electron safeStorage**（Windows 用户凭据加密）
- **Fallback**：AES-256-GCM + PBKDF2（需要主密码，当前版本暂不支持）

**存储位置**：
- 数据库表：`git_repositories`
- 字段：`encrypted_token_content`（加密内容）、`encrypted_token_iv`（IV，safeStorage 为空）

### 5.3 自动同步机制（每 5 分钟一次）

**说明**：

1. **应用启动时自动启动定时任务**
2. **Cron 表达式**：`*/5 * * * *`（每 5 分钟）
3. **同步流程**：
   - 遍历所有配置的 Git 仓库
   - 解密 Token
   - 调用 GitHub API 获取新提交
   - 使用断点续传（基于 `last_synced_commit_sha`）
   - 匹配任务 ID 并更新任务状态

### 5.4 手动触发同步的方法

**方式 1：通过 DevTools Console**

```javascript
// 打开 DevTools (F12)，在 Console 中执行：
const result = await window.electronAPI.git.sync();
console.log('Sync result:', result);
```

**方式 2：菜单按钮**（UI 功能将在后续版本提供）

### 5.5 Commit Message 匹配规则

**支持的正则模式**：

- `#task-123` → 匹配任务 ID 123
- `#task_123` → 匹配任务 ID 123
- `fix #123` → 匹配任务 ID 123
- `resolves #123` → 匹配任务 ID 123

**正则表达式**：
```javascript
/#task[-_]?(\d+)|fix\s*#(\d+)|resolves\s*#(\d+)/i
```

**示例 Commit Message**：
```
fix #42: 修复登录问题
完成 #task-15 的功能实现
resolves #100
```

### 5.6 同步成功后任务状态如何自动变为 Done

**流程**：

1. **同步服务解析 commit message**
2. **如果匹配到任务 ID 且任务存在**：
   - 自动将任务状态更新为 `Done`
   - 记录关联的 commit SHA
3. **数据库记录**：
   - `tasks.status` → `Done`
   - `git_commits` 表插入新记录
   - `git_repositories.last_synced_commit_sha` 更新

### 5.7 如何查看同步日志

**日志文件位置**：

```
%APPDATA%/AgileLocal/logs/app.log
```

**查看日志**：

PowerShell：
```powershell
Get-Content "$env:APPDATA\AgileLocal\logs\app.log" -Tail 50
```

**关键日志关键词**：
- `Starting Git repositories sync...`
- `Found X new commit(s) for repository...`
- `Task X status updated to Done (from commit...)`
- `Updated last_synced_commit_sha to...`

---

## 6. 备份与恢复

> **状态**：当前版本（Phase 1-4）尚未实现备份/恢复功能。

**计划**：

- 备份/恢复功能将在后续版本中实现
- 预计包含：
  - 数据库备份（加密）
  - 配置备份（Git 仓库配置等）
  - 一键恢复功能

**临时方案**：

**手动备份**：
- 复制 `%APPDATA%/AgileLocal/` 目录
- 包括 `agilelocal.db`、`secrets.enc`、`logs/`

---

## 7. 常见问题与排查

### 7.1 数据库无法解密怎么办

**症状**：
- 应用启动失败
- 日志显示：`Failed to establish database connection`

**排查步骤**：

1. **检查 `secrets.enc` 是否存在**：
   ```powershell
   Test-Path "$env:APPDATA\AgileLocal\secrets.enc"
   ```

2. **检查 safeStorage 是否可用**：
   - Windows：通常可用（需要用户已登录）
   - 若不可用：需要实现主密码 Fallback 流程

3. **解决方案**：
   - 删除 `secrets.enc` 和 `agilelocal.db`，重新初始化
   - ⚠️ **注意**：会丢失所有数据

### 7.2 拖拽卡顿或不响应

**排查步骤**：

1. **打开 DevTools（F12），查看 Console 错误**
2. **检查 IPC 调用是否成功**：
   ```javascript
   // 测试 IPC 连接
   console.log(window.electronAPI);
   ```
3. **检查 Pinia store 是否正常**：
   ```javascript
   // 在 Vue DevTools 中查看 taskStore.tasks
   ```
4. **常见原因**：
   - 任务数据未加载（`taskStore.tasks` 为空）
   - IPC handler 未注册
   - 网络延迟导致防抖未触发

### 7.3 Git 同步失败

**排查步骤**：

1. **查看日志文件**：
   ```powershell
   Get-Content "$env:APPDATA\AgileLocal\logs\app.log" | Select-String -Pattern "Git|sync|error" -Context 3
   ```

2. **常见错误**：

   **错误：`Failed to decrypt Git token`**
   - 原因：Token 解密失败
   - 解决：检查 `encrypted_token_content` 和 `encrypted_token_iv` 是否正确

   **错误：`503_NETWORK_TIMEOUT`**
   - 原因：GitHub API 请求失败
   - 解决：检查网络连接、Token 权限、仓库 URL

   **错误：`Invalid GitHub repository URL format`**
   - 原因：URL 格式不正确
   - 解决：使用 `https://github.com/owner/repo` 格式

3. **手动测试同步**：
   ```javascript
   // 在 DevTools Console 中
   const result = await window.electronAPI.git.sync();
   console.log(result);
   ```

### 7.4 日志文件位置

所有日志存储在：

```
%APPDATA%/AgileLocal/logs/app.log
```

**查看方式**：

**实时查看**：
```powershell
Get-Content "$env:APPDATA\AgileLocal\logs\app.log" -Wait -Tail 20
```

**搜索错误**：
```powershell
Get-Content "$env:APPDATA\AgileLocal\logs\app.log" | Select-String -Pattern "error|Error|ERROR" -Context 5
```

---

## 8. 下一步：打包成安装程序

当前版本为开发版本（`npm run dev`）。生产版本打包将在 Phase 5 实现。

### 8.1 Phase 5 将生成 Windows .exe 安装包

**预计功能**：

- 使用 `electron-builder` 打包
- 生成 Windows `.exe` 安装程序
- 自动更新支持（可选）
- 安装包签名（可选）

**打包命令**（待实现）：
```bash
npm run build
```

### 8.2 打包后首次运行流程相同

打包后的应用首次运行流程与开发版本相同：

1. 检查 safeStorage
2. 生成并加密存储 dbKey
3. 初始化数据库
4. 启动定时任务

**用户数据位置**：
- 开发模式：`%APPDATA%/AgileLocal/`
- 打包后：相同位置

---

## 附录：快速参考

### 数据文件位置

```
%APPDATA%/AgileLocal/
├── agilelocal.db          # 加密数据库
├── secrets.enc            # 加密的数据库密钥
└── logs/
    └── app.log            # 应用日志
```

### 关键 IPC 方法

```javascript
// 任务状态更新
window.electronAPI.task.updateStatus(taskId, newStatus, newOrder, expectedVersion)

// Git 同步
window.electronAPI.git.sync()
```

### 数据库关键字段

- `tasks.version`：乐观锁版本号
- `tasks.kanban_order`：看板排序
- `git_repositories.last_synced_commit_sha`：Git 同步断点

---

**文档版本**：v1.0.0  
**最后更新**：Phase 4 完成时  
**基于实现**：Phase 1-4（基础设施、数据库、看板、Git 同步）

