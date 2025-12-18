// 导出功能 IPC Handlers

import { ipcMain, dialog } from 'electron';
import { writeFileSync } from 'fs';
import { z } from 'zod';
import { IpcChannels } from './IpcChannels';
import { generateMarkdownReport } from '../services/ExportService';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

// Zod 验证 Schema（使用 coerce 自动转换字符串为数字）
const ExportProjectReportSchema = z.object({
    projectId: z.coerce.number().int().positive(),
});

/**
 * 注册导出相关的 IPC Handlers
 */
export function registerExportIpcHandlers() {
    /**
     * 导出项目报表（Markdown 格式）
     */
    ipcMain.handle(IpcChannels.EXPORT_PROJECT_REPORT_MARKDOWN, async (event, data: { projectId: number }) => {
        try {
            // 验证输入
            const validationResult = ExportProjectReportSchema.safeParse(data);
            if (!validationResult.success) {
                const error = new AppError('400_INVALID_INPUT', `Invalid input: ${validationResult.error.message}`);
                return error.toSerializable();
            }

            const { projectId } = validationResult.data;

            // 生成 Markdown 内容
            const markdownContent = await generateMarkdownReport(projectId);

            // 使用 Electron dialog 让用户选择保存位置
            const result = await dialog.showSaveDialog({
                title: '导出项目报表',
                defaultPath: `项目报表_${projectId}_${new Date().toISOString().split('T')[0]}.md`,
                filters: [
                    { name: 'Markdown 文件', extensions: ['md'] },
                    { name: '所有文件', extensions: ['*'] },
                ],
            });

            if (result.canceled || !result.filePath) {
                return { success: false, canceled: true };
            }

            // 写入文件
            writeFileSync(result.filePath, markdownContent, 'utf-8');

            logger.info(`Project report exported: ${result.filePath}`);
            return {
                success: true,
                filePath: result.filePath,
            };
        } catch (error) {
            logger.error('Failed to export project report', error);
            if (error instanceof AppError) {
                return error.toSerializable();
            }
            const appError = new AppError('500_SERVER_ERROR', `Failed to export project report: ${error}`);
            return appError.toSerializable();
        }
    });

    logger.info('Export IPC handlers registered');
}


