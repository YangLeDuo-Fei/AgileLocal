// 系统状态管理 (Pinia Store)

import { defineStore } from 'pinia';
import { darkTheme } from 'naive-ui';
import type { GlobalTheme } from 'naive-ui';

export interface SystemInfo {
    userDataPath: string;
    dbPath: string;
    logPath: string;
    secretsPath: string;
    version: string;
}

export type ThemeMode = 'light' | 'dark' | 'auto';

export const useSystemStore = defineStore('system', {
    state: () => ({
        themeMode: 'light' as ThemeMode,
        systemInfo: null as SystemInfo | null,
        loading: false,
    }),
    
    getters: {
        // 计算当前应该使用的主题
        theme: (state): GlobalTheme | null => {
            if (state.themeMode === 'dark') {
                return darkTheme;
            }
            if (state.themeMode === 'auto') {
                // 根据系统偏好自动切换
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    return darkTheme;
                }
                return null;
            }
            return null; // light theme (default)
        },
        
        // 判断当前是否为深色模式
        isDark: (state): boolean => {
            if (state.themeMode === 'dark') return true;
            if (state.themeMode === 'auto') {
                return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
            return false;
        },
    },
    
    actions: {
        /**
         * 切换主题模式
         */
        setThemeMode(mode: ThemeMode) {
            this.themeMode = mode;
        },
        
        /**
         * 切换深色/浅色模式（快速切换）
         */
        toggleTheme() {
            if (this.themeMode === 'light') {
                this.themeMode = 'dark';
            } else if (this.themeMode === 'dark') {
                this.themeMode = 'light';
            } else {
                // auto 模式切换到 dark
                this.themeMode = 'dark';
            }
        },

        /**
         * 加载系统信息
         */
        async loadSystemInfo() {
            this.loading = true;
            try {
                const result = await window.electronAPI.system.getInfo();
                if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
                    // IPC 返回了错误
                    const error = result as any;
                    throw new Error(error.message || 'Failed to load system info');
                }
                if (result && typeof result === 'object' && 'success' in result && result.success) {
                    this.systemInfo = (result as any).info || null;
                } else {
                    throw new Error('Unexpected response format');
                }
            } catch (error) {
                console.error('Failed to load system info:', error);
                throw error;
            } finally {
                this.loading = false;
            }
        },
    },
    
    // 持久化配置：只持久化主题模式
    persist: {
        paths: ['themeMode'],
    },
});













