<!-- 严格按照 V！.md v2025.PerfectScore.Final 生成 -->
<template>
  <div
    ref="elementRef"
    :style="style"
    v-bind="attributes"
    v-on="listeners"
  >
    <n-card size="small" hoverable>
      <div>{{ task.title }}</div>
      <div style="font-size: 12px; color: #999; margin-top: 4px;">
        Story Points: {{ task.story_points }}
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { NCard } from 'naive-ui';
import type { Task } from '../stores/taskStore';

const props = defineProps<{
  id: string;
  task: Task;
}>();

const {
  attributes,
  listeners,
  setNodeRef: elementRef,
  transform,
  transition,
  isDragging,
} = useSortable({ id: props.id });

const style = computed(() => ({
  transform: CSS.Transform.toString(transform.value),
  transition: transition.value,
  opacity: isDragging.value ? 0.5 : 1,
  cursor: 'grab',
}));
</script>

