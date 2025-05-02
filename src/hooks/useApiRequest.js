import { useState, useCallback } from 'react';

// API请求处理钩子
export const useApiRequest = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    // 执行API请求的函数
    const execute = useCallback(async (apiFunc, ...args) => {
        setLoading(true);
        setError(null);

        try {
            const result = await apiFunc(...args);
            setData(result);
            return { success: true, data: result };
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || '请求失败';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, []);

    // 重置状态
    const reset = useCallback(() => {
        setLoading(false);
        setError(null);
        setData(null);
    }, []);

    return {
        loading,
        error,
        data,
        execute,
        reset
    };
};