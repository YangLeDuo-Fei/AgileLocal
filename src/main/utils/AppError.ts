// 严格按照 V！.md v2025.PerfectScore.Final 生成
// 统一错误代码体系 (AppError)

type ErrorCode = '400_INVALID_INPUT' | '401_UNAUTHORIZED' | '403_FORBIDDEN' | 
                '409_CONFLICT' | '500_DB_ERROR' | '500_INTERNAL_ERROR' | '503_NETWORK_TIMEOUT';

export class AppError extends Error {
    public code: ErrorCode;
    public details?: any;
    
    constructor(code: ErrorCode, message: string, details?: any) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.details = details;
        // 确保 instanceof 正常工作
        Object.setPrototypeOf(this, AppError.prototype);
    }
    
    /**
     * 转换为可序列化对象（实例方法）
     * 用于 Electron IPC 跨进程传递
     */
    toSerializable() { 
        return { 
            isAppError: true,
            code: this.code, 
            message: this.message, 
            details: this.details,
        }; 
    }
}

