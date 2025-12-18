<!-- 错误边界组件 -->
<template>
  <div class="error-boundary-wrapper">
    <div v-if="hasError" class="error-boundary">
      <n-card>
        <n-result
          status="error"
          title="组件加载失败"
          :description="errorMessage"
        >
          <template #footer>
            <n-button @click="handleReset">重试</n-button>
            <n-button @click="handleGoHome" style="margin-left: 12px;">
              返回首页
            </n-button>
          </template>
        </n-result>
      </n-card>
    </div>
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';
import { useRouter } from 'vue-router';
import { NCard, NResult, NButton } from 'naive-ui';

const router = useRouter();
const hasError = ref(false);
const errorMessage = ref('未知错误');

const handleReset = () => {
  hasError.value = false;
  errorMessage.value = '未知错误';
  window.location.reload();
};

const handleGoHome = () => {
  router.push('/');
};

onErrorCaptured((err, instance, info) => {
  console.error('ErrorBoundary caught error:', err);
  console.error('Component:', instance);
  console.error('Info:', info);
  
  hasError.value = true;
  errorMessage.value = err?.message || String(err) || '组件渲染失败';
  
  // 返回 false 阻止错误继续传播
  return false;
});
</script>

<style scoped>
.error-boundary-wrapper {
  width: 100%;
  height: 100vh;
}

.error-boundary {
  padding: 24px;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>








