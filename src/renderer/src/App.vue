<!-- 严格按照 V！.md v2025.PerfectScore.Final 生成 -->
<template>
  <n-config-provider>
    <n-message-provider>
      <ErrorBoundary>
        <router-view />
      </ErrorBoundary>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import {
  NConfigProvider,
  NMessageProvider,
} from 'naive-ui';
import ErrorBoundary from './components/ErrorBoundary.vue';
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
</style>
