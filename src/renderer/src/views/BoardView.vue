<!-- 看板视图 - 苹果风格 -->
<template>
  <div class="board-container">
    <n-layout>
      <!-- 极简顶部导航 -->
      <n-layout-header class="board-header">
        <div class="header-content">
          <button class="btn-back" @click="router.push('/')">
            ← 返回
          </button>
          <div class="header-title">
            <h2 class="board-title">看板</h2>
            <span v-if="projectStore.currentProject" class="project-name">
              {{ projectStore.currentProject.name }}
            </span>
            <span v-if="currentSprint" class="current-sprint-info">
              · 当前 Sprint：{{ currentSprint.name }}（{{ formatSprintDate(currentSprint.start_date) }} - {{ formatSprintDate(currentSprint.end_date) }}）
            </span>
          </div>
          <div class="header-actions">
            <button class="btn-sprint" @click="showPasswordManageModal = true">
              🔒 密码设置
            </button>
            <button class="btn-sprint" @click="handleExportReport">
              导出报表
            </button>
            <button class="btn-sprint" @click="router.push(`/project/${props.id}/sprints`)">
              Sprint 管理
            </button>
          </div>
        </div>
      </n-layout-header>

      <n-layout-content class="board-content">
        <n-spin :show="loading">
          <div v-if="!loading" class="board-columns">
            <!-- ToDo 列 -->
            <div class="board-column">
              <div class="column-header">
                <div class="column-title-wrapper">
                  <h3 class="column-title">待办</h3>
                  <span class="column-count">{{ todoTasks.length }}</span>
                  <span v-if="getThisWeekDueCount(todoTasksRaw) > 0" class="column-divider">·</span>
                  <span v-if="getThisWeekDueCount(todoTasksRaw) > 0" class="column-week-due">
                    本周到期：{{ getThisWeekDueCount(todoTasksRaw) }} 个
                  </span>
                </div>
              </div>
              <div class="column-tasks" ref="todoListRef">
                <div
                  v-for="task in todoTasksRaw"
                  :key="task.id"
                  :data-task-id="task.id"
                  class="task-wrapper"
                >
                  <TaskCard
                    :task="task"
                    @edit="handleEditTask"
                    @delete="handleDeleteTask"
                  />
                </div>
                <div v-if="todoTasksRaw.length === 0" class="empty-column">
                  <div class="empty-icon">✅</div>
                  <p class="empty-text">暂无待办任务</p>
                </div>
              </div>
              <button 
                class="btn-add-task"
                @click="showCreateTaskDialog = true; createTaskForm.status = 'ToDo'"
              >
                + 添加任务
              </button>
            </div>

            <!-- Doing 列 -->
            <div class="board-column">
              <div class="column-header">
                <div class="column-title-wrapper">
                  <h3 class="column-title">进行中</h3>
                  <span class="column-count">{{ doingTasks.length }}</span>
                  <span v-if="getThisWeekDueCount(doingTasksRaw) > 0" class="column-divider">·</span>
                  <span v-if="getThisWeekDueCount(doingTasksRaw) > 0" class="column-week-due">
                    本周到期：{{ getThisWeekDueCount(doingTasksRaw) }} 个
                  </span>
                </div>
              </div>
              <div class="column-tasks" ref="doingListRef">
                <div
                  v-for="task in doingTasksRaw"
                  :key="task.id"
                  :data-task-id="task.id"
                  class="task-wrapper"
                >
                  <TaskCard
                    :task="task"
                    @edit="handleEditTask"
                    @delete="handleDeleteTask"
                  />
                </div>
                <div v-if="doingTasksRaw.length === 0" class="empty-column">
                  <div class="empty-icon">⚡</div>
                  <p class="empty-text">暂无进行中的任务</p>
                </div>
              </div>
              <button 
                class="btn-add-task"
                @click="showCreateTaskDialog = true; createTaskForm.status = 'Doing'"
              >
                + 添加任务
              </button>
            </div>

            <!-- Done 列 -->
            <div class="board-column">
              <div class="column-header">
                <h3 class="column-title">已完成</h3>
                <span class="column-count">{{ doneTasks.length }}</span>
              </div>
              <div class="column-tasks" ref="doneListRef">
                <div
                  v-for="task in doneTasksRaw"
                  :key="task.id"
                  :data-task-id="task.id"
                  class="task-wrapper"
                >
                  <TaskCard
                    :task="task"
                    @edit="handleEditTask"
                    @delete="handleDeleteTask"
                  />
                </div>
                <div v-if="doneTasksRaw.length === 0" class="empty-column">
                  <div class="empty-icon">🎉</div>
                  <p class="empty-text">暂无已完成的任务</p>
                </div>
              </div>
              <button 
                class="btn-add-task"
                @click="showCreateTaskDialog = true; createTaskForm.status = 'Done'"
              >
                + 添加任务
              </button>
            </div>
          </div>
        </n-spin>
      </n-layout-content>
    </n-layout>

    <!-- 创建任务对话框 - 苹果风格 -->
    <n-modal 
      v-model:show="showCreateTaskDialog" 
      preset="dialog" 
      title="新建任务" 
      positive-text="创建" 
      :style="{ borderRadius: '16px' }"
      @positive-click="handleCreateTask"
    >
      <n-form :model="createTaskForm">
        <n-form-item label="任务标题">
          <n-input v-model:value="createTaskForm.title" placeholder="请输入任务标题" />
        </n-form-item>
        <n-form-item label="任务描述">
          <n-input
            v-model:value="createTaskForm.description"
            type="textarea"
            placeholder="请输入任务描述（可选）"
            :rows="3"
          />
        </n-form-item>
        <n-form-item label="故事点">
          <n-input-number v-model:value="createTaskForm.storyPoints" :min="0" />
        </n-form-item>
        <n-form-item label="负责人">
          <n-input v-model:value="createTaskForm.assignee" placeholder="请输入负责人姓名（可选）" />
        </n-form-item>
        <n-form-item label="截止日期">
          <n-date-picker
            v-model:value="createTaskForm.dueDate"
            type="date"
            placeholder="选择截止日期（可选）"
            clearable
            :is-date-disabled="(timestamp: number) => timestamp < Date.now() - 86400000"
          />
        </n-form-item>
        <n-form-item label="优先级">
          <n-select
            v-model:value="createTaskForm.priority"
            :options="[
              { label: '高', value: 1 },
              { label: '中', value: 2 },
              { label: '低', value: 3 },
            ]"
          />
        </n-form-item>
      </n-form>
    </n-modal>

    <!-- 编辑任务对话框 - 苹果风格 -->
    <n-modal 
      v-model:show="showEditTaskDialog" 
      preset="dialog" 
      title="编辑任务" 
      positive-text="保存" 
      :style="{ borderRadius: '16px' }"
      @positive-click="handleSaveEditTask"
    >
      <n-form :model="editTaskForm">
        <n-form-item label="任务标题">
          <n-input v-model:value="editTaskForm.title" placeholder="请输入任务标题" />
        </n-form-item>
        <n-form-item label="任务描述">
          <n-input
            v-model:value="editTaskForm.description"
            type="textarea"
            placeholder="请输入任务描述（可选）"
            :rows="3"
          />
        </n-form-item>
        <n-form-item label="故事点">
          <n-input-number v-model:value="editTaskForm.storyPoints" :min="0" />
        </n-form-item>
        <n-form-item label="状态">
          <n-select
            v-model:value="editTaskForm.status"
            :options="[
              { label: '待办', value: 'ToDo' },
              { label: '进行中', value: 'Doing' },
              { label: '已完成', value: 'Done' },
            ]"
          />
        </n-form-item>
        <n-form-item label="负责人">
          <n-input v-model:value="editTaskForm.assignee" placeholder="请输入负责人姓名（可选）" />
        </n-form-item>
        <n-form-item label="截止日期">
          <n-date-picker
            v-model:value="editTaskForm.dueDate"
            type="date"
            placeholder="选择截止日期（可选）"
            clearable
            :is-date-disabled="(timestamp: number) => timestamp < Date.now() - 86400000"
          />
        </n-form-item>
        <n-form-item label="优先级">
          <n-select
            v-model:value="editTaskForm.priority"
            :options="[
              { label: '高', value: 1 },
              { label: '中', value: 2 },
              { label: '低', value: 3 },
            ]"
          />
        </n-form-item>
      </n-form>
    </n-modal>

    <!-- 项目密码管理弹窗 -->
    <ProjectPasswordManageModal
      v-model:show="showPasswordManageModal"
      :project-id="typeof props.id === 'string' ? parseInt(props.id) : props.id"
      :project-has-password="projectHasPassword"
      @success="handlePasswordManageSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import Sortable from 'sortablejs';
