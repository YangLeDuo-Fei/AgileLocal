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

export default router;
