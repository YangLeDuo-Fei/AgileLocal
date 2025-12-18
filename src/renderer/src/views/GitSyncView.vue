<!-- Git 同步视图 -->
<template>
  <n-layout class="app-layout">
    <n-layout-header class="app-header" bordered>
      <div class="header-content">
        <n-button text @click="router.push('/')">
          ← 返回首页
        </n-button>
        <h1 class="app-title">Git 同步配置</h1>
      </div>
    </n-layout-header>

    <n-layout-content class="app-content">
      <div class="content-container">
        <n-card title="Git 仓库管理" :bordered="true">
          <template #header-extra>
            <n-button type="primary" @click="showCreateRepoDialog = true">
              添加仓库
            </n-button>
          </template>

          <n-spin :show="loading || syncing">
            <n-empty v-if="repositories.length === 0" description="暂无 Git 仓库">
              <template #extra>
                <n-button type="primary" @click="showCreateRepoDialog = true">
                  添加仓库
                </n-button>
              </template>
            </n-empty>

            <n-list v-else>
              <n-list-item v-for="repo in repositories" :key="repo.id">
                <n-card :bordered="true" style="margin-bottom: 16px;">
                  <template #header>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <n-text strong>{{ repo.repo_url }}</n-text>
                      <n-tag :type="getSyncStatusType(repo)" size="small">
                        {{ getSyncStatusText(repo) }}
                      </n-tag>
                    </div>
                  </template>
                  <n-space vertical :size="12">
                    <div>
                      <n-text depth="3" style="font-size: 12px;">最后同步:</n-text>
                      <n-text style="margin-left: 8px; font-size: 12px;">
                        {{ repo.last_synced_commit_sha ? formatCommitSha(repo.last_synced_commit_sha) : '未同步' }}
                      </n-text>
                    </div>
                    <n-space>
                      <n-button 
                        type="primary" 
                        :loading="syncing && syncingRepoId === repo.id"
                        @click="handleSync(repo.id)"
                        :disabled="syncing"
                      >
                        {{ syncing && syncingRepoId === repo.id ? '同步中...' : '手动同步' }}
                      </n-button>
                      <n-button text type="error" @click="handleDeleteRepo(repo.id)" :disabled="syncing">
                        删除
                      </n-button>
                    </n-space>
                  </n-space>
                </n-card>
              </n-list-item>
            </n-list>
          </n-spin>
        </n-card>

        <!-- 最近关闭的任务 -->
        <n-card title="最近关闭的任务" :bordered="true" style="margin-top: 24px;">
          <n-spin :show="loadingClosedTasks">
            <n-list v-if="recentlyClosedTasks.length > 0">
              <n-list-item v-for="item in recentlyClosedTasks" :key="item.commit_id">
                <div class="closed-task-item">
                  <div class="closed-task-header">
                    <n-text strong class="closed-task-title">任务 #{{ item.task_id }}: {{ item.task_title }}</n-text>
                    <n-tag size="small" type="success">已关闭</n-tag>
                  </div>
                  <div class="closed-task-details">
                    <n-text depth="3" style="font-size: 12px;">
                      {{ formatCommitMessage(item.commit_message) }}
                    </n-text>
                  </div>
                  <div class="closed-task-footer">
                    <n-text depth="3" style="font-size: 11px;">
                      提交：{{ formatCommitSha(item.commit_sha) }} · {{ formatCommitTime(item.committed_at) }}
                      <span v-if="item.repo_url"> · {{ item.repo_url }}</span>
                    </n-text>
                  </div>
                </div>
              </n-list-item>
            </n-list>
            <n-empty v-else description="暂无关闭的任务" size="small" />
          </n-spin>
        </n-card>

        <!-- 提交历史 -->
        <n-card title="提交历史" :bordered="true" style="margin-top: 24px;">
          <n-spin :show="loadingCommits">
            <n-list v-if="commitHistory.length > 0">
              <n-list-item v-for="commit in commitHistory" :key="commit.id">
                <div class="commit-item">
                  <div class="commit-header">
                    <n-text strong class="commit-message">{{ formatCommitMessage(commit.message) }}</n-text>
                    <n-tag v-if="commit.task_id" size="small" type="info">任务 #{{ commit.task_id }}</n-tag>
                  </div>
                  <div class="commit-footer">
                    <n-text depth="3" style="font-size: 11px;">
                      {{ formatCommitSha(commit.commit_sha) }} · {{ formatCommitTime(commit.committed_at) }}
                      <span v-if="commit.repo_url"> · {{ commit.repo_url }}</span>
                    </n-text>
                  </div>
                </div>
              </n-list-item>
            </n-list>
            <n-empty v-else description="暂无提交记录" size="small" />
          </n-spin>
        </n-card>

        <!-- 同步日志 -->
        <n-card title="同步日志" :bordered="true" style="margin-top: 24px;">
          <n-space vertical :size="12">
            <n-timeline v-if="syncLogs.length > 0">
              <n-timeline-item
                v-for="(log, index) in syncLogs"
                :key="index"
                :type="log.type"
                :time="formatTime(log.time)"
              >
                <n-text>{{ log.message }}</n-text>
              </n-timeline-item>
            </n-timeline>
            <n-empty v-else description="暂无同步日志" size="small" />
          </n-space>
        </n-card>
      </div>
    </n-layout-content>

    <!-- 添加仓库对话框 -->
    <n-modal v-model:show="showCreateRepoDialog" preset="dialog" title="添加 Git 仓库" positive-text="添加" @positive-click="handleCreateRepo">
      <n-form :model="createRepoForm">
        <n-form-item label="仓库 URL">
          <n-input v-model:value="createRepoForm.repoUrl" placeholder="https://github.com/owner/repo" />
        </n-form-item>
        <n-form-item label="Token">
          <n-input v-model:value="createRepoForm.token" type="password" placeholder="GitHub Personal Access Token" show-password-on="click" />
        </n-form-item>
      </n-form>
    </n-modal>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import {
  NLayout,
  NLayoutHeader,
  NLayoutContent,
  NCard,
  NButton,
  NEmpty,
  NList,
  NListItem,
  NText,
  NTag,
  NSpace,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSpin,
  NTimeline,
  NTimelineItem,
} from 'naive-ui';
import { useProjectStore } from '../stores/projectStore';

