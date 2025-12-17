<!-- 统计视图 -->
<template>
  <n-layout class="app-layout">
    <n-layout-header class="app-header" bordered>
      <div class="header-content">
        <n-button text @click="router.push('/')">
          ← 返回首页
        </n-button>
        <h1 class="app-title">统计分析</h1>
      </div>
    </n-layout-header>

    <n-layout-content class="app-content">
      <div class="content-container">
        <n-spin :show="loading">
          <!-- 任务状态分布 -->
          <n-card title="任务状态分布" :bordered="true" style="margin-bottom: 24px;">
            <div ref="statusChartRef" style="width: 100%; height: 400px;"></div>
          </n-card>

          <!-- 燃尽图 -->
          <n-card title="燃尽图" :bordered="true" style="margin-bottom: 24px;">
            <div ref="burndownChartRef" style="width: 100%; height: 400px;"></div>
          </n-card>

          <!-- 项目统计 -->
          <n-grid :cols="3" :x-gap="16">
            <n-gi>
              <n-card :bordered="true">
                <n-statistic label="总任务数" :value="statistics.totalTasks" />
              </n-card>
            </n-gi>
            <n-gi>
              <n-card :bordered="true">
                <n-statistic label="已完成" :value="statistics.completedTasks" />
              </n-card>
            </n-gi>
            <n-gi>
              <n-card :bordered="true">
                <n-statistic label="进行中" :value="statistics.inProgressTasks" />
              </n-card>
            </n-gi>
          </n-grid>
        </n-spin>
      </div>
    </n-layout-content>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import {
  NLayout,
  NLayoutHeader,
  NLayoutContent,
  NCard,
  NButton,
  NSpin,
  NGrid,
  NGi,
  NStatistic,
} from 'naive-ui';
import * as echarts from 'echarts';
import { useTaskStore } from '../stores/taskStore';
import { useProjectStore } from '../stores/projectStore';

const router = useRouter();
const message = useMessage();
const taskStore = useTaskStore();
const projectStore = useProjectStore();

const loading = ref(false);
const statusChartRef = ref<HTMLDivElement | null>(null);
const burndownChartRef = ref<HTMLDivElement | null>(null);
let statusChart: echarts.ECharts | null = null;
let burndownChart: echarts.ECharts | null = null;

const statistics = ref({
  totalTasks: 0,
  completedTasks: 0,
  inProgressTasks: 0,
  todoTasks: 0,
});

const loadStatistics = async () => {
  loading.value = true;
  try {
    // 如果有当前项目，加载该项目的任务
    const projectId = projectStore.currentProjectId;
    if (projectId) {
      await taskStore.loadTasks(projectId);
      
      const tasks = taskStore.tasks;
      statistics.value = {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'Done').length,
        inProgressTasks: tasks.filter(t => t.status === 'Doing').length,
        todoTasks: tasks.filter(t => t.status === 'ToDo').length,
      };

      // 更新图表
      await nextTick();
      updateStatusChart();
      updateBurndownChart();
    } else {
      // 如果没有当前项目，显示提示
      message.warning('请先选择一个项目');
    }
  } catch (error: any) {
    message.error(error.message || '加载统计数据失败');
  } finally {
    loading.value = false;
  }
};

const updateStatusChart = () => {
  if (!statusChartRef.value || !statistics.value) return;

  if (!statusChart) {
    statusChart = echarts.init(statusChartRef.value);
  }

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: '任务状态',
        type: 'pie',
        radius: '50%',
        data: [
          { value: statistics.value.todoTasks, name: '待办' },
          { value: statistics.value.inProgressTasks, name: '进行中' },
          { value: statistics.value.completedTasks, name: '已完成' },
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  statusChart.setOption(option);
};

const updateBurndownChart = () => {
  if (!burndownChartRef.value) return;

  if (!burndownChart) {
    burndownChart = echarts.init(burndownChartRef.value);
  }

  // 简单的燃尽图示例（可以根据实际需求扩展）
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['剩余任务', '已完成任务'],
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '剩余任务',
        type: 'line',
        stack: 'Total',
        data: [
          statistics.value.totalTasks,
          statistics.value.totalTasks - statistics.value.completedTasks * 0.2,
          statistics.value.totalTasks - statistics.value.completedTasks * 0.4,
          statistics.value.totalTasks - statistics.value.completedTasks * 0.6,
          statistics.value.totalTasks - statistics.value.completedTasks * 0.8,
          statistics.value.totalTasks - statistics.value.completedTasks * 0.9,
          statistics.value.todoTasks + statistics.value.inProgressTasks,
        ],
      },
      {
        name: '已完成任务',
        type: 'line',
        stack: 'Total',
        data: [
          0,
          statistics.value.completedTasks * 0.2,
          statistics.value.completedTasks * 0.4,
          statistics.value.completedTasks * 0.6,
          statistics.value.completedTasks * 0.8,
          statistics.value.completedTasks * 0.9,
          statistics.value.completedTasks,
        ],
      },
    ],
  };

  burndownChart.setOption(option);
};

const handleResize = () => {
  statusChart?.resize();
  burndownChart?.resize();
};

onMounted(async () => {
  // 确保项目列表已加载
  if (projectStore.projects.length === 0) {
    await projectStore.loadProjects();
  }

  // 如果有项目，选择第一个项目
  if (projectStore.projects.length > 0 && !projectStore.currentProjectId) {
    projectStore.setCurrentProject(projectStore.projects[0].id);
  }

  await loadStatistics();
  
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  statusChart?.dispose();
  burndownChart?.dispose();
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
  background: var(--n-color, #f5f7fa);
  transition: background-color 0.3s;
}

.content-container {
  max-width: 1200px;
  margin: 0 auto;
}
</style>

