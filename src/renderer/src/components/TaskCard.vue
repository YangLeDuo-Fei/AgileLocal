<!-- 任务卡片组件 -->
<template>
  <n-card
    size="small"
    hoverable
    class="task-card"
    :class="taskCardClass"
    @click="handleEdit"
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
      <n-button
        text
        size="tiny"
        type="error"
        class="delete-btn"
        @click.stop="handleDelete"
      >
        ×
      </n-button>
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
        <n-text v-if="task.due_date" depth="3" style="font-size: 11px;" :class="getDueDateClass(task.due_date)">
          📅 {{ formatDueDate(task.due_date) }}
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

// 任务卡片样式类（根据状态）
const taskCardClass = computed(() => {
  return {
    'task-card--todo': props.task.status === 'ToDo',
    'task-card--doing': props.task.status === 'Doing',
    'task-card--done': props.task.status === 'Done',
  };
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

// 格式化截止日期
const formatDueDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days < 0) {
    return `已逾期${Math.abs(days)}天`;
  } else if (days === 0) {
    return '今天截止';
  } else if (days === 1) {
    return '明天截止';
  } else if (days < 7) {
    return `${days}天后截止`;
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
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
  emit('edit', props.task.id);
};

const handleDelete = () => {
  emit('delete', props.task.id);
};
</script>

<style scoped>
.task-card {
  cursor: pointer;
  margin-bottom: 8px;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.task-card--todo {
  border-left-color: #2080f0;
}

.task-card--doing {
  border-left-color: #f0a020;
}

.task-card--done {
  border-left-color: #18a058;
  opacity: 0.9;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  gap: 8px;
}

.task-title-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.task-title {
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.story-points-tag {
  flex-shrink: 0;
}

.delete-btn {
  flex-shrink: 0;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.delete-btn:hover {
  opacity: 1;
}

.task-description {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  margin-bottom: 8px;
  word-break: break-word;
  line-height: 1.5;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.due-date-overdue {
  color: #d03050 !important;
  font-weight: 600;
}
</style>