const router = useRouter();
const message = useMessage();
const projectStore = useProjectStore();

const repositories = ref<any[]>([]);
const loading = ref(false);
const syncing = ref(false);
const syncingRepoId = ref<number | null>(null);
const syncLogs = ref<Array<{ type: 'default' | 'success' | 'error' | 'warning'; message: string; time: Date }>>([]);
const showCreateRepoDialog = ref(false);
const createRepoForm = ref({
  repoUrl: '',
  token: '',
});

// 最近关闭的任务
const recentlyClosedTasks = ref<any[]>([]);
const loadingClosedTasks = ref(false);

// 提交历史
const commitHistory = ref<any[]>([]);
const loadingCommits = ref(false);

const handleCreateRepo = async () => {
  if (!createRepoForm.value.repoUrl.trim() || !createRepoForm.value.token.trim()) {
    message.error('请填写仓库 URL 和 Token');
    return false;
  }

  if (!projectStore.currentProjectId) {
    message.error('请先选择一个项目');
    return false;
  }

  try {
    const result = await window.electronAPI.git.createRepository(
      projectStore.currentProjectId,
      createRepoForm.value.repoUrl.trim(),
      createRepoForm.value.token.trim()
    );

    if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
      const error = result as any;
      throw new Error(error.message || '添加仓库失败');
    }
    if (result && typeof result === 'object' && 'success' in result && result.success) {
      message.success('仓库添加成功');
      showCreateRepoDialog.value = false;
      createRepoForm.value = { repoUrl: '', token: '' };
      await loadRepositories();
      return true;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error: any) {
    message.error(error.message || '添加仓库失败');
    return false;
  }
};

