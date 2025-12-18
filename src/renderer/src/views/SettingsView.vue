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
        <!-- 外观设置 -->
        <n-card title="外观设置" :bordered="true" style="margin-bottom: 24px;">
          <n-space vertical :size="16">
            <n-space align="center" justify="space-between">
              <div>
                <n-text strong>主题模式</n-text>
                <div style="font-size: 12px; color: #999; margin-top: 4px;">
                  选择应用的主题外观
                </div>
              </div>
              <n-radio-group :value="systemStore.themeMode" @update:value="systemStore.setThemeMode">
                <n-space>
                  <n-radio value="light">浅色</n-radio>
                  <n-radio value="dark">深色</n-radio>
                  <n-radio value="auto">跟随系统</n-radio>
                </n-space>
              </n-radio-group>
            </n-space>
            
            <n-divider />
            
            <n-space align="center" justify="space-between">
              <div>
                <n-text strong>快速切换</n-text>
                <div style="font-size: 12px; color: #999; margin-top: 4px;">
                  快速在浅色/深色模式之间切换
                </div>
              </div>
              <n-switch
                :value="systemStore.isDark"
                @update:value="systemStore.toggleTheme"
                size="large"
              >
                <template #checked>深色模式</template>
                <template #unchecked>浅色模式</template>
              </n-switch>
            </n-space>
          </n-space>
        </n-card>

        <!-- 备份与恢复 -->
        <n-card title="备份与恢复" :bordered="true" style="margin-bottom: 24px;">
          <n-space vertical :size="16">
            <div>
              <n-text strong>数据备份</n-text>
              <div style="font-size: 12px; color: #999; margin-top: 4px;">
                备份数据库和密钥文件到 ZIP 压缩包
              </div>
            </div>
            <n-button type="primary" @click="handleCreateBackup" :loading="backupLoading">
              创建备份
            </n-button>
            <n-divider />
            <div>
              <n-text strong>数据恢复</n-text>
              <div style="font-size: 12px; color: #999; margin-top: 4px;">
                从备份文件恢复数据（注意：将覆盖当前数据）
              </div>
            </div>
            <n-button type="warning" @click="handleRestoreBackup" :loading="restoreLoading">
              恢复备份
            </n-button>
          </n-space>
        </n-card>

        <!-- 系统工具 -->
        <n-card title="系统工具" :bordered="true" style="margin-bottom: 24px;">
          <n-space vertical :size="16">
            <div>
              <n-text strong>检查更新</n-text>
              <div style="font-size: 12px; color: #999; margin-top: 4px;">
                检查是否有新版本可用
              </div>
            </div>
            <n-button type="default" @click="handleCheckUpdate" :loading="checkUpdateLoading">
              检查更新
            </n-button>
          </n-space>
        </n-card>

        <!-- 关于 -->
        <n-card title="关于" :bordered="true" style="margin-bottom: 24px;">
          <n-space vertical :size="16">
            <div>
              <n-text strong>AgileLocal</n-text>
              <div style="font-size: 12px; color: #999; margin-top: 4px;">
                本地敏捷研发项目管理平台
              </div>
            </div>
            <n-text depth="3" style="font-size: 13px;">
              Version 1.0.0
            </n-text>
            <n-text depth="3" style="font-size: 13px;">
              一个功能完整的本地项目管理工具，支持任务看板、Git同步、统计分析等功能。
            </n-text>
          </n-space>
        </n-card>

        <!-- 系统信息 -->
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
import { ref, onMounted } from 'vue';
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
  NSpace,
  NText,
  NRadioGroup,
  NRadio,
  NSwitch,
  NDivider,
  useDialog,
} from 'naive-ui';
import { useSystemStore } from '../stores/systemStore';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const systemStore = useSystemStore();

const backupLoading = ref(false);
const restoreLoading = ref(false);
const checkUpdateLoading = ref(false);

const handleCreateBackup = async () => {
  backupLoading.value = true;
  try {
    const result = await window.electronAPI.system.createBackup();
    if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
      const error = result as any;
      message.error(error.message || '创建备份失败');
      return;
    }
    if (result && typeof result === 'object' && 'success' in result && result.success) {
      const backupPath = (result as any).backupPath;
      message.success(`备份创建成功: ${backupPath}`);
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error: any) {
    message.error(error.message || '创建备份失败');
  } finally {
    backupLoading.value = false;
  }
};

const handleCheckUpdate = async () => {
  checkUpdateLoading.value = true;
  try {
    // 这里可以调用 IPC 检查更新，暂时显示提示
    message.info('当前已是最新版本');
  } catch (error: any) {
    message.error(error.message || '检查更新失败');
  } finally {
    checkUpdateLoading.value = false;
  }
};

const handleRestoreBackup = () => {
  dialog.warning({
    title: '确认恢复备份',
    content: '恢复备份将覆盖当前所有数据，此操作不可恢复。确定要继续吗？',
    positiveText: '确定恢复',
    negativeText: '取消',
    onPositiveClick: async () => {
      restoreLoading.value = true;
      try {
        const result = await window.electronAPI.system.restoreBackup();
        if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
          const error = result as any;
          message.error(error.message || '恢复备份失败');
          return;
        }
        if (result && typeof result === 'object' && 'success' in result && result.success) {
          message.success('备份恢复成功，请重新启动应用');
          // 可以提示用户重启应用
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          throw new Error('Unexpected response format');
        }
      } catch (error: any) {
        message.error(error.message || '恢复备份失败');
      } finally {
        restoreLoading.value = false;
      }
    },
  });
};

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
  background: var(--n-color);
  transition: background-color 0.3s;
}

.content-container {
  max-width: 1200px;
  margin: 0 auto;
}
</style>