import { debounce } from 'lodash-es';
import { NCard, NLayout, NLayoutHeader, NLayoutContent, NSpace, useMessage, useDialog, NButton, NModal, NForm, NFormItem, NInput, NInputNumber, NText, NSpin, NEmpty, NSelect, NDatePicker } from 'naive-ui';
import { useTaskStore } from '../stores/taskStore';
import { useProjectStore } from '../stores/projectStore';
import { useSprintStore } from '../stores/sprintStore';
import TaskCard from '../components/TaskCard.vue';
import ProjectPasswordManageModal from '../components/ProjectPasswordManageModal.vue';
import type { Task } from '../stores/taskStore';


const router = useRouter();
const taskStore = useTaskStore();
const projectStore = useProjectStore();
const sprintStore = useSprintStore();

// 安全地初始化 message 和 dialog
const message = useMessage();
const dialog = useDialog();

// 从路由参数获取项目 ID
const props = defineProps<{
  id: string | number;
}>();

const loading = ref(false);

// 当前活跃的 Sprint（安全访问，避免未初始化时出错）
const currentSprint = computed(() => {
  if (!sprintStore || !sprintStore.sprints) return null;
  const activeSprints = sprintStore.sprints.filter(s => s.status === 'Active');
  return activeSprints.length > 0 ? activeSprints[0] : null;
});

