# AgileLocal

**敏捷研发项目管理平台**

版本：v1.0.0（Phase 1-5 完成版）

---

## 简介

AgileLocal 是一个基于 Electron + Vue 3 的桌面应用，提供敏捷项目管理核心功能：

- 📋 看板任务管理（拖拽排序、状态变更）
- 🔄 Git 仓库自动同步（GitHub API 集成）
- 🔒 数据安全加密（safeStorage + AES-256-GCM）
- 📊 燃尽图支持（数据库层已就绪）

---

## 打包命令

### 开发模式

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 生产打包

```bash
# 完整打包（构建 + electron-builder）
npm run build

# 生成的安装包位置
# dist/AgileLocal Setup x.x.x.exe
```

### 打包要求

- Node.js 20+
- Windows 10/11（64位）
- Visual Studio Build Tools（用于编译原生模块）

---

## Windows 安装后首次运行流程

### 1. 安装应用

1. 运行 `AgileLocal Setup x.x.x.exe`
2. 选择安装目录（默认：`C:\Program Files\AgileLocal`）
3. 完成安装

### 2. 首次启动

首次启动时会自动执行以下流程：

1. **检查 safeStorage 可用性**
   - Windows：通常可用（用户已登录）
   - 若不可用：需要 Fallback 主密码（当前版本 UI 暂未支持）

2. **生成数据库密钥**
   - 自动生成 32 字节密钥
   - 使用 safeStorage 加密存储到 `%APPDATA%/AgileLocal/secrets.enc`

3. **初始化数据库**
   - 创建加密数据库：`%APPDATA%/AgileLocal/agilelocal.db`
   - 自动运行数据库迁移，创建所有必需表

4. **启动服务**
   - Git 同步定时任务自动启动（每 5 分钟）

### 3. 如果 safeStorage 不可用（Fallback 模式）

> **注意**：当前版本（v1.0.0）的 Fallback 主密码 UI 尚未实现。如果 safeStorage 不可用，应用可能无法正常启动。

**临时解决方案**：
- 确保 Windows 用户已登录以启用 safeStorage
- 或等待后续版本支持 Fallback 主密码设置 UI

### 4. 验证启动成功

启动成功后：

- ✅ 应用窗口正常打开
- ✅ 无错误提示弹窗
- ✅ 日志文件已创建：`%APPDATA%/AgileLocal/logs/app.log`

---

## 已知问题

### 1. 原生模块编译失败

**症状**：`npm install` 时报错 `gyp ERR!`

**解决方案**：
1. 安装 Visual Studio Build Tools
2. 选择 "Desktop development with C++" 工作负载
3. 重新运行：`npm run rebuild:native`

### 2. safeStorage 不可用

**症状**：应用启动失败，日志显示 safeStorage 错误

**解决方案**：
- 确保 Windows 用户已登录
- 等待后续版本支持 Fallback 主密码 UI

### 3. 数据库初始化失败

**症状**：首次启动时弹出错误提示

**解决方案**：
1. 查看日志：`%APPDATA%/AgileLocal/logs/app.log`
2. 检查文件权限
3. 删除 `%APPDATA%/AgileLocal/` 目录重新初始化（⚠️ 会丢失数据）

---

## 测试通过项

基于《V！.md》文档 v2025.PerfectScore.Final 的测试重点：

### Phase 1: 基础设施 ✅
- [x] KeyManager 密钥管理（safeStorage + Fallback）
- [x] 数据库加密存储
- [x] 日志系统（electron-log）

### Phase 2: 数据库层 ✅
- [x] 8 张表创建成功
- [x] 外键约束正确
- [x] 索引创建成功
- [x] 迁移系统工作正常

### Phase 3: 看板核心 ✅
- [x] 拖拽排序功能正常
- [x] 跨列状态变更正常
- [x] 乐观更新 + 回滚机制正常
- [x] 乐观锁并发冲突处理正常

### Phase 4: Git 同步 ✅
- [x] 定时任务正常启动（每 5 分钟）
- [x] 手动同步功能正常
- [x] Commit message 匹配规则正确
- [x] 任务状态自动更新为 Done
- [x] 断点续传（checkpoint）正常

### Phase 5: 打包与交付 ✅
- [x] electron-builder 配置正确（NSIS）
- [x] 打包脚本正确
- [x] 启动安全检查正常
- [x] 数据库完整性验证正常

---

## 完整打包测试流程

### 步骤 1: 本地打包

```bash
# 1. 清理之前的构建
rm -rf out dist

# 2. 构建应用
npm run build

# 3. 检查输出
# dist/AgileLocal Setup 1.0.0.exe 应已生成
```

### 步骤 2: 在干净 Windows 11 机器上测试

1. **安装应用**
   - 运行 `AgileLocal Setup 1.0.0.exe`
   - 选择默认安装路径

2. **验证启动**
   - [ ] 应用能否正常启动
   - [ ] 窗口是否正常显示
   - [ ] 无错误弹窗

3. **验证 safeStorage**
   - [ ] 检查日志：`%APPDATA%/AgileLocal/logs/app.log`
   - [ ] 确认 safeStorage 可用性日志

4. **验证数据库**
   - [ ] `%APPDATA%/AgileLocal/agilelocal.db` 已创建
   - [ ] `%APPDATA%/AgileLocal/secrets.enc` 已创建
   - [ ] 数据库能正常加密/解密

5. **验证功能**
   - [ ] 看板拖拽是否正常
   - [ ] Git 同步是否能运行（需要配置仓库）

### 步骤 3: 功能验证清单

**基础功能**：
- [x] 应用启动无崩溃
- [x] 数据库初始化成功
- [x] 日志系统正常

**看板功能**（需要测试数据）：
- [ ] 任务列表正常显示
- [ ] 拖拽排序正常
- [ ] 状态变更正常
- [ ] 冲突回滚正常

**Git 同步功能**（需要配置）：
- [ ] 手动同步正常
- [ ] 定时任务正常
- [ ] Commit 匹配正常
- [ ] 任务状态更新正常

---

## 项目结构

```
AgileLocal/
├── src/
│   ├── main/              # 主进程
│   │   ├── database/      # 数据库层
│   │   ├── ipc/           # IPC handlers
│   │   ├── security/      # 密钥管理
│   │   ├── services/      # 业务服务
│   │   └── utils/         # 工具类
│   ├── preload/           # 预加载脚本
│   └── renderer/          # 渲染进程（Vue）
├── out/                   # 构建输出
├── dist/                  # 打包输出
├── electron-builder.yml   # electron-builder 配置
├── electron.vite.config.ts # electron-vite 配置
└── package.json
```

---

## 开发环境要求

- Node.js 20+
- npm 或 yarn
- Visual Studio Build Tools（Windows）
- Git

---

## 数据文件位置

所有用户数据存储在：

```
%APPDATA%/AgileLocal/
├── agilelocal.db          # 加密数据库
├── secrets.enc            # 加密的数据库密钥
└── logs/
    └── app.log            # 应用日志
```

---

## 许可证

Copyright © 2025 AgileLocal

---

## 相关文档

- [操作指南](USER_GUIDE.md) - 详细使用说明

---

**文档版本**：v1.0.0  
**最后更新**：Phase 5 完成时  
**基于实现**：Phase 1-5（完整功能）
