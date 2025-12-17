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
          <!-- 项目选择 -->
          <n-card title="项目筛选" :bordered="true" style="margin-bottom: 24px;">
            <n-space align="center" vertical>
              <n-space align="center">
                <n-text strong>选择项目：</n-text>
                <n-select
                  v-model:value="selectedProjectId"
                  :options="projectOptions"
                  placeholder="选择要查看统计的项目"
                  style="width: 300px;"
                  @update:value="handleProjectChange"
                />
              </n-space>
              <n-space align="center" v-if="selectedProjectId && sprintOptions.length > 0">
                <n-text strong>Sprint 筛选：</n-text>
                <n-select
                  v-model:value="selectedSprintId"
                  :options="sprintOptions"
                  placeholder="选择 Sprint（可选，显示所有任务）"
                  clearable
                  style="width: 300px;"
                  @update:value="handleSprintChange"
                />
              </n-space>
            </n-space>
          </n-card>
          
          <!-- 任务状态分布 -->
          <n-card title="任务状态分布" :bordered="true" style="margin-bottom: 24px;">
            <div ref="statusChartRef" style="width: 100%; height: 400px;"></div>
          </n-card>

          <!-- 燃尽图 -->
          <n-card :bordered="true" style="margin-bottom: 24px;">
            <template #header>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span>燃尽图</span>
                <n-tag v-if="getSprintName" size="small" type="info">
                  Sprint: {{ getSprintName }}
                </n-tag>
                <n-text v-if="burndownDataRef?.isSprintJustStarted" depth="3" style="font-size: 12px;">
                  Sprint 于今天开始，预计均匀完成任务
                </n-text>
              </div>
            </template>
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
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
  NSelect,
  NSpace,
  NText,
  NTag,
} from 'naive-ui';
import * as echarts from 'echarts';
import { useTaskStore } from '../stores/taskStore';
import { useProjectStore } from '../stores/projectStore';
import { useSprintStore } from '../stores/sprintStore';

const router = useRouter();
const message = useMessage();
const taskStore = useTaskStore();
const projectStore = useProjectStore();
const sprintStore = useSprintStore();

const loading = ref(false);
const statusChartRef = ref<HTMLDivElement | null>(null);
const burndownChartRef = ref<HTMLDivElement | null>(null);
let statusChart: echarts.ECharts | null = null;
let burndownChart: echarts.ECharts | null = null;

const selectedProjectId = ref<number | null>(null);
const selectedSprintId = ref<number | null>(null);
const burndownDataRef = ref<{ isSprintJustStarted?: boolean } | null>(null);

const projectOptions = computed(() => {
  return projectStore.projects.map(p => ({
    label: p.name,
    value: p.id,
  }));
});

const sprintOptions = computed(() => {
  if (!selectedProjectId.value) return [];
  const sprints = sprintStore.sprints.filter(s => s.project_id === selectedProjectId.value);
  return sprints.map(s => ({
    label: `${s.name} (${s.status === 'Active' ? '进行中' : s.status === 'Closed' ? '已关闭' : '计划中'})`,
    value: s.id,
  }));
});

const statistics = ref({
  totalTasks: 0,
  completedTasks: 0,
  inProgressTasks: 0,
  todoTasks: 0,
});

const handleProjectChange = async (projectId: number | null) => {
  if (projectId) {
    projectStore.setCurrentProject(projectId);
    selectedSprintId.value = null; // 切换项目时清空 Sprint 选择
    // 加载该项目的 Sprint 列表
    try {
      await sprintStore.loadSprints(projectId);
    } catch (error: any) {
      console.error('Failed to load sprints:', error);
    }
    await loadStatistics();
  }
};

const handleSprintChange = async (sprintId: number | null) => {
  selectedSprintId.value = sprintId;
  await loadStatistics();
};

