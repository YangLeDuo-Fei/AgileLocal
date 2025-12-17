<!-- 严格按照 V！.md v2025.PerfectScore.Final 生成 -->
<template>
  <n-config-provider :theme="systemStore.theme">
    <n-message-provider>
      <n-dialog-provider>
        <router-view v-slot="{ Component, route }">
          <ErrorBoundary>
            <transition name="fade" mode="out-in">
              <component :is="Component" :key="route.path" />
            </transition>
          </ErrorBoundary>
        </router-view>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
} from 'naive-ui';
import ErrorBoundary from './components/ErrorBoundary.vue';
import { useSystemStore } from './stores/systemStore';

const systemStore = useSystemStore();
const router = useRouter();

// 根据主题模式动态添加/移除 dark 类到 body
watch(() => systemStore.isDark, (isDark) => {
  if (isDark) {
    document.body.classList.add('dark');
    document.documentElement.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
    document.documentElement.classList.remove('dark');
  }
}, { immediate: true });

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
  // 初始化 dark 类
  if (systemStore.isDark) {
    document.body.classList.add('dark');
    document.documentElement.classList.add('dark');
  }

  // 检查是否需要主密码
  checkPasswordRequirement();

  if (systemStore.themeMode === 'auto') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // 主题会自动通过 getter 计算，watch 会自动触发
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
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "SF Pro Text", "SF Pro Display", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-feature-settings: "kern" 1, "liga" 1;
  letter-spacing: -0.01em;
  line-height: 1.5;
}

#app {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
}

/* 页面过渡动画 - 苹果风格平滑过渡 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 全局滚动条样式 - macOS 风格 */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* 深色模式滚动条 */
.dark ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
