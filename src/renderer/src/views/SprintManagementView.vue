<!-- Sprint 管理视图 - 苹果风格 -->
<template>
  <n-layout class="app-layout">
    <!-- 极简顶部导航 -->
    <n-layout-header class="app-header">
      <div class="header-content">
        <n-button text @click="router.push(`/project/${projectId}/board`)">
          ← 返回看板
        </n-button>
        <h1 class="app-title">Sprint 管理</h1>
      </div>
    </n-layout-header>

    <n-layout-content class="app-content">
      <div class="content-container">
        <!-- Sprint 列表区域 -->
        <div class="sprints-section">
          <div class="section-header">
            <h2 class="section-title">Sprint 列表</h2>
            <button class="btn-primary" @click="showCreateSprintDialog = true">
              + 新建 Sprint
            </button>
          </div>

          <n-spin :show="loading">
            <!-- 空状态 -->
            <div v-if="sprintStore.sprints.length === 0 && !loading" class="empty-state">
              <div class="empty-icon">🏃</div>
              <h3 class="empty-title">创建你的第一个 Sprint</h3>
              <p class="empty-description">规划迭代周期，追踪任务进度</p>
              <button class="btn-primary-large" @click="showCreateSprintDialog = true">
                + 创建 Sprint
              </button>
            </div>

            <!-- Sprint 列表 -->
            <div v-else-if="sprintStore.sprints.length > 0" class="sprints-container">
              <div
                v-for="sprint in sprintStore.sprints"
                :key="sprint.id"
                class="sprint-card"
                :class="{ 'sprint-card--active': sprint.status === 'Active' }"
              >
                <div class="sprint-card-header">
                  <div class="sprint-card-title-wrapper">
                    <h3 class="sprint-card-title">{{ sprint.name }}</h3>
                    <n-tag :type="getStatusTagType(sprint.status)" size="small">
                      {{ getStatusLabel(sprint.status) }}
                    </n-tag>
                  </div>
                  <div class="sprint-card-actions">
                    <button class="btn-icon" @click="handleEditSprint(sprint)" title="编辑">
                      ✏️
                    </button>
                    <button class="btn-icon" @click="handleDeleteSprint(sprint)" title="删除">
                      🗑️
                    </button>
                  </div>
                </div>
                <div class="sprint-card-body">
                  <div class="sprint-info">
                    <div class="info-item">
                      <span class="info-label">开始日期：</span>
                      <span class="info-value">{{ formatDate(sprint.start_date) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">结束日期：</span>
                      <span class="info-value">{{ formatDate(sprint.end_date) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">持续时间：</span>
                      <span class="info-value">{{ getDuration(sprint.start_date, sprint.end_date) }} 天</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </n-spin>
        </div>
      </div>
    </n-layout-content>

    <!-- 创建/编辑 Sprint 弹窗 -->
    <n-modal
      v-model:show="showCreateSprintDialog"
      preset="dialog"
      :title="editingSprintId ? '编辑 Sprint' : '新建 Sprint'"
      positive-text="保存"
      negative-text="取消"
      @positive-click="handleSaveSprint"
      @negative-click="showCreateSprintDialog = false"
    >
      <n-form ref="sprintFormRef" :model="sprintForm">
        <n-form-item label="Sprint 名称" path="name" :rule="{ required: true, message: '请输入 Sprint 名称' }">
          <n-input v-model:value="sprintForm.name" placeholder="例如：Sprint 1" />
        </n-form-item>
        <n-form-item label="开始日期" path="startDate" :rule="{ required: true, message: '请选择开始日期' }">
          <n-date-picker
            v-model:value="sprintForm.startDate"
            type="date"
            value-format="yyyy-MM-dd"
            placeholder="选择开始日期"
            style="width: 100%"
          />
        </n-form-item>
        <n-form-item label="结束日期" path="endDate" :rule="{ required: true, message: '请选择结束日期' }">
          <n-date-picker
            v-model:value="sprintForm.endDate"
            type="date"
            value-format="yyyy-MM-dd"
            placeholder="选择结束日期"
            style="width: 100%"
          />
        </n-form-item>
        <n-form-item label="状态">
          <n-select
            v-model:value="sprintForm.status"
            :options="[
              { label: '计划中', value: 'Planned' },
              { label: '进行中', value: 'Active' },
              { label: '已关闭', value: 'Closed' },
            ]"
          />
        </n-form-item>
      </n-form>
    </n-modal>
  </n-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  NLayout,
  NLayoutHeader,
  NLayoutContent,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSpin,
  NTag,
  NDatePicker,
  NSelect,
  useMessage,
  useDialog,
  NButton,
} from 'naive-ui';
import { useSprintStore, type Sprint } from '../stores/sprintStore';
import { useProjectStore } from '../stores/projectStore';

const router = useRouter();
const route = useRoute();
const message = useMessage();
const dialog = useDialog();

const sprintStore = useSprintStore();
const projectStore = useProjectStore();

// 从路由参数获取项目 ID
const projectId = computed(() => {
  const id = route.params.id;
  if (typeof id === 'string') {
    const parsed = parseInt(id);
    return isNaN(parsed) ? null : parsed;
  }
  return typeof id === 'number' ? id : null;
});

const loading = ref(false);
const showCreateSprintDialog = ref(false);
const editingSprintId = ref<number | null>(null);
const sprintFormRef = ref<any>(null);

const sprintForm = ref<{
  name: string;
  startDate: number | null;
  endDate: number | null;
  status: 'Planned' | 'Active' | 'Closed';
}>({
  name: '',
  startDate: null,
  endDate: null,
  status: 'Planned',
});

// 格式化日期
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

// 计算持续时间（天数）
const getDuration = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1; // +1 包含结束日期
};

// 获取状态标签类型
const getStatusTagType = (status: 'Planned' | 'Active' | 'Closed'): 'default' | 'info' | 'success' | 'warning' | 'error' => {
  switch (status) {
    case 'Planned':
      return 'default';
    case 'Active':
      return 'info';
    case 'Closed':
      return 'success';
  }
};

// 获取状态标签文本
const getStatusLabel = (status: 'Planned' | 'Active' | 'Closed'): string => {
  switch (status) {
    case 'Planned':
      return '计划中';
    case 'Active':
      return '进行中';
    case 'Closed':
      return '已关闭';
  }
};

// 编辑 Sprint
const handleEditSprint = (sprint: Sprint) => {
  editingSprintId.value = sprint.id;
  sprintForm.value = {
    name: sprint.name,
    startDate: new Date(sprint.start_date).getTime(),
    endDate: new Date(sprint.end_date).getTime(),
    status: sprint.status,
  };
  showCreateSprintDialog.value = true;
};

// 删除 Sprint
const handleDeleteSprint = (sprint: Sprint) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除 Sprint "${sprint.name}" 吗？删除后，该 Sprint 下的任务将不再关联到此 Sprint。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await sprintStore.deleteSprint(sprint.id);
        message.success('Sprint 删除成功');
        await loadSprints();
      } catch (error: any) {
        message.error(error.message || '删除 Sprint 失败');
      }
    },
  });
};

