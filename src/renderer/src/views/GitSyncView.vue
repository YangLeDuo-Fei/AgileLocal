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

          <n-spin :show="loading">
            <n-empty v-if="repositories.length === 0" description="暂无 Git 仓库">
              <template #extra>
                <n-button type="primary" @click="showCreateRepoDialog = true">
                  添加仓库
                </n-button>
              </template>
            </n-empty>

            <n-list v-else>
              <n-list-item v-for="repo in repositories" :key="repo.id">
                <n-thing>
                  <template #header>
                    {{ repo.repo_url }}
                  </template>
                  <template #description>
                    最后同步: {{ repo.last_synced_commit_sha || '未同步' }}
                  </template>
                  <template #header-extra>
                    <n-space>
                      <n-button @click="handleSync(repo.id)">
                        手动同步
                      </n-button>
                      <n-button text type="error" @click="handleDeleteRepo(repo.id)">
                        删除
                      </n-button>
                    </n-space>
                  </template>
                </n-thing>
              </n-list-item>
            </n-list>
          </n-spin>
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
  NThing,
  NSpace,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSpin,
} from 'naive-ui';
import { useProjectStore } from '../stores/projectStore';

const router = useRouter();
const message = useMessage();
const projectStore = useProjectStore();

const repositories = ref<any[]>([]);
const loading = ref(false);
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

    if (result && typeof result === 'object' && 'success' in result && result.success) {
      message.success('仓库添加成功');
      showCreateRepoDialog.value = false;
      createRepoForm.value = { repoUrl: '', token: '' };
      await loadRepositories();
      return true;
    } else {
      const error = result as any;
      throw new Error(error.message || '添加仓库失败');
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
    if (result && typeof result === 'object' && 'success' in result && result.success) {
      repositories.value = (result as any).repositories || [];
    } else {
      throw new Error((result as any).message || '加载仓库列表失败');
    }
  } catch (error: any) {
    message.error(error.message || '加载仓库列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSync = async (repoId: number) => {
  try {
    const result = await window.electronAPI.git.sync();
    if (result && typeof result === 'object' && 'success' in result && result.success) {
      message.success('同步成功');
      await loadRepositories();
    } else {
      const error = result as any;
      throw new Error(error.message || '同步失败');
    }
  } catch (error: any) {
    message.error(error.message || '同步失败');
  }
};

const handleDeleteRepo = async (repoId: number) => {
  try {
    const result = await window.electronAPI.git.deleteRepository(repoId);
    if (result && typeof result === 'object' && 'success' in result && result.success) {
      message.success('删除成功');
      await loadRepositories();
    } else {
      const error = result as any;
      throw new Error(error.message || '删除失败');
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
