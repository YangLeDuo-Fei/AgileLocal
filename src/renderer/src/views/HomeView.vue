<!-- 首页视图 - 苹果风格 -->
<template>
  <n-layout class="app-layout">
    <!-- 极简顶部导航 -->
    <n-layout-header class="app-header">
      <div class="header-content">
        <h1 class="app-title">AgileLocal</h1>
        <button 
          class="theme-toggle"
          @click="systemStore.toggleTheme()"
          :title="systemStore.isDark ? '切换到浅色模式' : '切换到深色模式'"
        >
          {{ systemStore.isDark ? '☀️' : '🌙' }}
        </button>
      </div>
    </n-layout-header>

    <n-layout-content class="app-content">
      <div class="content-container">
        <!-- 项目列表区域 - 苹果风格 -->
        <div class="projects-section">
          <div class="section-header">
            <h2 class="section-title">项目</h2>
            <button class="btn-primary" @click="showCreateProjectDialog = true">
              + 新建项目
            </button>
          </div>

          <!-- 搜索框 -->
          <div v-if="projectStore.projects.length > 0" class="search-container">
            <n-input
              v-model:value="searchQuery"
              placeholder="搜索项目名称或描述"
              clearable
              class="search-input"
            >
              <template #prefix>
                <span class="search-icon">🔍</span>
              </template>
            </n-input>
            <div v-if="searchQuery" class="search-result-count">
              找到 {{ filteredProjects.length }} 个项目
            </div>
          </div>

          <n-spin :show="projectStore.loading">
            <!-- 空状态（无项目） -->
            <div v-if="projectStore.projects.length === 0 && !projectStore.loading" class="empty-state">
              <div class="empty-icon">📁</div>
              <h3 class="empty-title">创建你的第一个项目</h3>
              <p class="empty-description">开始管理任务，追踪进度</p>
              <button class="btn-primary-large" @click="showCreateProjectDialog = true">
                + 创建项目
              </button>
            </div>

            <!-- 搜索无结果状态 -->
            <div v-else-if="filteredProjects.length === 0 && searchQuery && !projectStore.loading" class="empty-state">
              <div class="empty-icon">🔍</div>
              <h3 class="empty-title">未找到匹配的项目</h3>
              <p class="empty-description">尝试使用其他关键词搜索</p>
              <button class="btn-primary-large" @click="searchQuery = ''">
                清空搜索
              </button>
            </div>

            <!-- 项目列表（不分页，简单显示） -->
            <div v-else-if="!shouldUsePagination && filteredProjects.length > 0" class="projects-container">
              <div class="projects-grid">
                <div
                  v-for="project in filteredProjects"
                  :key="project.id"
                  class="project-card"
                  @click="handleOpenProject(project.id)"
                >
                  <div class="project-header">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <h3 class="project-name">{{ project.name }}</h3>
                      <span v-if="project.has_password" class="project-lock-icon" title="此项目受密码保护">
                        🔒
                      </span>
                    </div>
                    <button 
                      class="btn-delete"
                      @click.stop="handleDeleteProject(project.id)"
                      title="删除项目"
                    >
                      ×
                    </button>
                  </div>
                  <p class="project-description">
                    {{ project.description || '无描述' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- 项目列表（分组显示 - 分页模式） -->
            <div v-else-if="shouldUsePagination && filteredProjects.length > 0" class="projects-container">
              <!-- 如果项目数量 > 50，使用分页 -->
              <template v-if="shouldUsePagination">
                <!-- 分组折叠面板 -->
                <n-collapse 
                  v-model:expanded-names="collapsedKeys" 
                  class="projects-collapse"
                  :default-expanded-names="['today', 'thisWeek']"
                >
                  <n-collapse-item
                    v-for="group in displayGroupedProjects"
                    :key="group.key"
                    :name="group.key"
                    class="project-group-item"
                  >
                    <template #header>
                      <div class="group-header">
                        <span class="group-title">{{ group.label }}</span>
                        <span class="group-count">({{ group.projects.length }})</span>
                      </div>
                    </template>
                    <div class="projects-grid">
                      <div
                        v-for="project in group.projects"
                        :key="project.id"
                        class="project-card"
                        @click="handleOpenProject(project.id)"
                      >
                        <div class="project-header">
                          <div style="display: flex; align-items: center; gap: 8px;">
                            <h3 class="project-name">{{ project.name }}</h3>
                            <span v-if="project.has_password" class="project-lock-icon" title="此项目受密码保护">
                              🔒
                            </span>
                          </div>
                          <button 
                            class="btn-delete"
                            @click.stop="handleDeleteProject(project.id)"
                            title="删除项目"
                          >
                            ×
                          </button>
                        </div>
                        <p class="project-description">
                          {{ project.description || '无描述' }}
                        </p>
                      </div>
                    </div>
                  </n-collapse-item>
                </n-collapse>
                
                <!-- 分页控件 -->
                <div class="pagination-container">
                  <n-pagination
                    v-model:page="currentPage"
                    :page-count="totalPages"
                    v-model:page-size="pageSize"
                    :item-count="filteredProjects.length"
                    show-size-picker
                    show-quick-jumper
                    :page-sizes="[20, 30, 50, 100]"
                  />
                </div>
              </template>
              
              <!-- 如果项目数量 <= 50，不使用分页，直接分组显示 -->
              <template v-else>
                <n-collapse 
                  v-model:expanded-names="collapsedKeys" 
                  class="projects-collapse"
                  :default-expanded-names="['today', 'thisWeek']"
                >
                  <n-collapse-item
                    v-for="group in groupedProjects"
                    :key="group.key"
                    :name="group.key"
                    class="project-group-item"
                  >
                    <template #header>
                      <div class="group-header">
                        <span class="group-title">{{ group.label }}</span>
                        <span class="group-count">({{ group.projects.length }})</span>
                      </div>
                    </template>
                    <div class="projects-grid">
                      <div
                        v-for="project in group.projects"
                        :key="project.id"
                        class="project-card"
                        @click="handleOpenProject(project.id)"
                      >
                        <div class="project-header">
                          <div style="display: flex; align-items: center; gap: 8px;">
                            <h3 class="project-name">{{ project.name }}</h3>
                            <span v-if="project.has_password" class="project-lock-icon" title="此项目受密码保护">
                              🔒
                            </span>
                          </div>
                          <button 
                            class="btn-delete"
                            @click.stop="handleDeleteProject(project.id)"
                            title="删除项目"
                          >
                            ×
                          </button>
                        </div>
                        <p class="project-description">
                          {{ project.description || '无描述' }}
                        </p>
                      </div>
                    </div>
                  </n-collapse-item>
                </n-collapse>
              </template>
            </div>
          </n-spin>
        </div>

        <!-- 快速操作 - 苹果风格 -->
        <div class="quick-actions-section">
          <h2 class="section-title">快捷操作</h2>
          <div class="actions-grid">
            <button class="action-card" @click="handleOpenBoard">
              <div class="action-icon">📋</div>
              <div class="action-title">看板视图</div>
              <div class="action-description">拖拽任务，管理进度</div>
            </button>
            <button class="action-card" @click="handleSyncGit">
              <div class="action-icon">🔄</div>
              <div class="action-title">Git 同步</div>
              <div class="action-description">同步代码仓库状态</div>
            </button>
            <button class="action-card" @click="handleViewStatistics">
              <div class="action-icon">📊</div>
              <div class="action-title">统计分析</div>
              <div class="action-description">查看项目统计</div>
            </button>
            <button class="action-card" @click="handleViewSettings">
              <div class="action-icon">⚙️</div>
              <div class="action-title">系统设置</div>
              <div class="action-description">配置应用选项</div>
            </button>
          </div>
        </div>
      </div>
    </n-layout-content>

    <!-- 创建项目对话框 - 苹果风格 -->
    <n-modal 
      v-model:show="showCreateProjectDialog" 
      preset="dialog" 
      title="新建项目" 
      positive-text="创建" 
      :style="{ borderRadius: '16px' }"
      @positive-click="handleCreateProject"
    >
      <n-form ref="formRef" :model="createProjectForm" :rules="createProjectRules">
        <n-form-item path="name" label="项目名称">
          <n-input 
            v-model:value="createProjectForm.name" 
            placeholder="输入项目名称"
            :style="{ borderRadius: '12px' }"
          />
        </n-form-item>
        <n-form-item path="description" label="项目描述（可选）">
          <n-input
            v-model:value="createProjectForm.description"
            type="textarea"
            placeholder="输入项目描述"
            :rows="3"
            :style="{ borderRadius: '12px' }"
          />
        </n-form-item>
      </n-form>
    </n-modal>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import {
  NLayout,
  NLayoutHeader,
  NLayoutContent,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSpin,
  NCollapse,
  NCollapseItem,
  NPagination,
} from 'naive-ui';
import { useProjectStore } from '../stores/projectStore';
import { useSystemStore } from '../stores/systemStore';
import ProjectPasswordVerifyModal from '../components/ProjectPasswordVerifyModal.vue';

const router = useRouter();
const message = useMessage();
const projectStore = useProjectStore();
const systemStore = useSystemStore();

// 搜索功能
const searchQuery = ref('');

// 过滤后的项目列表
const filteredProjects = computed(() => {
  if (!searchQuery.value.trim()) {
    return projectStore.projects;
  }
  
  const query = searchQuery.value.trim().toLowerCase();
  return projectStore.projects.filter(project => {
    const nameMatch = project.name.toLowerCase().includes(query);
    const descMatch = project.description?.toLowerCase().includes(query) || false;
    return nameMatch || descMatch;
  });
});

// 项目分组类型
type ProjectGroup = 'today' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'earlier';

interface GroupedProjects {
  key: ProjectGroup;
  label: string;
  projects: typeof projectStore.projects;
}

// 获取项目所属的分组
const getProjectGroup = (createdAt: string): ProjectGroup => {
  const now = new Date();
  const created = new Date(createdAt);
  
  // 今天
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (created >= todayStart) {
    return 'today';
  }
  
  // 本周（从本周一开始）
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1));
  if (created >= weekStart) {
    return 'thisWeek';
  }
  
  // 上周
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  if (created >= lastWeekStart) {
    return 'lastWeek';
  }
  
  // 本月
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  if (created >= monthStart) {
    return 'thisMonth';
  }
  
  // 更早
  return 'earlier';
};

