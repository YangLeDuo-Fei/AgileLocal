<!-- 严格按照 V！.md v2025.PerfectScore.Final 生成 -->
<template>
  <div class="board-container">
    <n-layout>
      <n-layout-header class="board-header" bordered>
        <div class="header-content">
          <n-button text @click="router.push('/')">
            ← 返回首页
          </n-button>
          <h2 class="board-title">看板视图</h2>
          <n-text v-if="projectStore.currentProject" depth="3">
            {{ projectStore.currentProject.name }}
          </n-text>
        </div>
      </n-layout-header>
      <n-layout-content style="padding: 20px; overflow-y: auto;">
        <n-spin :show="loading">
          <n-space horizontal :size="20" style="min-height: 600px;" v-if="!loading">
            <!-- ToDo 列 -->
            <n-card
              :title="`ToDo (${todoTasks.length})`"
              style="width: 300px; min-height: 400px;"
              :bordered="true"
            >
              <template #header-extra>
                <n-button size="small" @click="showCreateTaskDialog = true; createTaskForm.status = 'ToDo'">
                  添加任务
                </n-button>
              </template>
              <VueDraggableNext
                v-model="todoTasksRaw"
                :group="{ name: 'kanban', pull: true, put: true }"
                :animation="200"
                :ghost-class="'ghost-task'"
                handle=".task-card"
                item-key="id"
                @change="(evt) => handleDragChange(evt, 'ToDo')"
              >
                <template #item="{ element: task }">
                  <TaskCard
                    :task="task"
                    @edit="handleEditTask"
                    @delete="handleDeleteTask"
                  />
                </template>
              </VueDraggableNext>
              <n-empty 
                v-if="todoTasksRaw.length === 0" 
                description="暂无待办任务" 
                style="margin-top: 40px;"
                size="medium"
              >
                <template #icon>
                  <span style="font-size: 48px;">✅</span>
                </template>
              </n-empty>
            </n-card>

            <!-- Doing 列 -->
            <n-card
              :title="`Doing (${doingTasks.length})`"
              style="width: 300px; min-height: 400px;"
              :bordered="true"
            >
              <template #header-extra>
                <n-button size="small" @click="showCreateTaskDialog = true; createTaskForm.status = 'Doing'">
                  添加任务
                </n-button>
              </template>
              <VueDraggableNext
                v-model="doingTasksRaw"
                :group="{ name: 'kanban', pull: true, put: true }"
                :animation="200"
                :ghost-class="'ghost-task'"
                handle=".task-card"
                item-key="id"
                @change="(evt) => handleDragChange(evt, 'Doing')"
              >
                <template #item="{ element: task }">
                  <TaskCard
                    :task="task"
                    @edit="handleEditTask"
                    @delete="handleDeleteTask"
                  />
                </template>
              </VueDraggableNext>
              <n-empty 
                v-if="doingTasksRaw.length === 0" 
                description="暂无进行中的任务" 
                style="margin-top: 40px;"
                size="medium"
              >
                <template #icon>
                  <span style="font-size: 48px;">⚡</span>
                </template>
              </n-empty>
            </n-card>

            <!-- Done 列 -->
            <n-card
              :title="`Done (${doneTasks.length})`"
              style="width: 300px; min-height: 400px;"
              :bordered="true"
            >
              <template #header-extra>
                <n-button size="small" @click="showCreateTaskDialog = true; createTaskForm.status = 'Done'">
                  添加任务
                </n-button>
              </template>
              <VueDraggableNext
                v-model="doneTasksRaw"
                :group="{ name: 'kanban', pull: true, put: true }"
                :animation="200"
                :ghost-class="'ghost-task'"
                handle=".task-card"
                item-key="id"
                @change="(evt) => handleDragChange(evt, 'Done')"
              >
                <template #item="{ element: task }">
                  <TaskCard
                    :task="task"
                    @edit="handleEditTask"
                    @delete="handleDeleteTask"
                  />
                </template>
              </VueDraggableNext>
              <n-empty 
                v-if="doneTasksRaw.length === 0" 
                description="暂无已完成的任务" 
                style="margin-top: 40px;"
                size="medium"
              >
                <template #icon>
                  <span style="font-size: 48px;">🎉</span>
                </template>
              </n-empty>
            </n-card>
          </n-space>
        </n-spin>
      </n-layout-content>
    </n-layout>

    <!-- 创建任务对话框 -->
    <n-modal v-model:show="showCreateTaskDialog" preset="dialog" title="创建任务" positive-text="创建" @positive-click="handleCreateTask">
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

    <!-- 编辑任务对话框 -->
    <n-modal v-model:show="showEditTaskDialog" preset="dialog" title="编辑任务" positive-text="保存" @positive-click="handleSaveEditTask">
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { VueDraggableNext } from 'vue-draggable-next';
import { debounce } from 'lodash-es';
import { NCard, NLayout, NLayoutHeader, NLayoutContent, NSpace, useMessage, useDialog, NButton, NModal, NForm, NFormItem, NInput, NInputNumber, NText, NSpin, NEmpty, NSelect, NDatePicker } from 'naive-ui';
import { useTaskStore } from '../stores/taskStore';
import { useProjectStore } from '../stores/projectStore';
import TaskCard from '../components/TaskCard.vue';
import type { Task } from '../stores/taskStore';

