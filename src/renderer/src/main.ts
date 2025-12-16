// 严格按照 V！.md v2025.PerfectScore.Final 生成
// Vue 应用入口文件

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import naive from 'naive-ui';
import App from './App.vue';
import router from './router';

const app = createApp(App);

// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
    console.error('Vue Error:', err);
    console.error('Component:', instance);
    console.error('Info:', info);
    // 阻止错误导致页面崩溃，但记录详细信息以便调试
    if (err instanceof Error) {
        console.error('Error stack:', err.stack);
    }
};

// 捕获未处理的 Promise 错误
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    // 阻止错误导致页面崩溃
    event.preventDefault();
});

// 捕获全局错误
window.addEventListener('error', (event) => {
    console.error('Global Error:', event.error);
    // 忽略 Autofill API 错误（Chrome DevTools 的警告）
    if (event.message && event.message.includes('Autofill')) {
        event.preventDefault();
        return;
    }
});

// 使用 Pinia
const pinia = createPinia();
app.use(pinia);

// 使用 Naive UI
app.use(naive);

// 使用 Vue Router
app.use(router);

// 路由错误处理
router.onError((error) => {
    console.error('Router Error:', error);
});

app.mount('#app');