// 分组后的项目列表
const groupedProjects = computed((): GroupedProjects[] => {
  const groups: Record<ProjectGroup, typeof projectStore.projects> = {
    today: [],
    thisWeek: [],
    lastWeek: [],
    thisMonth: [],
    earlier: [],
  };
  
  filteredProjects.value.forEach(project => {
    const group = getProjectGroup(project.created_at);
    groups[group].push(project);
  });
  
  const groupLabels: Record<ProjectGroup, string> = {
    today: '今天',
    thisWeek: '本周',
    lastWeek: '上周',
    thisMonth: '本月',
    earlier: '更早',
  };
  
  // 只返回有项目的分组，并按照顺序排列
  const result: GroupedProjects[] = [];
  const order: ProjectGroup[] = ['today', 'thisWeek', 'lastWeek', 'thisMonth', 'earlier'];
  
  order.forEach(key => {
    if (groups[key].length > 0) {
      result.push({
        key,
        label: groupLabels[key],
        projects: groups[key],
      });
    }
  });
  
  return result;
});

// 分页功能
const pageSize = ref(30); // 每页显示30个项目（可调整）
const currentPage = ref(1);

// 当前页的项目列表（如果项目数量 <= 50，不使用分页，直接显示所有项目）
const shouldUsePagination = computed(() => filteredProjects.value.length > 50);