const router = useRouter();
const taskStore = useTaskStore();
const projectStore = useProjectStore();
const message = useMessage();
const dialog = useDialog();

// 从路由参数获取项目 ID
const props = defineProps<{
  id: string | number;
}>();

const loading = ref(false);

const showCreateTaskDialog = ref(false);
const createTaskForm = ref<{
  title: string;
  description: string;
  storyPoints: number;
  status: 'ToDo' | 'Doing' | 'Done';
}>({
  title: '',
  description: '',
  storyPoints: 0,
  status: 'ToDo',
});

// 使用 ref 来存储可拖拽的列表
const todoTasksRaw = ref<Task[]>([]);
const doingTasksRaw = ref<Task[]>([]);
const doneTasksRaw = ref<Task[]>([]);

// 从 store 同步任务到本地列表
const syncTasksToLocal = () => {
  todoTasksRaw.value = taskStore.tasks
    .filter((t) => t.status === 'ToDo')
    .sort((a, b) => a.kanban_order - b.kanban_order);
  
  doingTasksRaw.value = taskStore.tasks
    .filter((t) => t.status === 'Doing')
    .sort((a, b) => a.kanban_order - b.kanban_order);
  
  doneTasksRaw.value = taskStore.tasks
    .filter((t) => t.status === 'Done')
    .sort((a, b) => a.kanban_order - b.kanban_order);
};

// 监听 store.tasks 变化，同步到本地列表
// 注意：拖拽时会直接修改 todoTasksRaw/doingTasksRaw/doneTasksRaw，所以需要在拖拽完成后同步到 store
// 这里只处理非拖拽导致的数据变化（如创建任务、从其他源更新等）
let isDragging = false;
let isLoadingTasks = false; // 防止在加载任务期间触发多次同步
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

// 处理拖拽变化事件
interface DragChangeEvent {
  added?: {
    element: Task;
    newIndex: number;
  };
  removed?: {
    element: Task;
    oldIndex: number;
  };
  moved?: {
    element: Task;
    oldIndex: number;
    newIndex: number;
  };
}

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