// 格式化 Sprint 日期
const formatSprintDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const showCreateTaskDialog = ref(false);
const createTaskForm = ref<{
  title: string;
  description: string;
  storyPoints: number;
  status: 'ToDo' | 'Doing' | 'Done';
  assignee: string;
  dueDate: number | null; // Naive UI date-picker 返回 number (timestamp)
  priority: number;
}>({
  title: '',
  description: '',
  storyPoints: 0,
  status: 'ToDo',
  assignee: '',
  dueDate: null,
  priority: 2,
});

// 使用 ref 来存储可拖拽的任务列表
const todoTasksRaw = ref<Task[]>([]);
const doingTasksRaw = ref<Task[]>([]);
const doneTasksRaw = ref<Task[]>([]);

// Sortable 实例引用
const todoListRef = ref<HTMLElement | null>(null);
const doingListRef = ref<HTMLElement | null>(null);
const doneListRef = ref<HTMLElement | null>(null);
let sortableInstances: Sortable[] = [];

// 拖拽状态管理
let isDragging = false;
let isLoadingTasks = false; // 防止在加载任务期间触发多次同步

// 从 store 同步任务到本地列表
const syncTasksToLocal = () => {
  const todo = taskStore.tasks
    .filter((t) => t.status === 'ToDo')
    .sort((a, b) => a.kanban_order - b.kanban_order);
  
  const doing = taskStore.tasks
    .filter((t) => t.status === 'Doing')
    .sort((a, b) => a.kanban_order - b.kanban_order);
  
  const done = taskStore.tasks
    .filter((t) => t.status === 'Done')
    .sort((a, b) => a.kanban_order - b.kanban_order);
  
  console.log('[BoardView] syncTasksToLocal:', {
    total: taskStore.tasks.length,
    todo: todo.length,
    doing: doing.length,
    done: done.length,
    todoTasks: todo.map(t => ({ id: t.id, title: t.title })),
  });
  
  todoTasksRaw.value = todo;
  doingTasksRaw.value = doing;
  doneTasksRaw.value = done;
  
  console.log('[BoardView] After sync, todoTasksRaw.value:', todoTasksRaw.value.length);
  
  // 使用 nextTick 确保 DOM 更新后再初始化 Sortable
  nextTick(() => {
    initSortable();
  });
};