// 用于显示的分组项目（如果使用分页，则基于分页后的项目；否则基于所有过滤后的项目）
const displayGroupedProjects = computed((): GroupedProjects[] => {
  // 如果不需要分页，直接返回所有分组
  if (!shouldUsePagination.value) {
    return groupedProjects.value;
  }
  
  // 需要分页时：先对所有过滤后的项目按创建时间倒序排序，然后分页，再分组
  const sortedProjects = [...filteredProjects.value].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  const paginatedProjects = sortedProjects.slice(start, end);
  
  // 对分页后的项目进行分组
  const groups: Record<ProjectGroup, typeof projectStore.projects> = {
    today: [],
    thisWeek: [],
    lastWeek: [],
    thisMonth: [],
    earlier: [],
  };
  
  paginatedProjects.forEach(project => {
    const group = getProjectGroup(project.created_at);
    groups[group].push(project);
  });
  
  const groupLabels: Record<ProjectGroup, string> = {
    today: '今天',
    thisWeek: '本周',
    lastWeek: '上周',
    thisMonth: '本月',
    earlier: '更早',
  };
  
  const result: GroupedProjects[] = [];
  const order: ProjectGroup[] = ['today', 'thisWeek', 'lastWeek', 'thisMonth', 'earlier'];
  
  order.forEach(key => {
    if (groups[key].length > 0) {
      result.push({
        key,
        label: groupLabels[key],
        projects: groups[key],
      });
    }
  });
  
  return result;
});

