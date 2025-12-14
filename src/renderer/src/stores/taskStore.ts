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
     * 乐观更新任务状态
     * 更新成功后，version = expectedVersion + 1
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

        // 备份状态
        backupStateAndTask(taskId);

        // 更新任务状态和排序
        const updatedTask: Task = {
            ...task,
            status: newStatus,
            kanban_order: newOrder,
            version: expectedVersion + 1, // 乐观更新 version
        };

        // 如果是同一列内拖拽，需要调整其他任务的 order
        if (task.status === newStatus) {
            // 列内拖拽：调整同一列内其他任务的 order
            tasks.value = tasks.value.map((t) => {
                if (t.id === taskId) {
                    return updatedTask;
                }

                if (t.sprint_id === task.sprint_id && t.status === newStatus) {
                    const oldOrder = task.kanban_order;
                    if (oldOrder < newOrder) {
                        // 向后拖拽：oldOrder 到 newOrder 之间的任务 order 减 1
                        if (t.kanban_order > oldOrder && t.kanban_order <= newOrder) {
                            return { ...t, kanban_order: t.kanban_order - 1 };
                        }
                    } else if (oldOrder > newOrder) {
                        // 向前拖拽：newOrder 到 oldOrder 之间的任务 order 加 1
                        if (t.kanban_order >= newOrder && t.kanban_order < oldOrder) {
                            return { ...t, kanban_order: t.kanban_order + 1 };
                        }
                    }
                }

                return t;
            });
        } else {
            // 跨列拖拽
            tasks.value = tasks.value.map((t) => {
                if (t.id === taskId) {
                    return updatedTask;
                }

                // 旧列：kanban_order > oldOrder 的任务减 1
                if (
                    t.sprint_id === task.sprint_id &&
                    t.status === task.status &&
                    t.kanban_order > task.kanban_order
                ) {
                    return { ...t, kanban_order: t.kanban_order - 1 };
                }

                // 新列：kanban_order >= newOrder 的任务加 1
                if (
                    t.sprint_id === task.sprint_id &&
                    t.status === newStatus &&
                    t.kanban_order >= newOrder
                ) {
                    return { ...t, kanban_order: t.kanban_order + 1 };
                }

                return t;
            });
        }
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

    return {
        tasks,
        setTasks,
        updateTaskStatus,
        rollbackState,
    };
});

