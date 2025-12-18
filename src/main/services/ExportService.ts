// 导出服务 - 项目报表导出（UC13）

import { getDatabase } from '../database/connection';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

export interface ProjectReportData {
    project: {
        id: number;
        name: string;
        description: string | null;
        created_at: string;
    };
    sprints: Array<{
        id: number;
        name: string;
        start_date: string;
        end_date: string;
        status: 'Planned' | 'Active' | 'Closed';
    }>;
    tasks: Array<{
        id: number;
        title: string;
        description: string | null;
        status: 'ToDo' | 'Doing' | 'Done';
        story_points: number;
        assignee: string | null;
        due_date: string | null;
        priority: number;
        sprint_id: number | null;
        created_at: string;
        updated_at: string;
    }>;
    statistics: {
        totalTasks: number;
        todoTasks: number;
        doingTasks: number;
        doneTasks: number;
        totalStoryPoints: number;
        completedStoryPoints: number;
    };
}

/**
 * 获取项目报表数据
 */
export async function getProjectReportData(projectId: number): Promise<ProjectReportData> {
    const db = await getDatabase();

    try {
        // 获取项目信息
        const project = await db
            .selectFrom('projects')
            .selectAll()
            .where('id', '=', projectId)
            .executeTakeFirst();

        if (!project) {
            throw new AppError('400_INVALID_INPUT', `Project with id ${projectId} not found`);
        }

        // 获取项目的所有 Sprint
        const sprints = await db
            .selectFrom('sprints')
            .selectAll()
            .where('project_id', '=', projectId)
            .orderBy('start_date', 'desc')
            .execute();

        // 获取项目的所有任务
        const tasks = await db
            .selectFrom('tasks')
            .selectAll()
            .where('project_id', '=', projectId)
            .orderBy('created_at', 'desc')
            .execute();

        // 计算统计信息
        const totalTasks = tasks.length;
        const todoTasks = tasks.filter(t => t.status === 'ToDo').length;
        const doingTasks = tasks.filter(t => t.status === 'Doing').length;
        const doneTasks = tasks.filter(t => t.status === 'Done').length;
        const totalStoryPoints = tasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
        const completedStoryPoints = tasks
            .filter(t => t.status === 'Done')
            .reduce((sum, t) => sum + (t.story_points || 0), 0);

        return {
            project: {
                id: project.id,
                name: project.name,
                description: project.description,
                created_at: project.created_at,
            },
            sprints: sprints.map(s => ({
                id: s.id,
                name: s.name,
                start_date: s.start_date,
                end_date: s.end_date,
                status: s.status,
            })),
            tasks: tasks.map(t => ({
                id: t.id,
                title: t.title,
                description: t.description,
                status: t.status,
                story_points: t.story_points,
                assignee: t.assignee,
                due_date: t.due_date,
                priority: t.priority,
                sprint_id: t.sprint_id,
                created_at: t.created_at,
                updated_at: t.updated_at,
            })),
            statistics: {
                totalTasks,
                todoTasks,
                doingTasks,
                doneTasks,
                totalStoryPoints,
                completedStoryPoints,
            },
        };
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        logger.error('Failed to get project report data', error);
        throw new AppError('500_DB_ERROR', `Failed to get project report data: ${error}`);
    }
}

/**
 * 生成 Markdown 格式的项目报表
 */
export async function generateMarkdownReport(projectId: number): Promise<string> {
    const data = await getProjectReportData(projectId);
    const now = new Date().toLocaleString('zh-CN');

    let markdown = `# 项目报表：${data.project.name}\n\n`;
    markdown += `**生成时间：** ${now}\n\n`;

    // 项目信息
    markdown += `## 项目信息\n\n`;
    markdown += `- **项目名称：** ${data.project.name}\n`;
    markdown += `- **创建时间：** ${new Date(data.project.created_at).toLocaleString('zh-CN')}\n`;
    if (data.project.description) {
        markdown += `- **项目描述：** ${data.project.description}\n`;
    }
    markdown += `\n`;

    // 统计信息
    markdown += `## 统计概览\n\n`;
    markdown += `| 指标 | 数量 |\n`;
    markdown += `|------|------|\n`;
    markdown += `| 总任务数 | ${data.statistics.totalTasks} |\n`;
    markdown += `| 待办任务 | ${data.statistics.todoTasks} |\n`;
    markdown += `| 进行中 | ${data.statistics.doingTasks} |\n`;
    markdown += `| 已完成 | ${data.statistics.doneTasks} |\n`;
    markdown += `| 总故事点 | ${data.statistics.totalStoryPoints} |\n`;
    markdown += `| 已完成故事点 | ${data.statistics.completedStoryPoints} |\n`;
    const completionRate = data.statistics.totalStoryPoints > 0
        ? ((data.statistics.completedStoryPoints / data.statistics.totalStoryPoints) * 100).toFixed(1)
        : '0';
    markdown += `| 完成率 | ${completionRate}% |\n`;
    markdown += `\n`;

    // Sprint 列表
    if (data.sprints.length > 0) {
        markdown += `## Sprint 列表\n\n`;
        for (const sprint of data.sprints) {
            const statusText = sprint.status === 'Active' ? '进行中' : sprint.status === 'Closed' ? '已关闭' : '计划中';
            markdown += `### ${sprint.name}\n\n`;
            markdown += `- **状态：** ${statusText}\n`;
            markdown += `- **开始日期：** ${new Date(sprint.start_date).toLocaleDateString('zh-CN')}\n`;
            markdown += `- **结束日期：** ${new Date(sprint.end_date).toLocaleDateString('zh-CN')}\n`;
            
            // Sprint 下的任务
            const sprintTasks = data.tasks.filter(t => t.sprint_id === sprint.id);
            if (sprintTasks.length > 0) {
                markdown += `- **任务数：** ${sprintTasks.length}\n`;
            }
            markdown += `\n`;
        }
    }

    // 任务列表（按状态分组）
    markdown += `## 任务列表\n\n`;

    const statusGroups = {
        '待办': data.tasks.filter(t => t.status === 'ToDo'),
        '进行中': data.tasks.filter(t => t.status === 'Doing'),
        '已完成': data.tasks.filter(t => t.status === 'Done'),
    };

    for (const [statusName, tasks] of Object.entries(statusGroups)) {
        if (tasks.length === 0) continue;

        markdown += `### ${statusName} (${tasks.length})\n\n`;
        markdown += `| ID | 标题 | 负责人 | 截止日期 | 优先级 | 故事点 | Sprint |\n`;
        markdown += `|----|------|--------|----------|--------|--------|--------|\n`;

        for (const task of tasks) {
            const priorityText = task.priority === 1 ? '高' : task.priority === 3 ? '低' : '中';
            const dueDateText = task.due_date
                ? new Date(task.due_date).toLocaleDateString('zh-CN')
                : '-';
            const assigneeText = task.assignee || '-';
            const sprintName = data.sprints.find(s => s.id === task.sprint_id)?.name || '-';
            
            markdown += `| ${task.id} | ${task.title} | ${assigneeText} | ${dueDateText} | ${priorityText} | ${task.story_points} | ${sprintName} |\n`;
            
            if (task.description) {
                markdown += `|    | *${task.description}* | | | | | |\n`;
            }
        }
        markdown += `\n`;
    }

    return markdown;
}


