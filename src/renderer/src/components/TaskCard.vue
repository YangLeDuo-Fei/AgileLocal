<!-- 任务卡片组件 -->
<template>
  <n-card
    size="small"
    hoverable
    class="task-card"
    :class="taskCardClass"
    @click="handleEdit"
    style="cursor: move;"
  >
    <div class="task-header">
      <div class="task-title-wrapper">
        <n-text strong class="task-title">{{ task.title }}</n-text>
        <n-tag
          v-if="task.story_points > 0"
          size="small"
          :type="getStoryPointsTagType(task.story_points)"
          class="story-points-tag"
        >
          {{ task.story_points }} SP
        </n-tag>
      </div>
      <div class="task-header-right">
        <!-- 截止日期显示（右上角） -->
        <span v-if="task.due_date" class="due-date-badge" :class="{ 'due-date-badge--overdue': isOverdue }">
          {{ formatDueDateForDisplay(task.due_date) }}
        </span>
        <!-- 逾期标签 -->
        <n-tag v-if="isOverdue" size="small" type="error" class="overdue-tag">
          逾期
        </n-tag>
        <n-button
          text
          size="tiny"
          type="error"
          class="delete-btn"
          @click="handleDelete"
        >
          ×
        </n-button>
      </div>
    </div>
    <div v-if="task.description" class="task-description">
      {{ task.description }}
    </div>
    <div class="task-footer">
      <n-space :size="8" align="center" style="flex-wrap: wrap;">
        <n-tag
          size="small"
          :type="getStatusTagType(task.status)"
        >
          {{ getStatusLabel(task.status) }}
        </n-tag>
        <n-tag
          v-if="task.priority !== 2"
          size="small"
          :type="getPriorityTagType(task.priority)"
        >
          {{ getPriorityLabel(task.priority) }}
        </n-tag>
        <n-text v-if="task.assignee" depth="3" style="font-size: 11px;">
          👤 {{ task.assignee }}
        </n-text>
        <n-text depth="3" style="font-size: 11px;">
          {{ formatDate(task.updated_at) }}
        </n-text>
      </n-space>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NCard, NText, NButton, NTag, NSpace } from 'naive-ui';
import type { Task } from '../stores/taskStore';

const props = defineProps<{
  task: Task;
}>();

const emit = defineEmits<{
  edit: [taskId: number];
  delete: [taskId: number];
}>();

// 任务卡片样式类（根据状态和逾期）
const taskCardClass = computed(() => {
  const isOverdue = props.task.due_date && 
    new Date(props.task.due_date).getTime() < new Date().getTime() && 
    props.task.status !== 'Done';
  
  return {
    'task-card--todo': props.task.status === 'ToDo',
    'task-card--doing': props.task.status === 'Doing',
    'task-card--done': props.task.status === 'Done',
    'task-card--overdue': isOverdue,
  };
});

// 判断是否逾期
const isOverdue = computed(() => {
  if (!props.task.due_date || props.task.status === 'Done') {
    return false;
  }
  const dueDate = new Date(props.task.due_date);
  const now = new Date();
  return dueDate.getTime() < now.getTime();
});

// 获取状态标签类型
const getStatusTagType = (status: 'ToDo' | 'Doing' | 'Done') => {
  switch (status) {
    case 'ToDo':
      return 'default';
    case 'Doing':
      return 'warning';
    case 'Done':
      return 'success';
    default:
      return 'default';
  }
};

// 获取状态标签文本
const getStatusLabel = (status: 'ToDo' | 'Doing' | 'Done') => {
  switch (status) {
    case 'ToDo':
      return '待办';
    case 'Doing':
      return '进行中';
    case 'Done':
      return '已完成';
    default:
      return status;
  }
};

// 获取故事点标签类型（根据点数）
const getStoryPointsTagType = (points: number) => {
  if (points === 0) return 'default';
  if (points <= 3) return 'success';
  if (points <= 8) return 'warning';
  return 'error';
};

// 格式化日期（显示相对时间或日期）
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return '今天';
  } else if (days === 1) {
    return '昨天';
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
};