// 监听 store.tasks 变化，同步到本地列表
// 注意：拖拽时会直接修改 todoTasksRaw/doingTasksRaw/doneTasksRaw，所以需要在拖拽完成后同步到 store
// 这里只处理非拖拽导致的数据变化（如创建任务、从其他源更新等）
watch(() => taskStore.tasks, () => {
  // 如果正在拖拽或正在加载任务，不进行同步（避免冲突）
  if (isDragging || isLoadingTasks) {
    return;
  }
  syncTasksToLocal();
}, { deep: true });

// computed 用于显示计数（与 todoTasksRaw 保持一致）
const todoTasks = computed(() => todoTasksRaw.value);
const doingTasks = computed(() => doingTasksRaw.value);
const doneTasks = computed(() => doneTasksRaw.value);

// 调试：打印任务列表（开发时使用）
watch([todoTasksRaw, doingTasksRaw, doneTasksRaw], () => {
  console.log('Task lists updated:', {
    todo: todoTasksRaw.value.length,
    doing: doingTasksRaw.value.length,
    done: doneTasksRaw.value.length,
    todoTasks: todoTasksRaw.value.map(t => ({ id: t.id, title: t.title })),
  });
}, { deep: true });

// Sortable 拖拽结束处理
const handleSortableEnd = (evt: Sortable.SortableEvent) => {
  const { item, from, to, oldIndex, newIndex } = evt;
  
  if (oldIndex === undefined || newIndex === undefined) {
    return; // 索引无效
  }
  
  if (from === to && oldIndex === newIndex) {
    return; // 同位置，不需要更新
  }
  
  isDragging = true;
  
  try {
    // 获取任务ID（从 item 元素获取 data-task-id 属性）
    const taskIdAttr = item.getAttribute('data-task-id');
    const taskId = taskIdAttr ? parseInt(taskIdAttr) : 0;
    
    if (!taskId) {
      console.error('[Sortable] Task ID not found, item:', item, 'attributes:', item.attributes);
      isDragging = false;
      syncTasksToLocal(); // 回滚 DOM
      return;
    }
    
    // 确定源列和目标列的状态
    const fromStatus = getStatusFromElement(from as HTMLElement);
    const toStatus = getStatusFromElement(to as HTMLElement);
    
    if (!fromStatus || !toStatus) {
      console.error('[Sortable] Cannot determine column status', { from, to });
      isDragging = false;
      // 回滚 DOM（sortablejs 已经移动了 DOM，但数据还没更新）
      syncTasksToLocal();
      return;
    }
    
    // 获取任务信息
    const task = taskStore.tasks.find(t => t.id === taskId);
    if (!task) {
      console.error('[Sortable] Task not found in store:', taskId);
      isDragging = false;
      syncTasksToLocal(); // 回滚
      return;
    }
    
    const newOrder = newIndex + 1; // kanban_order 从 1 开始
    const expectedVersion = task.version;
    const newStatus = toStatus;
    
    // 更新本地数组（sortablejs 已经移动了 DOM，我们需要同步数组）
    if (fromStatus === toStatus) {
      // 同列内排序：sortablejs 已经更新了 DOM，我们需要同步数组顺序
      const targetList = getListByStatus(toStatus);
      if (targetList) {
        const [movedTask] = targetList.value.splice(oldIndex, 1);
        targetList.value.splice(newIndex, 0, movedTask);
      }
    } else {
      // 跨列拖拽：从源列移除，添加到目标列
      const fromList = getListByStatus(fromStatus);
      const toList = getListByStatus(toStatus);
      if (fromList && toList) {
        const [movedTask] = fromList.value.splice(oldIndex, 1);
        // 创建新对象，更新状态
        const updatedTask = { ...movedTask, status: newStatus };
        toList.value.splice(newIndex, 0, updatedTask);
      }
    }
    
    // 触发防抖 IPC 更新
    debouncedUpdateTaskStatus(taskId, newStatus, newOrder, expectedVersion);
  } catch (error: any) {
    console.error('[Sortable] Error in handleSortableEnd:', error);
    message.error('拖拽更新失败：' + (error.message || '未知错误'));
    syncTasksToLocal(); // 回滚
  } finally {
    setTimeout(() => {
      isDragging = false;
    }, 100);
  }
};

