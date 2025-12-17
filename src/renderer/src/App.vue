<!-- 严格按照 V！.md v2025.PerfectScore.Final 生成 -->
<template>
  <n-config-provider :theme="systemStore.theme">
    <n-message-provider>
      <n-dialog-provider>
        <ErrorBoundary>
          <router-view v-slot="{ Component, route }">
            <transition name="fade" mode="out-in">
              <component :is="Component" :key="route.path" />
            </transition>
          </router-view>
        </ErrorBoundary>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
} from 'naive-ui';
import ErrorBoundary from './components/ErrorBoundary.vue';
import { useSystemStore } from './stores/systemStore';

const systemStore = useSystemStore();

import { useRouter } from 'vue-router';
const router = useRouter();

// 检查是否需要主密码
const checkPasswordRequirement = async () => {
  try {
    const result = await window.electronAPI.password.checkRequired();
    if (result && typeof result === 'object' && 'success' in result && result.success) {
      if (result.required) {
        const currentPath = router.currentRoute.value.path;
        if (currentPath !== '/password/setup' && currentPath !== '/password/verify') {
          // 根据 needsSetup 判断是设置还是验证
          if (result.needsSetup) {
            router.push('/password/setup');
          } else {
            router.push('/password/verify');
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to check password requirement:', error);
  }
};

// 监听系统主题变化（当 themeMode 为 auto 时）
onMounted(() => {
  // 检查是否需要主密码
  checkPasswordRequirement();

  if (systemStore.themeMode === 'auto') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // 主题会自动通过 getter 计算，无需手动更新
      // 如果需要强制更新视图，可以触发一个响应式变量
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // 兼容旧浏览器
      mediaQuery.addListener(handleChange);
    }
  }
});
</script>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
}

/* 页面过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