const loadStatistics = async () => {
  loading.value = true;
  try {
    // 使用选中的项目ID，如果没有则使用当前项目ID
    const projectId = selectedProjectId.value || projectStore.currentProjectId;
    if (projectId) {
      // 根据选中的 Sprint 加载任务
      await taskStore.loadTasks(projectId, selectedSprintId.value || undefined);
      
      let tasks = taskStore.tasks;
      
      // 如果选择了 Sprint，进一步过滤任务
      if (selectedSprintId.value) {
        tasks = tasks.filter(t => t.sprint_id === selectedSprintId.value);
      }
      
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

// 计算燃尽图真实数据 - 彻底重写，使用最简单可靠的顺序逻辑
const calculateBurndownData = (tasks?: any[]) => {
  const taskList = tasks || taskStore.tasks;
  if (taskList.length === 0) {
    return {
      dates: [],
      remainingTasks: [],
      idealLine: [],
      totalTasks: 0,
      dateLabels: [],
      isSprintJustStarted: false,
    };
  }

  // 获取今天的日期（设置为当天0点），使用本地时区避免UTC问题
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  
  // 强制调试：输出实际的today值
  console.log('[Burndown] 系统时间 now:', now.toString());
  console.log('[Burndown] 计算后的 today:', today.toString(), 'ISO:', today.toISOString().split('T')[0]);

  // 步骤1：生成日期数组（从Sprint开始到结束，今天可能在左边或中间）
  const dates: Date[] = [];
  let isSprintJustStarted = false;
  let sprintStartDate: Date | null = null;
  let sprintEndDate: Date | null = null;
  
  if (selectedSprintId.value) {
    const sprint = sprintStore.sprints.find(s => s.id === selectedSprintId.value);
    if (sprint) {
      // 使用本地时区解析Sprint日期
      const startDateStr = sprint.start_date;
      const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
      sprintStartDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
      
      const endDateStr = sprint.end_date;
      const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
      sprintEndDate = new Date(endYear, endMonth - 1, endDay, 0, 0, 0, 0);
      
      // 判断Sprint是否今天开始（开始日期在今天或最近3天内）
      const daysFromToday = Math.floor((sprintStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      isSprintJustStarted = daysFromToday >= -3 && daysFromToday <= 0;
      
      // 生成日期数组：从Sprint开始日期到结束日期（包括）
      // 这样今天会在左边（如果Sprint今天开始）或中间位置
      let current = new Date(sprintStartDate);
      while (current <= sprintEndDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    } else {
      // Sprint不存在，使用最近14天（从13天前到今天，共14天）
      for (let i = 13; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i, 0, 0, 0, 0);
        dates.push(date);
      }
    }
  } else {
    // 没有选择Sprint，使用最近14天（从13天前到今天，共14天）
    // 注意：i从13到0，所以 i=0 时是今天（today.getDate() - 0 = today）
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i, 0, 0, 0, 0);
      dates.push(date);
    }
    // 调试：验证生成的第一个和最后一个日期
    console.log('[Burndown] 生成的日期数组（无Sprint）: 第一个=', dates[0]?.toISOString().split('T')[0], '最后一个=', dates[dates.length - 1]?.toISOString().split('T')[0]);
  }

  if (dates.length === 0) {
    return {
      dates: [],
      remainingTasks: [],
      idealLine: [],
      totalTasks: 0,
      dateLabels: [],
      isSprintJustStarted: false,
    };
  }

  // 步骤2：计算实际剩余数组（对应dates顺序）
  const remainingTasks: number[] = [];
  
  // 先计算今天的实际剩余任务数（用于填充未来日期）
  let todayRemainingCount = 0;
  if (dates.length > 0) {
    // 找到今天在dates数组中的索引
    const todayIndex = dates.findIndex(d => d.getTime() === today.getTime());
    
    taskList.forEach(task => {
      // 使用本地时区解析任务创建时间
      const createdDate = new Date(task.created_at);
      const created = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate(), 0, 0, 0, 0);
      
      if (created > today) return;
      
      if (task.status === 'Done') {
        const completedDate = new Date(task.updated_at || task.created_at);
        const completed = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate(), 0, 0, 0, 0);
        if (completed <= today) return;
      }
      todayRemainingCount++;
    });
  }
  
  dates.forEach((date, index) => {
    // 如果日期在未来（大于今天），使用今天的剩余值填充
    if (date > today) {
      remainingTasks.push(todayRemainingCount);
      return;
    }
    
    // 对于今天及之前的日期，计算真实剩余任务数
    let count = 0;
    
    taskList.forEach(task => {
      // 归一化任务创建时间到0点（使用本地时区）
      const createdDate = new Date(task.created_at);
      const created = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate(), 0, 0, 0, 0);
      
      // 如果任务在该日期之后才创建，不计入
      if (created > date) {
        return;
      }
      
      // 如果任务已完成，检查完成时间
      if (task.status === 'Done') {
        const completedDate = new Date(task.updated_at || task.created_at);
        const completed = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate(), 0, 0, 0, 0);
        
        // 如果任务在该日期或之前完成，不计入剩余
        if (completed <= date) {
          return;
        }
      }
      
      // 任务符合条件：已创建且在该日期结束时仍未完成
      count++;
    });
    
    remainingTasks.push(count);
  });
  
  // 步骤3：计算理想线数组
  // 理想线：从开始日期的总任务数线性下降到结束日期的0
  const totalTasks = taskList.length;
  const totalDays = dates.length;
  const idealLine: number[] = [];
  
  if (totalDays <= 1) {
    // 只有一天，理想线从总任务数到0
    idealLine.push(totalTasks);
    idealLine.push(0);
  } else {
    dates.forEach((_, i) => {
      // 计算剩余天数（包括当前日期）
      // remainingDays = 从当前日期到结束日期的剩余天数
      // 第一天：remainingDays = totalDays，理想值 = totalTasks
      // 最后一天：remainingDays = 1，理想值应该接近0，但确保最后一天是0
      const remainingDays = totalDays - i;
      let ideal: number;
      if (i === totalDays - 1) {
        // 最后一天，强制为0
        ideal = 0;
      } else {
        // 理想剩余任务数 = 总任务 * (剩余天数 - 1) / (总天数 - 1)
        // 这样第一天（i=0）理想值 = 总任务数，最后一天（i=totalDays-1）理想值 = 0
        ideal = Math.round((totalTasks * (remainingDays - 1)) / (totalDays - 1));
      }
      idealLine.push(Math.max(0, ideal));
    });
  }
  
  // 步骤4：生成日期标签（今天标记为"今天（起点）"）
  const dateLabels = dates.map(date => {
    const isToday = date.getTime() === today.getTime();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    // 如果Sprint今天开始，今天标记为"今天（起点）"
    return isToday && isSprintJustStarted ? '今天（起点）' : isToday ? '今天' : `${month}月${day}日`;
  });
  
  // 转换为字符串数组用于返回（注意：toISOString会转换为UTC，可能导致日期偏移）
  // 使用本地日期格式化避免UTC转换问题
  const dateStrings = dates.map(date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  // 步骤5：强制调试日志（使用本地日期格式化）
  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const todayIndex = dates.findIndex(d => d.getTime() === today.getTime());
  console.log('[Burndown] ========== 燃尽图数据 ==========');
  console.log('[Burndown] Sprint开始日期:', sprintStartDate ? formatDateLocal(sprintStartDate) : '无');
  console.log('[Burndown] Sprint结束日期:', sprintEndDate ? formatDateLocal(sprintEndDate) : '无');
  console.log('[Burndown] Sprint今天开始:', isSprintJustStarted);
  console.log('[Burndown] 日期数组（从开始到结束）:', dates.map(d => formatDateLocal(d)));
  console.log('[Burndown] 今天在数组位置:', todayIndex, todayIndex >= 0 ? formatDateLocal(dates[todayIndex]) : '未找到');
  console.log('[Burndown] 实际剩余任务:', remainingTasks);
  console.log('[Burndown] 理想剩余任务:', idealLine);
  console.log('[Burndown] 总任务数:', totalTasks);
  console.log('[Burndown] 今天剩余（应匹配看板）:', todayIndex >= 0 ? remainingTasks[todayIndex] : '今天不在范围内');
  console.log('[Burndown] =================================');

  return {
    dates: dateStrings,
    remainingTasks,
    idealLine,
    totalTasks,
    dateLabels,
    isSprintJustStarted,
  };
};

