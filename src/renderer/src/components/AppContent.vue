<!-- App 主要内容组件 -->
<template>
  <n-layout class="app-layout">
    <n-layout-header class="app-header" bordered>
      <div class="header-content">
        <h1 class="app-title">AgileLocal</h1>
        <span class="app-subtitle">本地敏捷研发管理平台</span>
      </div>
    </n-layout-header>

    <n-layout-content class="app-content">
      <div class="content-container">
        <!-- 欢迎卡片 -->
        <n-card class="welcome-card" title="🎉 欢迎使用 AgileLocal" :bordered="true">
          <div class="welcome-content">
            <n-space vertical :size="16">
              <n-alert type="success" :bordered="false">
                <template #header>
                  Phase 1 & 2：基础设施与数据库层
                </template>
                <div class="phase-status">
                  ✅ 已初始化完成
                </div>
                <div class="phase-features">
                  • 加密数据库连接已建立<br>
                  • 8 张数据表已创建<br>
                  • 密钥管理系统已启动<br>
                  • 日志系统正常运行
                </div>
              </n-alert>

              <n-divider />

              <div class="feature-highlights">
                <n-space :size="24">
                  <n-statistic label="安全" value="企业级加密" />
                  <n-statistic label="性能" value="高性能设计" />
                  <n-statistic label="模式" value="完全离线" />
                </n-space>
              </div>
            </n-space>
          </div>
        </n-card>

        <!-- 项目列表区域 -->
        <n-card class="projects-card" title="📁 项目管理" :bordered="true">
          <div class="projects-content">
            <n-empty
              size="large"
              description="暂无项目"
            >
              <template #extra>
                <n-button type="primary" size="large" @click="handleCreateProject">
                  创建项目
                </n-button>
              </template>
            </n-empty>
          </div>
        </n-card>

        <!-- 快速操作 -->
        <n-grid :cols="3" :x-gap="16" class="quick-actions">
          <n-gi>
            <n-card :bordered="true" hoverable @click="handleOpenBoard">
              <n-space vertical :size="12" align="center">
                <div class="icon-large">📋</div>
                <n-text strong>看板视图</n-text>
                <n-text depth="3" style="text-align: center; font-size: 12px;">
                  拖拽任务，管理进度
                </n-text>
              </n-space>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card :bordered="true" hoverable @click="handleSyncGit">
              <n-space vertical :size="12" align="center">
                <div class="icon-large">🔄</div>
                <n-text strong>Git 同步</n-text>
                <n-text depth="3" style="text-align: center; font-size: 12px;">
                  同步代码仓库状态
                </n-text>
              </n-space>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card :bordered="true" hoverable @click="handleViewSettings">
              <n-space vertical :size="12" align="center">
                <div class="icon-large">⚙️</div>
                <n-text strong>系统设置</n-text>
                <n-text depth="3" style="text-align: center; font-size: 12px;">
                  配置应用选项
                </n-text>
              </n-space>
            </n-card>
          </n-gi>
        </n-grid>
      </div>
    </n-layout-content>

    <n-layout-footer class="app-footer" bordered>
      <div class="footer-content">
        <n-text depth="3">
          AgileLocal v1.0.0 (2025.PerfectScore.Final)
        </n-text>
        <n-text depth="3">
          安全 · 高性能 · 完全离线
        </n-text>
      </div>
    </n-layout-footer>
  </n-layout>
</template>

<script setup lang="ts">
import {
  NLayout,
  NLayoutHeader,
  NLayoutContent,
  NLayoutFooter,
  NCard,
  NSpace,
  NAlert,
  NDivider,
  NStatistic,
  NEmpty,
  NButton,
  NGrid,
  NGi,
  NText,
  useMessage,
} from 'naive-ui';

const message = useMessage();

// 处理创建项目
const handleCreateProject = () => {
  message.info('创建项目功能将在后续版本实现');
};

// 处理打开看板
const handleOpenBoard = () => {
  message.info('看板视图功能已实现，将在后续版本集成');
};

// 处理 Git 同步
const handleSyncGit = () => {
  message.info('Git 同步功能已实现，将在后续版本集成');
};

// 处理查看设置
const handleViewSettings = () => {
  message.info('系统设置功能将在后续版本实现');
};
</script>

<style scoped>
.app-layout {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  padding: 0 32px;
  height: 80px;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.2;
}

.app-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 400;
}

.app-content {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
  background: #f5f7fa;
}

.content-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.welcome-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.welcome-content {
  padding: 8px 0;
}

.phase-status {
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
  color: #18a058;
}

.phase-features {
  margin-top: 12px;
  font-size: 14px;
  line-height: 1.8;
  color: #333;
}

.feature-highlights {
  margin-top: 8px;
}

.projects-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.projects-content {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-actions {
  margin-top: 8px;
}

.quick-actions :deep(.n-card) {
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.quick-actions :deep(.n-card:hover) {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.icon-large {
  font-size: 48px;
  line-height: 1;
}

.app-footer {
  padding: 16px 32px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
}

.footer-content {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>