// 总页数
const totalPages = computed(() => {
  if (!shouldUsePagination.value) return 1;
  return Math.ceil(filteredProjects.value.length / pageSize.value);
});

// 折叠状态：默认展开"今天"和"本周"
const collapsedKeys = ref<(string | number)[]>([]);

// 初始化折叠状态（展开"today"和"thisWeek"）
const initCollapsedKeys = () => {
  // 使用 displayGroupedProjects 或 groupedProjects 来初始化
  const groups = shouldUsePagination.value ? displayGroupedProjects.value : groupedProjects.value;
  const allKeys = groups.map(g => g.key);
  collapsedKeys.value = allKeys.filter(key => key !== 'today' && key !== 'thisWeek');
};

// 监听分组变化，更新折叠状态
watch(() => shouldUsePagination.value ? displayGroupedProjects.value : groupedProjects.value, () => {
  initCollapsedKeys();
}, { immediate: true, deep: true });

// 当搜索时，重置到第一页
watch(searchQuery, () => {
  currentPage.value = 1;
});

// 当项目列表变化时，重置到第一页
watch(() => projectStore.projects.length, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = 1;
  }
});

const showCreateProjectDialog = ref(false);
const createProjectForm = ref({
  name: '',
  description: '',
});

// 项目密码验证相关
const showPasswordVerifyModal = ref(false);
const passwordVerifyProjectId = ref<number | null>(null);
const formRef = ref<any>(null);

const createProjectRules = {
  name: {
    required: true,
    message: '请输入项目名称',
    trigger: 'blur',
  },
};

const handleCreateProject = async () => {
  if (!createProjectForm.value.name.trim()) {
    message.error('请输入项目名称');
    return false;
  }

  try {
    const projectId = await projectStore.createProject(
      createProjectForm.value.name.trim(),
      createProjectForm.value.description.trim() || null
    );
    message.success('项目创建成功');
    showCreateProjectDialog.value = false;
    createProjectForm.value = { name: '', description: '' };
    return true;
  } catch (error: any) {
    message.error(error.message || '创建项目失败');
    return false;
  }
};

const handleOpenProject = async (projectId: number) => {
  // 检查项目是否有密码保护
  const project = projectStore.projects.find(p => p.id === projectId);
  
  if (project && project.has_password) {
    // 如果项目已通过验证，直接打开
    if (projectStore.isProjectVerified(projectId)) {
      router.push(`/project/${projectId}/board`);
      return;
    }
    
    // 显示密码验证弹窗
    passwordVerifyProjectId.value = projectId;
    showPasswordVerifyModal.value = true;
  } else {
    // 没有密码保护，直接打开
    router.push(`/project/${projectId}/board`);
  }
};

// 密码验证成功后的处理
const handlePasswordVerified = () => {
  if (passwordVerifyProjectId.value) {
    // 标记项目已通过验证
    projectStore.markProjectVerified(passwordVerifyProjectId.value);
    // 跳转到看板
    router.push(`/project/${passwordVerifyProjectId.value}/board`);
  }
  passwordVerifyProjectId.value = null;
};

