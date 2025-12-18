// 项目状态管理 (Pinia Store)

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface Project {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    has_password?: number; // SQLite boolean (0/1)
    encrypted_password?: string | null;
    password_salt?: string | null;
    password_iv?: string | null;
}

export const useProjectStore = defineStore('project', () => {
    const projects = ref<Project[]>([]);
    const currentProjectId = ref<number | null>(null);
    const loading = ref(false);
    // 已通过密码验证的项目ID集合（会话级别，不持久化）
    const verifiedProjectIds = ref<Set<number>>(new Set());

    /**
     * 加载所有项目
     */
    async function loadProjects() {
        loading.value = true;
        try {
            const result = await window.electronAPI.project.getAll();
            if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
                // IPC 返回了错误
                const error = result as any;
                throw new Error(error.message || 'Failed to load projects');
            }
            if (result && typeof result === 'object' && 'success' in result && result.success) {
                projects.value = (result as any).projects || [];
            } else {
                throw new Error('Unexpected response format');
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
            throw error;
        } finally {
            loading.value = false;
        }
    }

    /**
     * 创建项目
     */
    async function createProject(name: string, description?: string | null): Promise<number> {
        try {
            const result = await window.electronAPI.project.create(name, description);
            if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
                // IPC 返回了错误
                const error = result as any;
                throw new Error(error.message || 'Failed to create project');
            }
            if (result && typeof result === 'object' && 'success' in result && result.success) {
                const projectId = (result as any).projectId;
                // 重新加载项目列表
                await loadProjects();
                return projectId;
            } else {
                throw new Error('Unexpected response format');
            }
        } catch (error) {
            console.error('Failed to create project:', error);
            throw error;
        }
    }

    /**
     * 删除项目
     */
    async function deleteProject(projectId: number) {
        try {
            const result = await window.electronAPI.project.delete(projectId);
            if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
                // IPC 返回了错误
                const error = result as any;
                throw new Error(error.message || 'Failed to delete project');
            }
            if (result && typeof result === 'object' && 'success' in result && result.success) {
                // 重新加载项目列表
                await loadProjects();
                // 如果删除的是当前项目，清空当前项目ID
                if (currentProjectId.value === projectId) {
                    currentProjectId.value = null;
                }
            } else {
                throw new Error('Unexpected response format');
            }
        } catch (error) {
            console.error('Failed to delete project:', error);
            throw error;
        }
    }

    /**
     * 设置当前项目
     */
    function setCurrentProject(projectId: number | null) {
        currentProjectId.value = projectId;
    }

    /**
     * 标记项目已通过密码验证
     */
    function markProjectVerified(projectId: number) {
        verifiedProjectIds.value.add(projectId);
    }

    /**
     * 检查项目是否已通过密码验证
     */
    function isProjectVerified(projectId: number): boolean {
        return verifiedProjectIds.value.has(projectId);
    }

    /**
     * 清除项目的验证状态（用于密码更改后）
     */
    function clearProjectVerification(projectId: number) {
        verifiedProjectIds.value.delete(projectId);
    }

    /**
     * 获取当前项目
     */
    const currentProject = computed(() => {
        if (!currentProjectId.value) return null;
        return projects.value.find(p => p.id === currentProjectId.value) || null;
    });

    return {
        projects,
        currentProjectId,
        currentProject,
        loading,
        loadProjects,
        createProject,
        deleteProject,
        setCurrentProject,
        markProjectVerified,
        isProjectVerified,
        clearProjectVerification,
    };
});













