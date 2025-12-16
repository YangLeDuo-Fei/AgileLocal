// 系统状态管理 (Pinia Store)

import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface SystemInfo {
    userDataPath: string;
    dbPath: string;
    logPath: string;
    secretsPath: string;
    version: string;
}

export const useSystemStore = defineStore('system', () => {
    const systemInfo = ref<SystemInfo | null>(null);
    const loading = ref(false);

    /**
     * 加载系统信息
     */
    async function loadSystemInfo() {
        loading.value = true;
        try {
            const result = await window.electronAPI.system.getInfo();
            if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
                // IPC 返回了错误
                const error = result as any;
                throw new Error(error.message || 'Failed to load system info');
            }
            if (result && typeof result === 'object' && 'success' in result && result.success) {
                systemInfo.value = (result as any).info || null;
            } else {
                throw new Error('Unexpected response format');
            }
        } catch (error) {
            console.error('Failed to load system info:', error);
            throw error;
        } finally {
            loading.value = false;
        }
    }

    return {
        systemInfo,
        loading,
        loadSystemInfo,
    };
});






