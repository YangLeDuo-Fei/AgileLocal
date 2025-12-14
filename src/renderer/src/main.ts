// 严格按照 V！.md v2025.PerfectScore.Final 生成
// Vue 应用入口文件

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import naive from 'naive-ui';
import App from './App.vue';
import router from './router';

const app = createApp(App);

// 使用 Pinia
const pinia = createPinia();
app.use(pinia);

// 使用 Naive UI
app.use(naive);

// 使用 Vue Router
app.use(router);

app.mount('#app');

