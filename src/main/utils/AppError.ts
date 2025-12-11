// 严格按照 V！.md v2025.PerfectScore.Final 生成
// 统一错误代码体系 (AppError)

type ErrorCode = '400_INVALID_INPUT' | '401_UNAUTHORIZED' | '403_FORBIDDEN' | 
                '409_CONFLICT' | '500_DB_ERROR' | '503_NETWORK_TIMEOUT';

export class AppError extends Error {
    public code: ErrorCode;
    
    constructor(code: ErrorCode, message: string) {
        super(message);
        this.name = 'AppError';
        this.code = code;
    }
    
    // 转换为可序列化对象
    toSerializable() { 
        return { 
            code: this.code, 
            message: this.message, 
            isAppError: true 
        }; 
    }
}

