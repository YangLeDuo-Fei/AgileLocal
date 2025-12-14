<!-- 严格按照 V！.md v2025.PerfectScore.Final 生成 -->
<template>
  <div class="board-container">
    <n-layout>
      <n-layout-content style="padding: 20px;">
        <DndContext
          :sensors="sensors"
          :collision-detection="closestCenter"
          @drag-end="handleDragEnd"
        >
          <n-space horizontal :size="20" style="height: 100%;">
            <!-- ToDo 列 -->
            <n-card
              :title="`ToDo (${todoTasks.length})`"
              style="width: 300px; height: 100%;"
              :bordered="true"
            >
              <SortableContext
                :items="todoTaskIds"
                :strategy="verticalListSortingStrategy"
              >
                <SortableTaskItem
                  v-for="task in todoTasks"
                  :key="task.id"
                  :id="task.id.toString()"
                  :task="task"
                  style="margin-bottom: 8px;"
                />
              </SortableContext>
            </n-card>

            <!-- Doing 列 -->
            <n-card
              :title="`Doing (${doingTasks.length})`"
              style="width: 300px; height: 100%;"
              :bordered="true"
            >
              <SortableContext
                :items="doingTaskIds"
                :strategy="verticalListSortingStrategy"
              >
                <SortableTaskItem
                  v-for="task in doingTasks"
                  :key="task.id"
                  :id="task.id.toString()"
                  :task="task"
                  style="margin-bottom: 8px;"
                />
              </SortableContext>
            </n-card>

            <!-- Done 列 -->
            <n-card
              :title="`Done (${doneTasks.length})`"
              style="width: 300px; height: 100%;"
              :bordered="true"
            >
              <SortableContext
                :items="doneTaskIds"
                :strategy="verticalListSortingStrategy"
              >
                <SortableTaskItem
                  v-for="task in doneTasks"
                  :key="task.id"
                  :id="task.id.toString()"
                  :task="task"
                  style="margin-bottom: 8px;"
                />
              </SortableContext>
            </n-card>
          </n-space>
        </DndContext>
      </n-layout-content>
    </n-layout>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { NCard, NLayout, NLayoutContent, NSpace, useMessage } from 'naive-ui';
import { debounce } from 'lodash-es';
import { useTaskStore } from '../stores/taskStore';
import SortableTaskItem from '../components/SortableTaskItem.vue';

const taskStore = useTaskStore();
const message = useMessage();

// 配置拖拽传感器
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // 移动 8px 后激活拖拽
    },
  })
);

// 获取指定状态的任务列表（按 kanban_order 排序）
const todoTasks = computed(() => {
  return taskStore.tasks
    .filter((t) => t.status === 'ToDo')
    .sort((a, b) => a.kanban_order - b.kanban_order);
});

const doingTasks = computed(() => {
  return taskStore.tasks
    .filter((t) => t.status === 'Doing')
    .sort((a, b) => a.kanban_order - b.kanban_order);
});

const doneTasks = computed(() => {
  return taskStore.tasks
    .filter((t) => t.status === 'Done')
    .sort((a, b) => a.kanban_order - b.kanban_order);
});

const todoTaskIds = computed(() => todoTasks.value.map((t) => t.id.toString()));
const doingTaskIds = computed(() => doingTasks.value.map((t) => t.id.toString()));
const doneTaskIds = computed(() => doneTasks.value.map((t) => t.id.toString()));

// 防抖的 IPC 调用函数（100ms）
const debouncedUpdateStatus = debounce(
  async (
    taskId: number,
    newStatus: 'ToDo' | 'Doing' | 'Done',
    newOrder: number,
    expectedVersion: number
  ) => {
    const result = await taskStore.updateTaskStatus(
      taskId,
      newStatus,
      newOrder,
      expectedVersion
    );

    if (!result.success) {
      // IPC 调用失败或返回 409_CONFLICT，已经回滚状态
      const error = result.error;
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === '409_CONFLICT') {
          message.error('任务已被其他操作修改，请刷新后重试');
        } else {
          message.error(`更新失败: ${error.message || '未知错误'}`);
        }
      } else {
        message.error('更新失败，请重试');
      }
    }
  },
  100
);

/**
 * 处理拖拽结束事件
 */
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;

  if (!over) {
    return;
  }

  const activeId = active.id as string;
  const overId = over.id as string;

  // 如果拖拽到同一位置，不做处理
  if (activeId === overId) {
    return;
  }

  const taskId = parseInt(activeId);
  const task = taskStore.tasks.find((t) => t.id === taskId);

  if (!task) {
    return;
  }

  // 确定目标状态和位置
  let newStatus: 'ToDo' | 'Doing' | 'Done' = task.status;
  let newOrder = task.kanban_order;

  // 判断是列内拖拽还是跨列拖拽
  const targetTaskId = parseInt(overId);
  const targetTask = taskStore.tasks.find((t) => t.id === targetTaskId);

  if (targetTask) {
    // 有目标任务：可能是列内拖拽或跨列拖拽
    newStatus = targetTask.status;

    // 计算新位置
    const tasksInNewStatus =
      newStatus === 'ToDo' ? todoTasks.value :
      newStatus === 'Doing' ? doingTasks.value :
      doneTasks.value;

    const targetIndex = tasksInNewStatus.findIndex((t) => t.id === targetTaskId);

    if (task.status === newStatus) {
      // 列内拖拽
      const currentIndex = tasksInNewStatus.findIndex((t) => t.id === taskId);
      
      if (currentIndex === -1) {
        return; // 找不到当前任务，不应该发生
      }

      if (currentIndex < targetIndex) {
        // 向后拖拽：插入到目标位置（目标位置的任务会向后移动）
        newOrder = targetTask.kanban_order;
      } else {
        // 向前拖拽：插入到目标位置（目标位置的任务会向后移动）
        newOrder = targetTask.kanban_order;
      }
    } else {
      // 跨列拖拽：插入到目标位置
      newOrder = targetTask.kanban_order;
    }
  } else {
    // 没有目标任务（拖到列容器或空白区域），保持原状态
    // 这种情况不应该发生，但为了安全处理
    return;
  }

  // 如果状态和位置没有变化，不做处理
  if (newStatus === task.status && newOrder === task.kanban_order) {
    return;
  }

  // 立即进行 Pinia 乐观更新（已在 updateTaskStatus 中实现）
  // 使用防抖函数调用 IPC
  debouncedUpdateStatus(taskId, newStatus, newOrder, task.version);
};

onMounted(() => {
  // 加载任务列表（后续实现）
});
</script>

<style scoped>
.board-container {
  width: 100%;
  height: 100vh;
}
</style>