// 保存 Sprint
const handleSaveSprint = async (): Promise<boolean> => {
  try {
    // 验证表单
    await sprintFormRef.value?.validate();

    if (!sprintForm.value.name.trim()) {
      message.error('请输入 Sprint 名称');
      return false;
    }

    if (!sprintForm.value.startDate || !sprintForm.value.endDate) {
      message.error('请选择开始和结束日期');
      return false;
    }

    // 转换日期为 YYYY-MM-DD 格式
    const startDate = new Date(sprintForm.value.startDate).toISOString().split('T')[0];
    const endDate = new Date(sprintForm.value.endDate).toISOString().split('T')[0];

    // 验证日期范围
    if (startDate >= endDate) {
      message.error('结束日期必须晚于开始日期');
      return false;
    }

    if (editingSprintId.value) {
      // 更新 Sprint
      await sprintStore.updateSprint(editingSprintId.value, {
        name: sprintForm.value.name.trim(),
        startDate,
        endDate,
        status: sprintForm.value.status,
      });
      message.success('Sprint 更新成功');
    } else {
      // 创建 Sprint
      await sprintStore.createSprint(
        projectId.value,
        sprintForm.value.name.trim(),
        startDate,
        endDate,
        sprintForm.value.status
      );
      message.success('Sprint 创建成功');
    }

    // 重置表单
    sprintForm.value = {
      name: '',
      startDate: null,
      endDate: null,
      status: 'Planned',
    };
    editingSprintId.value = null;
    showCreateSprintDialog.value = false;

    // 重新加载 Sprint 列表
    await loadSprints();

    return true;
  } catch (error: any) {
    if (error.message) {
      message.error(error.message);
    }
    return false;
  }
};