// 获取当前选择的 Sprint 名称（用于图表标题）
const getSprintName = computed(() => {
  if (!selectedSprintId.value) return null;
  const sprint = sprintStore.sprints.find(s => s.id === selectedSprintId.value);
  return sprint ? sprint.name : null;
});

const updateBurndownChart = () => {
  if (!burndownChartRef.value) return;

  if (!burndownChart) {
    burndownChart = echarts.init(burndownChartRef.value);
  }

  // 计算真实燃尽图数据（传入过滤后的任务列表）
  const filteredTasks = selectedSprintId.value 
    ? taskStore.tasks.filter(t => t.sprint_id === selectedSprintId.value)
    : taskStore.tasks;
  const burndownData = calculateBurndownData(filteredTasks);
  
  // 更新 burndownDataRef 以便模板使用
  burndownDataRef.value = {
    isSprintJustStarted: burndownData.isSprintJustStarted,
  };

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const dateIndex = params[0].dataIndex;
        const dateStr = burndownData.dates[dateIndex];
        // 解析本地日期字符串（YYYY-MM-DD格式）
        const [year, month, day] = dateStr.split('-').map(Number);
        const formattedDate = `${year}年${month}月${day}日`;
        let result = `${formattedDate}<br/>`;
        params.forEach((item: any) => {
          const value = item.value !== null && item.value !== undefined ? item.value : 0;
          result += `${item.marker}${item.seriesName}: ${value}个<br/>`;
        });
        return result;
      },
    },
    legend: {
      data: ['剩余任务', '理想燃尽线'],
      top: 10,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: burndownData.dateLabels || burndownData.dates.map(d => {
        // 解析本地日期字符串（YYYY-MM-DD格式）
        const [year, month, day] = d.split('-').map(Number);
        return `${month}月${day}日`;
      }),
      axisLabel: {
        fontSize: 12,
        rotate: 45, // 倾斜45度避免重叠
        formatter: (value: string, index: number) => {
          // 如果是"今天"或"今天（起点）"，加粗蓝色显示
          if (value === '今天' || value === '今天（起点）') {
            return `{b|${value}}`;
          }
          return value;
        },
        rich: {
          b: {
            fontWeight: 'bold',
            color: '#007aff',
          },
        },
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      name: '任务数',
      axisLabel: {
        fontSize: 12,
      },
    },
    series: [
      {
        name: '剩余任务',
        type: 'line',
        smooth: true,
        lineStyle: {
          color: '#007aff',
          width: 2,
        },
        itemStyle: {
          color: '#007aff',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 122, 255, 0.3)' },
              { offset: 1, color: 'rgba(0, 122, 255, 0.05)' },
            ],
          },
        },
        data: burndownData.remainingTasks,
      },
      {
        name: '理想燃尽线',
        type: 'line',
        smooth: false,
        lineStyle: {
          color: '#34c759',
          width: 2,
          type: 'dashed', // 理想线始终用虚线
        },
        itemStyle: {
          color: '#34c759',
        },
        data: burndownData.idealLine,
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

  // 初始化选中的项目ID（使用当前项目或第一个项目）
  if (projectStore.currentProjectId) {
    selectedProjectId.value = projectStore.currentProjectId;
  } else if (projectStore.projects.length > 0) {
    selectedProjectId.value = projectStore.projects[0].id;
    projectStore.setCurrentProject(projectStore.projects[0].id);
  }

  // 如果有选中的项目，加载 Sprint 列表
  if (selectedProjectId.value) {
    try {
      await sprintStore.loadSprints(selectedProjectId.value);
    } catch (error: any) {
      console.error('Failed to load sprints:', error);
    }
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





