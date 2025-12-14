<!-- 严格按照 V！.md v2025.PerfectScore.Final 生成 -->
<template>
  <div id="app">
    <h1>AgileLocal</h1>
    <p>Phase 1 & 2: 基础设施与数据库层 - 初始化完成</p>
    <div v-if="dbError" style="color: red; margin-top: 20px; padding: 10px; background: #ffe6e6; border-radius: 4px;">
      <h3>数据库初始化失败</h3>
      <p>{{ dbError }}</p>
      <p style="font-size: 12px; margin-top: 10px;">
        提示：需要安装 Visual Studio Build Tools 来编译原生模块（better-sqlite3-multiple-ciphers）
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const dbError = ref<string | null>(null);

onMounted(() => {
  // 检查数据库状态（后续可以通过 IPC 获取）
  // 暂时留空，错误信息会通过日志显示
});
</script>

<style>
body {
  margin: 0;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>

