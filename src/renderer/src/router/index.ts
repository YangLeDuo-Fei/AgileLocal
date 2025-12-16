// 路由配置

import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import BoardView from '../views/BoardView.vue';
import GitSyncView from '../views/GitSyncView.vue';
import SettingsView from '../views/SettingsView.vue';

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
        },
        {
            path: '/project/:id/board',
            name: 'board',
            component: BoardView,
            props: true,
        },
        {
            path: '/git-sync',
            name: 'git-sync',
            component: GitSyncView,
        },
        {
            path: '/settings',
            name: 'settings',
            component: SettingsView,
        },
    ],
});

// 路由守卫：捕获路由错误
router.beforeEach((to, from, next) => {
    try {
        next();
    } catch (error) {
        console.error('Router beforeEach error:', error);
        next('/');
    }
});

export default router;