// 加载 Sprint 列表
const loadSprints = async () => {
  const pid = projectId.value;
  if (!pid) {
    message.error('无效的项目ID');
    router.push('/');
    return;
  }

  loading.value = true;
  try {
    await sprintStore.loadSprints(pid);
    console.log('[SprintManagementView] Loaded sprints:', sprintStore.sprints);
  } catch (error: any) {
    console.error('[SprintManagementView] Failed to load sprints:', error);
    message.error(error.message || '加载 Sprint 列表失败');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await loadSprints();
});
</script>

<style scoped>
/* Sprint 管理视图 - 苹果风格 */

.app-layout {
  width: 100%;
  height: 100vh;
  background: #ffffff;
}

body.dark .app-layout,
html.dark .app-layout {
  background: #000000;
}

.app-header {
  height: 60px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}

body.dark .app-header,
html.dark .app-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.8);
}

.header-content {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-title {
  font-size: 20px;
  font-weight: 500;
  margin: 0;
  color: #1d1d1f;
}

body.dark .app-title,
html.dark .app-title {
  color: #f5f5f7;
}

.app-content {
  padding: 32px;
  overflow-y: auto;
}

.content-container {
  max-width: 1200px;
  margin: 0 auto;
}

.sprints-section {
  width: 100%;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: #1d1d1f;
}

body.dark .section-title,
html.dark .section-title {
  color: #f5f5f7;
}

.btn-primary {
  padding: 8px 20px;
  background: #007aff;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #0051d5;
  transform: translateY(-1px);
}

.btn-primary-large {
  padding: 12px 32px;
  background: #007aff;
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary-large:hover {
  background: #0051d5;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

.btn-icon {
  padding: 6px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.6;
}

.btn-icon:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.05);
}

body.dark .btn-icon:hover,
html.dark .btn-icon:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 24px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 24px;
}

.empty-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1d1d1f;
}

body.dark .empty-title,
html.dark .empty-title {
  color: #f5f5f7;
}

.empty-description {
  font-size: 16px;
  color: #86868b;
  margin: 0 0 32px 0;
}

body.dark .empty-description,
html.dark .empty-description {
  color: #86868b;
}

/* Sprint 卡片列表 */
.sprints-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.sprint-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

body.dark .sprint-card,
html.dark .sprint-card {
  background: #1d1d1f;
  border-color: rgba(255, 255, 255, 0.1);
}

.sprint-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

body.dark .sprint-card:hover,
html.dark .sprint-card:hover {
  box-shadow: 0 4px 16px rgba(255, 255, 255, 0.1);
}

.sprint-card--active {
  border: 2px solid #007aff;
}

.sprint-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.sprint-card-title-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.sprint-card-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #1d1d1f;
}

body.dark .sprint-card-title,
html.dark .sprint-card-title {
  color: #f5f5f7;
}

.sprint-card-actions {
  display: flex;
  gap: 8px;
}

.sprint-card-body {
  margin-top: 16px;
}

.sprint-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.info-label {
  color: #86868b;
  margin-right: 8px;
}

body.dark .info-label,
html.dark .info-label {
  color: #86868b;
}

.info-value {
  color: #1d1d1f;
  font-weight: 500;
}

body.dark .info-value,
html.dark .info-value {
  color: #f5f5f7;
}
</style>