// 格式化截止日期（用于右上角显示）
const formatDueDateForDisplay = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days < 0) {
    // 逾期：显示 "逾期 昨天" 或 "逾期 X月X日"
    if (days === -1) {
      return '逾期 昨天';
    } else {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `逾期 ${month}月${day}日`;
    }
  } else if (days === 0) {
    return '今天';
  } else if (days === 1) {
    return '明天';
  } else if (days === -1) {
    return '昨天';
  } else {
    // 格式：12月20日
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  }
};

// 获取优先级标签类型
const getPriorityTagType = (priority: number) => {
  if (priority === 1) return 'error'; // 高优先级
  if (priority === 3) return 'info'; // 低优先级
  return 'default'; // 中优先级
};

// 获取优先级标签文本
const getPriorityLabel = (priority: number) => {
  if (priority === 1) return '高';
  if (priority === 3) return '低';
  return '中';
};

// 获取截止日期样式类（逾期显示红色）
const getDueDateClass = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  if (date.getTime() < now.getTime()) {
    return 'due-date-overdue';
  }
  return '';
};

const handleEdit = () => {
  console.log('[TaskCard] handleEdit called for task:', props.task.id, props.task.title);
  emit('edit', props.task.id);
};

const handleDelete = (e: Event) => {
  e.stopPropagation();
  console.log('[TaskCard] handleDelete called for task:', props.task.id, props.task.title);
  emit('delete', props.task.id);
};
</script>

<style scoped>
/* 任务卡片 - 苹果风格 */

.task-card {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-left: 3px solid transparent;
  border-radius: 12px;
  background: #ffffff;
  border: 0.5px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  border-left-width: 3px;
}

/* 深色模式通过全局类控制 */
body.dark .task-card,
html.dark .task-card {
  background: #1c1c1e;
  border-color: rgba(255, 255, 255, 0.08);
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border-color: rgba(0, 122, 255, 0.2);
}

body.dark .task-card:hover,
html.dark .task-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  border-color: rgba(0, 122, 255, 0.3);
}

.task-card--todo {
  border-left-color: #007aff;
}

.task-card--doing {
  border-left-color: #ff9500;
}

.task-card--done {
  border-left-color: #34c759;
  opacity: 0.85;
}

.task-card--overdue {
  border-left-width: 4px !important;
  border-left-color: #ff3b30 !important;
  border-color: rgba(255, 59, 48, 0.3) !important;
  background: rgba(255, 59, 48, 0.02) !important;
}

body.dark .task-card--overdue,
html.dark .task-card--overdue {
  border-left-color: #ff453a !important;
  border-color: rgba(255, 69, 58, 0.3) !important;
  background: rgba(255, 69, 58, 0.05) !important;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.task-title-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.task-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 截止日期徽章（右上角） */
.due-date-badge {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.5);
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.04);
  font-weight: 500;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

body.dark .due-date-badge,
html.dark .due-date-badge {
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.08);
}

.due-date-badge--overdue {
  color: #ff3b30;
  background: rgba(255, 59, 48, 0.1);
  font-weight: 600;
}

body.dark .due-date-badge--overdue,
html.dark .due-date-badge--overdue {
  color: #ff453a;
  background: rgba(255, 69, 58, 0.15);
}

.overdue-tag {
  font-size: 11px;
  padding: 2px 6px;
}

.task-title {
  flex: 1;
  min-width: 0;
  word-break: break-word;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.01em;
}

/* 确保 n-text 组件内的文字颜色正确显示 */
:deep(.task-title) {
  color: #000000;
}

body.dark :deep(.task-title),
html.dark :deep(.task-title) {
  color: #ffffff;
}

.story-points-tag {
  flex-shrink: 0;
}

.delete-btn {
  flex-shrink: 0;
  opacity: 0.5;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn:hover {
  opacity: 1;
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.task-description {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6) !important;
  margin-bottom: 12px;
  word-break: break-word;
  line-height: 1.6;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  letter-spacing: -0.01em;
}

body.dark .task-description,
html.dark .task-description {
  color: rgba(255, 255, 255, 0.6) !important;
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 0.5px solid rgba(0, 0, 0, 0.06);
  gap: 8px;
  flex-wrap: wrap;
}

body.dark .task-footer,
html.dark .task-footer {
  border-top-color: rgba(255, 255, 255, 0.06);
}

.due-date-overdue {
  color: #ff3b30 !important;
  font-weight: 600;
}
</style>