// 从 DOM 元素获取状态
const getStatusFromElement = (element: HTMLElement): 'ToDo' | 'Doing' | 'Done' | null => {
  if (element === todoListRef.value) return 'ToDo';
  if (element === doingListRef.value) return 'Doing';
  if (element === doneListRef.value) return 'Done';
  return null;
};

// 根据状态获取对应的 ref 列表
const getListByStatus = (status: 'ToDo' | 'Doing' | 'Done') => {
  switch (status) {
    case 'ToDo':
      return todoTasksRaw;
    case 'Doing':
      return doingTasksRaw;
    case 'Done':
      return doneTasksRaw;
  }
};

// 防抖更新任务状态（150ms 防抖）
const debouncedUpdateTaskStatus = debounce(async (
  taskId: number,
  newStatus: 'ToDo' | 'Doing' | 'Done',
  newOrder: number,
  expectedVersion: number
) => {
  try {
    const result = await taskStore.updateTaskStatus(taskId, newStatus, newOrder, expectedVersion);
    if (!result.success) {
      message.error(result.error?.message || '更新任务状态失败');
      // 回滚已经在 updateTaskStatus 内部处理
    }
  } catch (error: any) {
    message.error(error.message || '更新任务状态失败');
    // 回滚已经在 updateTaskStatus 内部处理
  }
}, 150);


const handleCreateTask = async () => {
  if (!createTaskForm.value.title.trim()) {
    message.error('请输入任务标题');
    return false;
  }

  try {
    const projectId = typeof props.id === 'string' ? parseInt(props.id) : props.id;
    await taskStore.createTask(
      projectId,
      createTaskForm.value.title.trim(),
      createTaskForm.value.description.trim() || null,
      createTaskForm.value.storyPoints || 0,
      createTaskForm.value.status || 'ToDo',
      undefined, // sprintId
      createTaskForm.value.assignee.trim() || null,
      createTaskForm.value.dueDate ? new Date(createTaskForm.value.dueDate).toISOString() : null,
      createTaskForm.value.priority || 2
    );
    message.success('任务创建成功');
    showCreateTaskDialog.value = false;
    createTaskForm.value = {
      title: '',
      description: '',
      storyPoints: 0,
      status: 'ToDo',
      assignee: '',
      dueDate: null,
      priority: 2,
    };
    // watch 会自动同步，不需要手动调用 syncTasksToLocal()
    return true;
  } catch (error: any) {
    message.error(error.message || '创建任务失败');
    return false;
  }
};

const showEditTaskDialog = ref(false);
const editingTaskId = ref<number | null>(null);

// 项目密码管理
const showPasswordManageModal = ref(false);
const currentProject = computed(() => {
  return projectStore.projects.find(p => p.id === (typeof props.id === 'string' ? parseInt(props.id) : props.id));
});
const projectHasPassword = computed(() => {
  return currentProject.value?.has_password === 1 || currentProject.value?.has_password === true;
});
const editTaskForm = ref<{
  title: string;
  description: string;
  storyPoints: number;
  status: 'ToDo' | 'Doing' | 'Done';
  assignee: string;
  dueDate: number | null; // Naive UI date-picker 返回 number (timestamp)
  priority: number;
}>({
  title: '',
  description: '',
  storyPoints: 0,
  status: 'ToDo',
  assignee: '',
  dueDate: null,
  priority: 2,
});

