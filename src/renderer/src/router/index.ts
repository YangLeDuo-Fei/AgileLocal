// 路由配置

import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import BoardView from '../views/BoardView.vue';
import GitSyncView from '../views/GitSyncView.vue';
import SettingsView from '../views/SettingsView.vue';
import StatisticsView from '../views/StatisticsView.vue';
import PasswordSetupView from '../views/PasswordSetupView.vue';
import PasswordVerifyView from '../views/PasswordVerifyView.vue';
import SprintManagementView from '../views/SprintManagementView.vue';

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
            path: '/project/:id/sprints',
            name: 'sprints',
            component: SprintManagementView,
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
        {
            path: '/statistics',
            name: 'statistics',
            component: StatisticsView,
        },
        {
            path: '/password/setup',
            name: 'password-setup',
            component: PasswordSetupView,
        },
        {
            path: '/password/verify',
            name: 'password-verify',
            component: PasswordVerifyView,
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












