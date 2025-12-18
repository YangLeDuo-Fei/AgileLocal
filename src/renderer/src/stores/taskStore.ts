// 严格按照 V！.md v2025.PerfectScore.Final 生成
// 任务状态管理 (Pinia Store)

import { defineStore } from 'pinia';
import { ref } from 'vue';

// 任务类型定义
export interface Task {
    id: number;
    project_id: number;
    sprint_id: number | null;
    title: string;
    status: 'ToDo' | 'Doing' | 'Done';
    story_points: number;
    kanban_order: number;
    version: number;
    description: string | null;
    assignee: string | null;
    due_date: string | null;
    priority: number; // 1高、2中、3低
    created_at: string;
    updated_at: string;
}

export const useTaskStore = defineStore('task', () => {
    // 状态：tasks 数组
    const tasks = ref<Task[]>([]);

    // 备份状态（用于回滚）
    let backupState: { tasks: Task[] } | null = null;
    let backupTask: Task | null = null;

    /**
     * 设置任务列表
     */
    function setTasks(newTasks: Task[]) {
        tasks.value = newTasks;
    }

    /**
     * 备份当前状态
     */
    function backupStateAndTask(taskId: number) {
        backupState = {
            tasks: JSON.parse(JSON.stringify(tasks.value)),
        };
        const task = tasks.value.find((t) => t.id === taskId);
        if (task) {
            backupTask = JSON.parse(JSON.stringify(task));
        }
    }

    /**
     * 回滚到备份状态
     */
    function rollbackState() {
        if (backupState) {
            tasks.value = backupState.tasks;
            backupState = null;
            backupTask = null;
        }
    }

    /**
     * 乐观更新任务状态（立即更新 UI）
     * 注意：这个函数只更新 tasks.value，不调用 IPC
     */
    function optimisticUpdateTaskStatus(
        taskId: number,
        newStatus: 'ToDo' | 'Doing' | 'Done',
        newOrder: number,
        expectedVersion: number
    ) {
        const taskIndex = tasks.value.findIndex((t) => t.id === taskId);
        if (taskIndex === -1) {
            throw new Error(`Task with id ${taskId} not found`);
        }

        const task = tasks.value[taskIndex];

        // 备份状态（用于回滚）
        backupStateAndTask(taskId);

        const oldStatus = task.status;
        const oldOrder = task.kanban_order;
        const sprintId = task.sprint_id;

        // 更新任务状态和排序
        const updatedTask: Task = {
            ...task,
            status: newStatus,
            kanban_order: newOrder,
            version: expectedVersion + 1, // 乐观更新 version
        };

        // 更新所有相关任务
        tasks.value = tasks.value.map((t) => {
            // 更新目标任务
            if (t.id === taskId) {
                return updatedTask;
            }

            // 如果是同一列内拖拽
            if (oldStatus === newStatus && t.sprint_id === sprintId && t.status === newStatus) {
                if (oldOrder < newOrder) {
                    // 向后拖拽：oldOrder < kanban_order <= newOrder 的任务 order 减 1
                    if (t.kanban_order > oldOrder && t.kanban_order <= newOrder) {
                        return { ...t, kanban_order: t.kanban_order - 1 };
                    }
                } else if (oldOrder > newOrder) {
                    // 向前拖拽：newOrder <= kanban_order < oldOrder 的任务 order 加 1
                    if (t.kanban_order >= newOrder && t.kanban_order < oldOrder) {
                        return { ...t, kanban_order: t.kanban_order + 1 };
                    }
                }
            } else if (oldStatus !== newStatus) {
                // 跨列拖拽
                // 旧列：kanban_order > oldOrder 的任务减 1
                if (t.sprint_id === sprintId && t.status === oldStatus && t.kanban_order > oldOrder) {
                    return { ...t, kanban_order: t.kanban_order - 1 };
                }

                // 新列：kanban_order >= newOrder 的任务加 1
                if (t.sprint_id === sprintId && t.status === newStatus && t.kanban_order >= newOrder) {
                    return { ...t, kanban_order: t.kanban_order + 1 };
                }
            }

            return t;
        });
    }

    /**
     * 更新任务状态（调用 IPC）
     * 如果失败，回滚状态
     */
    async function updateTaskStatus(
        taskId: number,
        newStatus: 'ToDo' | 'Doing' | 'Done',
        newOrder: number,
        expectedVersion: number
    ): Promise<{ success: boolean; error?: any }> {
        // 先进行乐观更新
        optimisticUpdateTaskStatus(taskId, newStatus, newOrder, expectedVersion);

        // 调用 IPC
        try {
            const result = await window.electronAPI.task.updateStatus(
                taskId,
                newStatus,
                newOrder,
                expectedVersion
            );

            // 检查是否返回错误
            if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
                // IPC 返回错误，回滚状态
                rollbackState();
                return { success: false, error: result };
            }

            // 检查是否是成功响应
            if (!result || typeof result !== 'object' || !('success' in result) || !result.success) {
                // 意外的响应格式，回滚状态
                rollbackState();
                return { success: false, error: { message: 'Unexpected response format' } };
            }

            // 成功：version 已经在乐观更新中设置为 expectedVersion + 1
            // 如果 IPC 返回新的 version，可以更新（可选）
            if (result && typeof result === 'object' && 'newVersion' in result) {
                const taskIndex = tasks.value.findIndex((t) => t.id === taskId);
                if (taskIndex !== -1) {
                    tasks.value[taskIndex].version = result.newVersion as number;
                }
            }

            return { success: true };
        } catch (error) {
            // IPC 调用失败，回滚状态
            rollbackState();
            return { success: false, error };
        }
    }

    /**
     * 加载任务列表
     */
    async function loadTasks(projectId: number, sprintId?: number | null) {
        try {
            // 明确传递 undefined 而不是 null，确保后端不进行 sprintId 过滤
            const actualSprintId = sprintId === null ? undefined : sprintId;
            const result = await window.electronAPI.task.getTasks(projectId, actualSprintId);
            if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
                // IPC 返回了错误
                const error = result as any;
                throw new Error(error.message || 'Failed to load tasks');
            }
            if (result && typeof result === 'object' && 'success' in result && result.success) {
                const loadedTasks = (result as any).tasks || [];
                console.log(`[TaskStore] loadTasks: projectId=${projectId}, sprintId=${actualSprintId}, loaded ${loadedTasks.length} tasks`, loadedTasks.map((t: Task) => ({ id: t.id, title: t.title, status: t.status })));
                // 使用 nextTick 确保在同一个 tick 内完成更新，避免触发多次响应式更新
                // 直接替换整个数组
                tasks.value = loadedTasks;
            } else {
                throw new Error('Unexpected response format');
            }
        } catch (error) {
            console.error('Failed to load tasks:', error);
            throw error;
        }
    }

    /**
     * 创建任务
     */
    async function createTask(
        projectId: number,
        title: string,
        description?: string | null,
        storyPoints: number = 0,
        status: 'ToDo' | 'Doing' | 'Done' = 'ToDo',
        sprintId?: number | null,
        assignee?: string | null,
        dueDate?: string | null,
        priority?: number
    ): Promise<number> {
        try {
            const result = await window.electronAPI.task.create({
                projectId,
                title,
                description,
                storyPoints,
                status,
                sprintId: sprintId || null,
                assignee: assignee || null,
                dueDate: dueDate || null,
                priority: priority || 2,
            });

            if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
                // IPC 返回了错误
                const error = result as any;
                throw new Error(error.message || 'Failed to create task');
            }
            if (result && typeof result === 'object' && 'success' in result && result.success) {
                const taskId = (result as any).taskId;
                // 重新加载任务列表（不传入 sprintId，加载所有任务）
                await loadTasks(projectId);
                return taskId;
            } else {
                throw new Error('Unexpected response format');
            }
        } catch (error) {
            console.error('Failed to create task:', error);
            throw error;
        }
    }

    /**
     * 更新任务信息
     */
    async function updateTask(
        taskId: number,
        title?: string,
        description?: string | null,
        storyPoints?: number,
        status?: 'ToDo' | 'Doing' | 'Done',
        assignee?: string | null,
        dueDate?: string | null,
        priority?: number
    ): Promise<void> {
        try {
            const result = await window.electronAPI.task.update({
                taskId,
                title,
                description,
                storyPoints,
                status,
                assignee,
                dueDate,
                priority,
            });

            if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
                const error = result as any;
                throw new Error(error.message || 'Failed to update task');
            }

            if (result && typeof result === 'object' && 'success' in result && result.success) {
                // 重新加载任务列表以获取最新数据（不传入 sprintId，加载所有任务）
                const task = tasks.value.find(t => t.id === taskId);
                if (task) {
                    await loadTasks(task.project_id);
                }
            } else {
                throw new Error('Unexpected response format');
            }
        } catch (error) {
            console.error('Failed to update task:', error);
            throw error;
        }
    }

    /**
     * 删除任务
     */
    async function deleteTask(taskId: number): Promise<void> {
        try {
            // 先找到任务，保存 project_id（用于重新加载）
            const taskIndex = tasks.value.findIndex(t => t.id === taskId);
            if (taskIndex === -1) {
                throw new Error(`Task with id ${taskId} not found`);
            }
            
            const task = tasks.value[taskIndex];
            const projectId = task.project_id;

            // 调用 IPC 删除任务
            const result = await window.electronAPI.task.delete(taskId);

            if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
                const error = result as any;
                throw new Error(error.message || 'Failed to delete task');
            }

            if (result && typeof result === 'object' && 'success' in result && result.success) {
                // 删除成功后，重新加载任务列表以确保数据一致（不传入 sprintId，加载所有任务）
                await loadTasks(projectId);
            } else {
                throw new Error('Unexpected response format');
            }
        } catch (error) {
            console.error('Failed to delete task:', error);
            throw error;
        }
    }

    return {
        tasks,
        setTasks,
        loadTasks,
        createTask,
        updateTask,
        deleteTask,
        updateTaskStatus,
        optimisticUpdateTaskStatus,
        rollbackState,
    };
});