const handleEditTask = (taskId: number) => {
  console.log('[BoardView] handleEditTask called with taskId:', taskId);
  const task = taskStore.tasks.find(t => t.id === taskId);
  if (!task) {
    console.error('[BoardView] Task not found:', taskId);
    message.error('任务不存在');
    return;
  }
  
  console.log('[BoardView] Opening edit dialog for task:', task.title);
  editingTaskId.value = taskId;
  editTaskForm.value = {
    title: task.title,
    description: task.description || '',
    storyPoints: task.story_points,
    status: task.status,
    assignee: task.assignee || '',
    dueDate: task.due_date ? new Date(task.due_date).getTime() : null,
    priority: task.priority || 2,
  };
  showEditTaskDialog.value = true;
};

const handleSaveEditTask = async () => {
  if (!editingTaskId.value) return false;
  
  if (!editTaskForm.value.title.trim()) {
    message.error('请输入任务标题');
    return false;
  }

  try {
    await taskStore.updateTask(
      editingTaskId.value,
      editTaskForm.value.title.trim(),
      editTaskForm.value.description.trim() || null,
      editTaskForm.value.storyPoints || 0,
      editTaskForm.value.status,
      editTaskForm.value.assignee.trim() || null,
      editTaskForm.value.dueDate ? new Date(editTaskForm.value.dueDate).toISOString() : null,
      editTaskForm.value.priority || 2
    );
    message.success('任务更新成功');
    showEditTaskDialog.value = false;
    editingTaskId.value = null;
    // watch 会自动同步，不需要手动调用 syncTasksToLocal()
    return true;
  } catch (error: any) {
    message.error(error.message || '更新任务失败');
    return false;
  }
};

// 计算本周到期的任务数量
const getThisWeekDueCount = (tasks: Task[]) => {
  if (tasks.length === 0) return 0;
  
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1));
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return tasks.filter(task => {
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date);
    return dueDate >= weekStart && dueDate <= weekEnd;
  }).length;
};

// 导出项目报表
const handleExportReport = async () => {
  try {
    // 确保 projectId 是数字类型
    const projectId = typeof props.id === 'string' ? parseInt(props.id, 10) : props.id;
    
    if (isNaN(projectId) || projectId <= 0) {
      message.error('无效的项目ID');
      return;
    }
    
    message.loading('正在生成报表...', { duration: 0, key: 'exporting' });
    
    const result = await window.electronAPI.export.exportProjectReportMarkdown(projectId);
    
    message.destroyAll();
    
    if ('isAppError' in result) {
      message.error(result.message || '导出报表失败');
      return;
    }
    
    if (result.canceled) {
      // 用户取消了保存对话框，不显示任何消息
      return;
    }
    
    if (result.success) {
      message.success(`报表已导出到：${result.filePath}`, { duration: 5000 });
    } else {
      message.error('导出报表失败');
    }
  } catch (error: any) {
    message.destroyAll();
    message.error(error.message || '导出报表失败');
  }
};

// 项目密码管理成功后的处理
const handlePasswordManageSuccess = async () => {
  // 重新加载项目列表以更新密码状态
  await projectStore.loadProjects();
  // 如果移除了密码，清除验证状态
  const projectId = typeof props.id === 'string' ? parseInt(props.id) : props.id;
  const project = projectStore.projects.find(p => p.id === projectId);
  if (project && !project.has_password) {
    projectStore.clearProjectVerification(projectId);
  }
};

