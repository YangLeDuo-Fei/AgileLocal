// Sprint Store - Pinia state management

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface Sprint {
    id: number;
    project_id: number;
    name: string;
    start_date: string;
    end_date: string;
    status: 'Planned' | 'Active' | 'Closed';
}

export const useSprintStore = defineStore('sprint', () => {
    const sprints = ref<Sprint[]>([]);
    const currentSprintId = ref<number | null>(null);

    // 获取当前 Sprint
    const currentSprint = computed(() => {
        if (!currentSprintId.value) return null;
        return sprints.value.find(s => s.id === currentSprintId.value) || null;
    });

    // 根据项目ID获取 Sprint 列表
    const getSprintsByProjectId = computed(() => {
        return (projectId: number) => {
            return sprints.value.filter(s => s.project_id === projectId);
        };
    });

    // 根据状态获取 Sprint 列表
    const getSprintsByStatus = computed(() => {
        return (status: 'Planned' | 'Active' | 'Closed') => {
            return sprints.value.filter(s => s.status === status);
        };
    });

    /**
     * 加载项目的所有 Sprint
     */
    async function loadSprints(projectId: number): Promise<void> {
        try {
            // 详细的安全检查和调试信息
            if (!window.electronAPI) {
                console.error('[SprintStore] window.electronAPI is undefined');
                throw new Error('Electron API 未正确初始化：window.electronAPI 不存在');
            }
            if (!window.electronAPI.sprint) {
                console.error('[SprintStore] window.electronAPI.sprint is undefined');
                console.error('[SprintStore] Available API modules:', Object.keys(window.electronAPI || {}));
                throw new Error('Electron API 未正确初始化：sprint 模块不存在');
            }
            if (!window.electronAPI.sprint.getSprints) {
                console.error('[SprintStore] window.electronAPI.sprint.getSprints is undefined');
                console.error('[SprintStore] Available sprint methods:', Object.keys(window.electronAPI.sprint || {}));
                throw new Error('Electron API 未正确初始化：sprint.getSprints 方法不存在');
            }
            
            const result = await window.electronAPI.sprint.getSprints(projectId);
            
            if ('isAppError' in result) {
                throw new Error(result.message);
            }
            
            if (result.success && result.sprints) {
                sprints.value = result.sprints;
            } else {
                sprints.value = [];
            }
        } catch (error) {
            console.error('[SprintStore] Failed to load sprints:', error);
            sprints.value = [];
            throw error;
        }
    }

    /**
     * 创建 Sprint
     */
    async function createSprint(
        projectId: number,
        name: string,
        startDate: string,
        endDate: string,
        status: 'Planned' | 'Active' | 'Closed' = 'Planned'
    ): Promise<number> {
        try {
            // 详细的安全检查和调试信息
            if (!window.electronAPI) {
                console.error('[SprintStore] window.electronAPI is undefined');
                throw new Error('Electron API 未正确初始化：window.electronAPI 不存在');
            }
            if (!window.electronAPI.sprint) {
                console.error('[SprintStore] window.electronAPI.sprint is undefined');
                console.error('[SprintStore] Available API modules:', Object.keys(window.electronAPI || {}));
                throw new Error('Electron API 未正确初始化：sprint 模块不存在');
            }
            if (!window.electronAPI.sprint.create) {
                console.error('[SprintStore] window.electronAPI.sprint.create is undefined');
                console.error('[SprintStore] Available sprint methods:', Object.keys(window.electronAPI.sprint || {}));
                throw new Error('Electron API 未正确初始化：sprint.create 方法不存在');
            }
            
            const result = await window.electronAPI.sprint.create({
                projectId,
                name,
                startDate,
                endDate,
                status,
            });

            if ('isAppError' in result) {
                throw new Error(result.message);
            }

            if (result.success && result.sprintId) {
                // 重新加载 Sprint 列表
                await loadSprints(projectId);
                return result.sprintId;
            } else {
                throw new Error('创建 Sprint 失败：未返回 sprintId');
            }
        } catch (error) {
            console.error('[SprintStore] Failed to create sprint:', error);
            throw error;
        }
    }

    /**
     * 更新 Sprint
     */
    async function updateSprint(
        sprintId: number,
        updates: {
            name?: string;
            startDate?: string;
            endDate?: string;
            status?: 'Planned' | 'Active' | 'Closed';
        }
    ): Promise<void> {
        try {
            if (!window.electronAPI || !window.electronAPI.sprint || !window.electronAPI.sprint.update) {
                throw new Error('Electron API 未正确初始化：sprint.update 不存在');
            }
            
            const result = await window.electronAPI.sprint.update({
                sprintId,
                ...updates,
            });

            if ('isAppError' in result) {
                throw new Error(result.message);
            }

            if (result.success) {
                // 更新本地状态
                const sprint = sprints.value.find(s => s.id === sprintId);
                if (sprint) {
                    if (updates.name !== undefined) sprint.name = updates.name;
                    if (updates.startDate !== undefined) sprint.start_date = updates.startDate;
                    if (updates.endDate !== undefined) sprint.end_date = updates.endDate;
                    if (updates.status !== undefined) sprint.status = updates.status;
                }

                // 如果有 project_id，重新加载以确保数据同步
                if (sprint?.project_id) {
                    await loadSprints(sprint.project_id);
                }
            }
        } catch (error) {
            console.error('[SprintStore] Failed to update sprint:', error);
            throw error;
        }
    }

    /**
     * 删除 Sprint
     */
    async function deleteSprint(sprintId: number): Promise<void> {
        try {
            if (!window.electronAPI || !window.electronAPI.sprint || !window.electronAPI.sprint.delete) {
                throw new Error('Electron API 未正确初始化：sprint.delete 不存在');
            }
            
            const sprint = sprints.value.find(s => s.id === sprintId);
            const projectId = sprint?.project_id;

            const result = await window.electronAPI.sprint.delete(sprintId);

            if ('isAppError' in result) {
                throw new Error(result.message);
            }

            if (result.success) {
                // 从本地状态移除
                sprints.value = sprints.value.filter(s => s.id !== sprintId);

                // 如果删除的是当前 Sprint，清空当前 Sprint
                if (currentSprintId.value === sprintId) {
                    currentSprintId.value = null;
                }
            }
        } catch (error) {
            console.error('[SprintStore] Failed to delete sprint:', error);
            throw error;
        }
    }

    /**
     * 设置当前 Sprint
     */
    function setCurrentSprint(sprintId: number | null): void {
        currentSprintId.value = sprintId;
    }

    /**
     * 清空所有数据
     */
    function clearAll(): void {
        sprints.value = [];
        currentSprintId.value = null;
    }

    return {
        // State
        sprints,
        currentSprintId,
        // Computed
        currentSprint,
        getSprintsByProjectId,
        getSprintsByStatus,
        // Actions
        loadSprints,
        createSprint,
        updateSprint,
        deleteSprint,
        setCurrentSprint,
        clearAll,
    };
}, {
    persist: {
        key: 'sprint-store',
        paths: ['currentSprintId'], // 只持久化 currentSprintId，sprints 每次都重新加载
    },
});