// 密码验证取消
const handlePasswordCancel = () => {
  passwordVerifyProjectId.value = null;
};

const handleDeleteProject = async (projectId: number) => {
  try {
    await projectStore.deleteProject(projectId);
    message.success('项目删除成功');
  } catch (error: any) {
    message.error(error.message || '删除项目失败');
  }
};

const handleOpenBoard = () => {
  if (projectStore.projects.length === 0) {
    message.warning('请先创建项目');
    return;
  }
  const firstProject = projectStore.projects[0];
  router.push(`/project/${firstProject.id}/board`);
};

const handleSyncGit = () => {
  router.push('/git-sync');
};

const handleViewStatistics = () => {
  router.push('/statistics');
};

const handleViewSettings = () => {
  router.push('/settings');
};

onMounted(async () => {
  try {
    await projectStore.loadProjects();
  } catch (error: any) {
    message.error(error.message || '加载项目列表失败');
  }
});
</script>

<style scoped>
/* 苹果风格 - 极致简洁 */

.app-layout {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

body.dark .app-layout,
html.dark .app-layout {
  background: #000000;
}

/* 极简顶部导航 */
.app-header {
  padding: 0 40px;
  height: 60px;
  display: flex;
  align-items: center;
  background: transparent;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

body.dark .app-header,
html.dark .app-header {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.app-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.02em;
}

body.dark .app-title,
html.dark .app-title {
  color: #ffffff;
}

.theme-toggle {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.theme-toggle:hover {
  background: rgba(0, 0, 0, 0.05);
}

body.dark .theme-toggle:hover,
html.dark .theme-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* 主内容区 - 大量留白 */
.app-content {
  flex: 1;
  padding: 60px 40px;
  overflow-y: auto;
  background: #ffffff;
  transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

body.dark .app-content,
html.dark .app-content {
  background: #000000;
}

.content-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 80px;
}

/* 项目区域 */
.projects-section {
  width: 100%;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
}

/* 搜索框容器 */
.search-container {
  margin-bottom: 24px;
  max-width: 500px;
}

.search-input :deep(.n-input) {
  border-radius: 12px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 14px;
  letter-spacing: -0.01em;
}

.search-input :deep(.n-input:focus-within) {
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.search-icon {
  font-size: 16px;
  opacity: 0.5;
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-input:focus-within .search-icon {
  opacity: 0.8;
}

.search-result-count {
  margin-top: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.5);
  letter-spacing: -0.01em;
}

body.dark .search-result-count,
html.dark .search-result-count {
  color: rgba(255, 255, 255, 0.5);
}

.section-title {
  margin: 0;
  font-size: 32px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.03em;
}

body.dark .section-title,
html.dark .section-title {
  color: #ffffff;
}

/* 苹果风格按钮 */
.btn-primary {
  padding: 10px 20px;
  border: none;
  border-radius: 12px;
  background: #007aff;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: -0.01em;
}

.btn-primary:hover {
  background: #0056d6;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary-large {
  padding: 14px 28px;
  border: none;
  border-radius: 16px;
  background: #007aff;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: -0.01em;
  margin-top: 24px;
}

.btn-primary-large:hover {
  background: #0056d6;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 122, 255, 0.4);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 120px 20px;
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 24px;
  opacity: 0.6;
}

.empty-title {
  margin: 0 0 12px 0;
  font-size: 24px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.02em;
}

body.dark .empty-title,
html.dark .empty-title {
  color: #ffffff;
}

.empty-description {
  margin: 0;
  font-size: 16px;
  color: rgba(0, 0, 0, 0.6);
  letter-spacing: -0.01em;
}

body.dark .empty-description,
html.dark .empty-description {
  color: rgba(255, 255, 255, 0.6);
}

/* 项目容器 */
.projects-container {
  width: 100%;
}

/* 项目分组折叠面板 */
.projects-collapse {
  background: transparent;
  border: none;
}

.projects-collapse :deep(.n-collapse-item) {
  margin-bottom: 16px;
  background: transparent;
  border: none;
}

.projects-collapse :deep(.n-collapse-item__header) {
  padding: 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.02em;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
  background: transparent;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

body.dark .projects-collapse :deep(.n-collapse-item__header),
html.dark .projects-collapse :deep(.n-collapse-item__header) {
  color: #ffffff;
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.projects-collapse :deep(.n-collapse-item__header:hover) {
  opacity: 0.7;
}

.projects-collapse :deep(.n-collapse-item__header-wrapper) {
  padding: 0;
}

.projects-collapse :deep(.n-collapse-item__content-wrapper) {
  padding: 0;
}

.projects-collapse :deep(.n-collapse-item__content-inner) {
  padding-top: 20px;
  padding-bottom: 0;
}

.group-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.group-title {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.group-count {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.4);
  letter-spacing: -0.01em;
}

body.dark .group-count,
html.dark .group-count {
  color: rgba(255, 255, 255, 0.4);
}

/* 项目卡片网格 */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

/* 分页容器 */
.pagination-container {
  margin-top: 32px;
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

.pagination-container :deep(.n-pagination) {
  --n-item-text-color: rgba(0, 0, 0, 0.6);
  --n-item-text-color-hover: rgba(0, 0, 0, 0.8);
  --n-item-text-color-active: #007aff;
  --n-item-text-color-disabled: rgba(0, 0, 0, 0.3);
  --n-item-border-radius: 8px;
  --n-item-size-medium: 32px;
  font-size: 14px;
  letter-spacing: -0.01em;
}

body.dark .pagination-container :deep(.n-pagination),
html.dark .pagination-container :deep(.n-pagination) {
  --n-item-text-color: rgba(255, 255, 255, 0.6);
  --n-item-text-color-hover: rgba(255, 255, 255, 0.8);
  --n-item-text-color-active: #007aff;
  --n-item-text-color-disabled: rgba(255, 255, 255, 0.3);
}

.project-card {
  padding: 28px;
  background: #ffffff;
  border: 0.5px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

body.dark .project-card,
html.dark .project-card {
  background: #1c1c1e;
  border-color: rgba(255, 255, 255, 0.08);
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: rgba(0, 122, 255, 0.2);
}

body.dark .project-card:hover,
html.dark .project-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  border-color: rgba(0, 122, 255, 0.3);
}

.project-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 16px;
}

.project-name {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.02em;
  flex: 1;
}

.project-lock-icon {
  font-size: 14px;
  opacity: 0.7;
  line-height: 1;
}

body.dark .project-name,
html.dark .project-name {
  color: #ffffff;
}

.project-lock-icon {
  font-size: 14px;
  opacity: 0.7;
  line-height: 1;
  flex-shrink: 0;
}

.btn-delete {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: rgba(0, 0, 0, 0.4);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

body.dark .btn-delete,
html.dark .btn-delete {
  color: rgba(255, 255, 255, 0.4);
}

.btn-delete:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.project-description {
  margin: 0;
  font-size: 15px;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.5;
  letter-spacing: -0.01em;
}

body.dark .project-description,
html.dark .project-description {
  color: rgba(255, 255, 255, 0.6);
}

/* 快捷操作区域 */
.quick-actions-section {
  width: 100%;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}

.action-card {
  padding: 32px 24px;
  border: none;
  background: #ffffff;
  border: 0.5px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  cursor: pointer;
  text-align: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

body.dark .action-card,
html.dark .action-card {
  background: #1c1c1e;
  border-color: rgba(255, 255, 255, 0.08);
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

body.dark .action-card:hover,
html.dark .action-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.action-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.8;
}

.action-title {
  margin: 0 0 8px 0;
  font-size: 17px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.02em;
}

body.dark .action-title,
html.dark .action-title {
  color: #ffffff;
}

.action-description {
  margin: 0;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.5);
  letter-spacing: -0.01em;
}

body.dark .action-description,
html.dark .action-description {
  color: rgba(255, 255, 255, 0.5);
}

/* 响应式 */
@media (max-width: 768px) {
  .app-header {
    padding: 0 20px;
  }

  .app-content {
    padding: 40px 20px;
  }

  .content-container {
    gap: 60px;
  }

  .section-title {
    font-size: 28px;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }

  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>