const handleDeleteTask = async (taskId: number) => {
  console.log('[BoardView] handleDeleteTask called with taskId:', taskId);
  const task = taskStore.tasks.find(t => t.id === taskId);
  if (!task) {
    console.error('[BoardView] Task not found for deletion:', taskId);
    message.error('任务不存在');
    return;
  }

  console.log('[BoardView] Showing delete confirmation for task:', task.title);
  // 使用 Naive UI 的 dialog 确认
  dialog.warning({
    title: '确认删除',
    content: `确定要删除任务"${task.title}"吗？此操作不可恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await taskStore.deleteTask(taskId);
        message.success('任务删除成功');
        // watch 会自动同步，不需要手动调用 syncTasksToLocal()
      } catch (error: any) {
        message.error(error.message || '删除任务失败');
      }
    },
  });
};

// 初始化 Sortable 实例
const initSortable = () => {
  // 销毁旧实例
  sortableInstances.forEach(instance => instance.destroy());
  sortableInstances = [];
  
  // 等待 DOM 更新
  nextTick(() => {
    if (todoListRef.value) {
      const sortable1 = Sortable.create(todoListRef.value, {
        group: 'kanban',
        animation: 150,
        ghostClass: 'ghost',
        chosenClass: 'chosen',
        onEnd: (evt) => handleSortableEnd(evt),
      });
      sortableInstances.push(sortable1);
      console.log('[Sortable] Initialized for ToDo column');
    }
    
    if (doingListRef.value) {
      const sortable2 = Sortable.create(doingListRef.value, {
        group: 'kanban',
        animation: 150,
        ghostClass: 'ghost',
        chosenClass: 'chosen',
        onEnd: (evt) => handleSortableEnd(evt),
      });
      sortableInstances.push(sortable2);
      console.log('[Sortable] Initialized for Doing column');
    }
    
    if (doneListRef.value) {
      const sortable3 = Sortable.create(doneListRef.value, {
        group: 'kanban',
        animation: 150,
        ghostClass: 'ghost',
        chosenClass: 'chosen',
        onEnd: (evt) => handleSortableEnd(evt),
      });
      sortableInstances.push(sortable3);
      console.log('[Sortable] Initialized for Done column');
    }
  });
};

onMounted(async () => {
  loading.value = true;
  try {
    // 设置当前项目
    const projectId = typeof props.id === 'string' ? parseInt(props.id) : props.id;
    
    if (isNaN(projectId) || projectId <= 0) {
      message.error('无效的项目ID');
      router.push('/');
      return;
    }

    // 确保项目列表已加载
    if (projectStore.projects.length === 0) {
      await projectStore.loadProjects();
    }

    projectStore.setCurrentProject(projectId);

    // 加载 Sprint 列表
    try {
      await sprintStore.loadSprints(projectId);
    } catch (error: any) {
      console.error('Failed to load sprints:', error);
    }

    // 加载任务列表（watch 会自动同步，不需要手动调用 syncTasksToLocal）
    isLoadingTasks = true;
    try {
      await taskStore.loadTasks(projectId);
      // 加载完成后立即同步一次，确保初始状态正确
      syncTasksToLocal();
      // 初始化 Sortable
      initSortable();
    } finally {
      isLoadingTasks = false;
    }
  } catch (error: any) {
    console.error('BoardView mounted error:', error);
    message.error(error.message || '加载任务列表失败');
    // 出错时返回首页
    setTimeout(() => {
      router.push('/').catch(() => {
        console.error('Failed to navigate to home');
      });
    }, 1000);
  } finally {
    loading.value = false;
  }
});

// 组件卸载时清理 Sortable 实例
onBeforeUnmount(() => {
  sortableInstances.forEach(instance => instance.destroy());
  sortableInstances = [];
});
</script>

<style scoped>
/* 看板视图 - 苹果风格 */

.board-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

body.dark .board-container,
html.dark .board-container {
  background: #000000;
}

/* 极简顶部导航 */
.board-header {
  padding: 0 40px;
  height: 60px;
  display: flex;
  align-items: center;
  background: transparent;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

body.dark .board-header,
html.dark .board-header {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 24px;
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
}

.btn-back {
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: -0.01em;
}

body.dark .btn-back,
html.dark .btn-back {
  color: rgba(255, 255, 255, 0.6);
}

.btn-back:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #000000;
}

body.dark .btn-back:hover,
html.dark .btn-back:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.header-title {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-sprint {
  padding: 8px 20px;
  background: rgba(0, 122, 255, 0.1);
  color: #007aff;
  border: 1px solid rgba(0, 122, 255, 0.2);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

body.dark .btn-sprint,
html.dark .btn-sprint {
  background: rgba(0, 122, 255, 0.15);
  color: #5ac8fa;
  border-color: rgba(0, 122, 255, 0.3);
}

.btn-sprint:hover {
  background: rgba(0, 122, 255, 0.2);
  transform: translateY(-1px);
}

body.dark .btn-sprint:hover,
html.dark .btn-sprint:hover {
  background: rgba(0, 122, 255, 0.25);
}

.current-sprint-info {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.5);
  margin-left: 8px;
  font-weight: 400;
}

body.dark .current-sprint-info,
html.dark .current-sprint-info {
  color: rgba(255, 255, 255, 0.5);
}

.board-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.02em;
}

body.dark .board-title,
html.dark .board-title {
  color: #ffffff;
}

.project-name {
  font-size: 15px;
  color: rgba(0, 0, 0, 0.5);
  letter-spacing: -0.01em;
}

body.dark .project-name,
html.dark .project-name {
  color: rgba(255, 255, 255, 0.5);
}

/* 主内容区 */
.board-content {
  flex: 1;
  padding: 40px;
  overflow-x: auto;
  overflow-y: hidden;
  background: #ffffff;
  transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

body.dark .board-content,
html.dark .board-content {
  background: #000000;
}

/* 拖拽功能开发中提示 */
body.dark div[style*="拖拽排序功能开发中"],
html.dark div[style*="拖拽排序功能开发中"] {
  color: rgba(255, 255, 255, 0.4) !important;
}

/* 三列横向布局 */
.board-columns {
  display: flex;
  gap: 24px;
  max-width: 1600px;
  margin: 0 auto;
  height: 100%;
  align-items: flex-start;
}

/* 列样式 */
.board-column {
  flex: 0 0 320px;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 600px;
}

.column-header {
  display: flex;
  align-items: baseline;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
}

.column-title-wrapper {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.column-divider {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.3);
  font-weight: 400;
  margin: 0 4px;
}

body.dark .column-divider,
html.dark .column-divider {
  color: rgba(255, 255, 255, 0.3);
}

.column-week-due {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.5);
  font-weight: 400;
  letter-spacing: -0.01em;
}

body.dark .column-week-due,
html.dark .column-week-due {
  color: rgba(255, 255, 255, 0.5);
}

body.dark .column-header,
html.dark .column-header {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.column-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.02em;
}

body.dark .column-title,
html.dark .column-title {
  color: #ffffff;
}

.column-count {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.4);
  font-weight: 500;
}

body.dark .column-count,
html.dark .column-count {
  color: rgba(255, 255, 255, 0.4);
}

/* 任务列表区域 */
.column-tasks {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
  margin-right: -8px;
}

.task-wrapper {
  margin-bottom: 12px;
}

/* 拖拽样式 */
.ghost {
  opacity: 0.4;
  background: #f0f0f0;
}

.chosen {
  cursor: move;
}

/* 空状态 */
.empty-column {
  text-align: center;
  padding: 60px 20px;
  opacity: 0.5;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  margin: 0;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.5);
}

body.dark .empty-text,
html.dark .empty-text {
  color: rgba(255, 255, 255, 0.5);
}

/* 添加任务按钮 */
.btn-add-task {
  margin-top: 16px;
  padding: 10px;
  border: none;
  background: transparent;
  border-radius: 10px;
  font-size: 14px;
  color: rgba(0, 122, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.btn-add-task:hover {
  background: rgba(0, 122, 255, 0.08);
  color: #007aff;
}

body.dark .btn-add-task,
html.dark .btn-add-task {
  color: rgba(0, 122, 255, 0.9);
}

body.dark .btn-add-task:hover,
html.dark .btn-add-task:hover {
  background: rgba(0, 122, 255, 0.15);
}

/* 拖拽样式 */
:deep(.sortable-ghost) {
  opacity: 0.4;
  background: rgba(0, 0, 0, 0.02);
  border: 2px dashed rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}

:deep(.ghost-task) {
  opacity: 0.4;
  background: rgba(0, 0, 0, 0.02);
  border: 2px dashed rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}

/* 响应式 */
@media (max-width: 1200px) {
  .board-columns {
    gap: 16px;
  }

  .board-column {
    flex: 0 0 280px;
  }
}

@media (max-width: 768px) {
  .board-header {
    padding: 0 20px;
  }

  .board-content {
    padding: 20px;
  }

  .board-columns {
    flex-direction: column;
    align-items: stretch;
  }

  .board-column {
    flex: 1;
    min-height: 400px;
  }
}
</style>