const loadRepositories = async () => {
  if (!projectStore.currentProjectId) {
    return;
  }

  loading.value = true;
  try {
    const result = await window.electronAPI.git.getRepositories(projectStore.currentProjectId);
    if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
      const error = result as any;
      throw new Error(error.message || '加载仓库列表失败');
    }
    if (result && typeof result === 'object' && 'success' in result && result.success) {
      repositories.value = (result as any).repositories || [];
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error: any) {
    message.error(error.message || '加载仓库列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSync = async (repoId: number) => {
  syncing.value = true;
  syncingRepoId.value = repoId;
  addSyncLog('default', `开始同步仓库 ${repositories.value.find(r => r.id === repoId)?.repo_url || ''}...`);
  
  try {
    const result = await window.electronAPI.git.sync();
    if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
      const error = result as any;
      // 显示详细错误信息（包括完整错误对象）
      const errorDetails = error.details || error.stack || error.message || JSON.stringify(error);
      addSyncLog('error', `同步失败: ${errorDetails}`);
      message.error(`同步失败: ${error.message || '未知错误'}`, { duration: 5000 });
      return;
    }
    if (result && typeof result === 'object' && 'success' in result && result.success) {
      addSyncLog('success', '同步成功');
      message.success('同步成功');
      await loadRepositories();
      // 同步成功后重新加载提交历史和关闭的任务
      await loadCommitHistory();
      await loadRecentlyClosedTasks();
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error: any) {
    // 显示详细错误信息
    const errorDetails = error.stack || error.message || String(error);
    addSyncLog('error', `同步失败: ${errorDetails}`);
    message.error(`同步失败: ${error.message || '未知错误'}`, { duration: 5000 });
  } finally {
    syncing.value = false;
    syncingRepoId.value = null;
  }
};

const addSyncLog = (type: 'default' | 'success' | 'error' | 'warning', message: string) => {
  syncLogs.value.unshift({
    type,
    message,
    time: new Date(),
  });
  // 只保留最近 50 条日志
  if (syncLogs.value.length > 50) {
    syncLogs.value = syncLogs.value.slice(0, 50);
  }
};

const getSyncStatusType = (repo: any): 'default' | 'success' | 'error' | 'warning' => {
  if (!repo.last_synced_commit_sha) return 'default';
  // 可以根据需要添加更复杂的逻辑来判断同步状态
  return 'success';
};

const getSyncStatusText = (repo: any): string => {
  if (!repo.last_synced_commit_sha) return '未同步';
  return '已同步';
};

const formatCommitSha = (sha: string): string => {
  return sha.substring(0, 7);
};

const formatTime = (time: Date): string => {
  const now = new Date();
  const diff = now.getTime() - time.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (seconds < 60) return `${seconds}秒前`;
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return time.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// 格式化提交消息（取第一行）
const formatCommitMessage = (message: string): string => {
  return message.split('\n')[0].trim();
};

// 格式化提交时间
const formatCommitTime = (timeStr: string): string => {
  const time = new Date(timeStr);
  const now = new Date();
  const diff = now.getTime() - time.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return `${seconds}秒前`;
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return time.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: time.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
};

// 加载最近关闭的任务
const loadRecentlyClosedTasks = async () => {
  if (!projectStore.currentProjectId) return;

  loadingClosedTasks.value = true;
  try {
    const result = await window.electronAPI.git.getRecentlyClosedTasks(projectStore.currentProjectId, 20);
    if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
      const error = result as any;
      throw new Error(error.message || '加载失败');
    }
    if (result && typeof result === 'object' && 'success' in result && result.success) {
      recentlyClosedTasks.value = (result as any).closedTasks || [];
    }
  } catch (error: any) {
    console.error('Failed to load recently closed tasks:', error);
  } finally {
    loadingClosedTasks.value = false;
  }
};

// 加载提交历史
const loadCommitHistory = async () => {
  if (!projectStore.currentProjectId) return;

  loadingCommits.value = true;
  try {
    const result = await window.electronAPI.git.getCommitsByProject(projectStore.currentProjectId, 50);
    if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
      const error = result as any;
      throw new Error(error.message || '加载失败');
    }
    if (result && typeof result === 'object' && 'success' in result && result.success) {
      commitHistory.value = (result as any).commits || [];
    }
  } catch (error: any) {
    console.error('Failed to load commit history:', error);
  } finally {
    loadingCommits.value = false;
  }
};

const handleDeleteRepo = async (repoId: number) => {
  try {
    const result = await window.electronAPI.git.deleteRepository(repoId);
    if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
      const error = result as any;
      throw new Error(error.message || '删除失败');
    }
    if (result && typeof result === 'object' && 'success' in result && result.success) {
      message.success('删除成功');
      await loadRepositories();
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error: any) {
    message.error(error.message || '删除失败');
  }
};

onMounted(async () => {
  // 如果没有当前项目，跳转到首页
  if (!projectStore.currentProjectId) {
    const projects = projectStore.projects;
    if (projects.length > 0) {
      projectStore.setCurrentProject(projects[0].id);
    } else {
      router.push('/');
      return;
    }
  }
  await loadRepositories();
  await loadCommitHistory();
  await loadRecentlyClosedTasks();
});
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
  align-items: center;
  gap: 16px;
}

.app-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.2;
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
}

/* 关闭的任务项样式 */
.closed-task-item {
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

body.dark .closed-task-item,
html.dark .closed-task-item {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.closed-task-item:last-child {
  border-bottom: none;
}

.closed-task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.closed-task-title {
  font-size: 14px;
  font-weight: 600;
}

.closed-task-details {
  margin-bottom: 6px;
}

.closed-task-footer {
  display: flex;
  align-items: center;
}

/* 提交项样式 */
.commit-item {
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

body.dark .commit-item,
html.dark .commit-item {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.commit-item:last-child {
  border-bottom: none;
}

.commit-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.commit-message {
  font-size: 14px;
  flex: 1;
}

.commit-footer {
  display: flex;
  align-items: center;
}
</style>













