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
      addSyncLog('error', `同步失败: ${error.message || '未知错误'}`);
      message.error(error.message || '同步失败');
      return;
    }
    if (result && typeof result === 'object' && 'success' in result && result.success) {
      addSyncLog('success', '同步成功');
      message.success('同步成功');
      await loadRepositories();
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error: any) {
    addSyncLog('error', `同步失败: ${error.message || '未知错误'}`);
    message.error(error.message || '同步失败');
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
</style>