const handleDragChange = (evt: DragChangeEvent, targetStatus: 'ToDo' | 'Doing' | 'Done') => {
  // vue-draggable-next 已经更新了本地列表（todoTasksRaw/doingTasksRaw/doneTasksRaw）
  // 我们需要根据变化信息计算 newOrder，然后调用防抖更新
  
  isDragging = true;
  
  try {
    let taskId: number;
    let newOrder: number;
    let expectedVersion: number;
    
    // 如果是移动（同列内排序）
    if (evt.moved) {
      const { element, newIndex } = evt.moved;
      taskId = element.id;
      // 同列内排序：newOrder = newIndex + 1（因为 kanban_order 从 1 开始）
      newOrder = newIndex + 1;
      
      // 获取当前任务在 store 中的版本号
      const currentTask = taskStore.tasks.find(t => t.id === element.id);
      if (!currentTask) {
        console.error('Task not found in store:', element.id);
        isDragging = false;
        return;
      }
      
      expectedVersion = currentTask.version;
      
      // 触发防抖 IPC 更新（updateTaskStatus 内部包含乐观更新）
      debouncedUpdateTaskStatus(taskId, targetStatus, newOrder, expectedVersion);
      return;
    }

    // 如果是跨列拖拽（added 表示有新任务加入当前列）
    if (evt.added) {
      const { element: draggedTask, newIndex } = evt.added;
      taskId = draggedTask.id;
      newOrder = newIndex + 1;
      
      // 获取被拖拽任务的原始状态（从 store 中查找）
      const originalTask = taskStore.tasks.find(t => t.id === draggedTask.id);
      if (!originalTask) {
        console.error('Task not found in store:', draggedTask.id);
        isDragging = false;
        return;
      }
      
      const oldStatus = originalTask.status;
      expectedVersion = originalTask.version;
      
      // 如果状态确实变化了
      if (oldStatus !== targetStatus) {
        // 触发防抖 IPC 更新（updateTaskStatus 内部包含乐观更新）
        debouncedUpdateTaskStatus(taskId, targetStatus, newOrder, expectedVersion);
      }
      return;
    }

    // removed 事件：当任务从当前列移除时触发（跨列拖拽时会先触发 removed，再在目标列触发 added）
    // 这里不需要处理，因为跨列拖拽会在目标列的 added 事件中处理
  } finally {
    // 拖拽处理完成，重置标志（延迟一点，确保所有更新完成）
    setTimeout(() => {
      isDragging = false;
      // 重新同步本地列表（确保与 store 一致）
      syncTasksToLocal();
    }, 200);
  }
};


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
      dueDate: '',
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
const editTaskForm = ref<{
  title: string;
  description: string;
  storyPoints: number;
  status: 'ToDo' | 'Doing' | 'Done';
  assignee: string;
  dueDate: string;
  priority: number;
}>({
  title: '',
  description: '',
  storyPoints: 0,
  status: 'ToDo',
  assignee: '',
  dueDate: '',
  priority: 2,
});

const handleEditTask = (taskId: number) => {
  const task = taskStore.tasks.find(t => t.id === taskId);
  if (!task) {
    message.error('任务不存在');
    return;
  }
  
  editingTaskId.value = taskId;
  editTaskForm.value = {
    title: task.title,
    description: task.description || '',
    storyPoints: task.story_points,
    status: task.status,
    assignee: task.assignee || '',
    dueDate: task.due_date ? new Date(task.due_date).getTime().toString() : '',
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
      editTaskForm.value.dueDate ? new Date(parseInt(editTaskForm.value.dueDate)).toISOString() : null,
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

const handleDeleteTask = async (taskId: number) => {
  const task = taskStore.tasks.find(t => t.id === taskId);
  if (!task) {
    message.error('任务不存在');
    return;
  }

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

    // 加载任务列表（watch 会自动同步，不需要手动调用 syncTasksToLocal）
    isLoadingTasks = true;
    try {
      await taskStore.loadTasks(projectId);
    } finally {
      isLoadingTasks = false;
      // 加载完成后手动同步一次，确保初始状态正确
      syncTasksToLocal();
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
</script>

<style scoped>
.board-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.board-header {
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.board-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
}

.drag-area {
  min-height: 100px;
}

/* 确保任务列表正确显示 */
.drag-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 拖拽时的占位符样式 */
:deep(.ghost-task) {
  opacity: 0.4;
  background: #f0f0f0;
  border: 2px dashed #ccc;
}
</style>









