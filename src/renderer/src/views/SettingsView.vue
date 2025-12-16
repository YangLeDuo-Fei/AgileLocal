<!-- 系统设置视图 -->
<template>
  <n-layout class="app-layout">
    <n-layout-header class="app-header" bordered>
      <div class="header-content">
        <n-button text @click="router.push('/')">
          ← 返回首页
        </n-button>
        <h1 class="app-title">系统设置</h1>
      </div>
    </n-layout-header>

    <n-layout-content class="app-content">
      <div class="content-container">
        <n-card title="系统信息" :bordered="true">
          <n-spin :show="systemStore.loading">
            <n-descriptions v-if="systemStore.systemInfo" :column="1" bordered>
              <n-descriptions-item label="应用版本">
                {{ systemStore.systemInfo.version }}
              </n-descriptions-item>
              <n-descriptions-item label="数据目录">
                {{ systemStore.systemInfo.userDataPath }}
              </n-descriptions-item>
              <n-descriptions-item label="数据库路径">
                {{ systemStore.systemInfo.dbPath }}
              </n-descriptions-item>
              <n-descriptions-item label="日志路径">
                {{ systemStore.systemInfo.logPath }}
              </n-descriptions-item>
              <n-descriptions-item label="密钥文件路径">
                {{ systemStore.systemInfo.secretsPath }}
              </n-descriptions-item>
            </n-descriptions>
          </n-spin>
        </n-card>
      </div>
    </n-layout-content>
  </n-layout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import {
  NLayout,
  NLayoutHeader,
  NLayoutContent,
  NCard,
  NButton,
  NSpin,
  NDescriptions,
  NDescriptionsItem,
} from 'naive-ui';
import { useSystemStore } from '../stores/systemStore';

const router = useRouter();
const message = useMessage();
const systemStore = useSystemStore();

onMounted(async () => {
  try {
    await systemStore.loadSystemInfo();
  } catch (error: any) {
    message.error(error.message || '加载系统信息失败');
  }
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
  background: #f5f7fa;
}

.content-container {
  max-width: 1200px;
  margin: 0 auto;
}
</style>






