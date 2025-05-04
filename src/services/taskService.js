import axios from '../utils/axios';

// 任务管理相关API服务
export const taskService = {
    // 获取所有任务
    getTasks: async (type = 'defined') => {
        const response = await axios.get(`/api/tasks?type=${type}`);
        return response.data;
    },

    // 获取任务历史
    getTaskHistory: async () => {
        const response = await axios.get('/api/tasks/history');
        return response.data;
    },

    // 获取任务统计数据
    getTaskStats: async () => {
        const response = await axios.get('/api/tasks/stats');
        return response.data;
    },

    // 创建新任务
    createTask: async (taskData) => {
        const response = await axios.post('/api/tasks', taskData);
        return response.data;
    },

    // 停止任务
    stopTask: async (taskId) => {
        const response = await axios.post(`/api/tasks/${taskId}/stop`);
        return response.data;
    },

    // 暂停任务
    pauseTask: async (taskId) => {
        const response = await axios.post(`/api/tasks/${taskId}/pause`);
        return response.data;
    },

    // 恢复任务
    resumeTask: async (taskId) => {
        const response = await axios.post(`/api/tasks/${taskId}/resume`);
        return response.data;
    },

    // 手动触发任务
    triggerTask: async (taskId) => {
        const response = await axios.post(`/api/tasks/${taskId}/trigger`);
        return response.data;
    },

    // 获取任务执行日志
    getTaskExecutionLogs: async (taskId, executionId, options = {}) => {
        const { stream = false } = options;
        const url = `/api/tasks/${taskId}/executions/${executionId}/logs`;
        const params = new URLSearchParams();

        if (stream) {
            params.append('stream', 'true');
        }

        const queryString = params.toString();
        const finalUrl = queryString ? `${url}?${queryString}` : url;

        const response = await axios.get(finalUrl);
        return response.data;
    },

    // 创建流式日志连接 (使用EventSource)
    createLogStream: (taskId, executionId, options = {}) => {
        const { onMessage, onComplete, onError } = options;

        const url = `/api/tasks/${taskId}/executions/${executionId}/logs`;
        const params = new URLSearchParams();

        // 添加必要的stream参数
        params.append('stream', 'true');

        const queryString = params.toString();
        const finalUrl = queryString ? `${url}?${queryString}` : url;

        try {
            const eventSource = new EventSource(finalUrl);

            // 处理普通消息
            eventSource.onmessage = (event) => {
                if (onMessage && event.data) {
                    try {
                        const data = JSON.parse(event.data);

                        // 确保数据格式符合预期
                        const formattedData = {
                            taskId,
                            executionId,
                            logs: data.logs || "",
                            isComplete: data.is_complete || false
                        };

                        onMessage(formattedData);

                        // 检查消息是否包含is_complete标志，如果为true则表示任务已完成
                        if (data.is_complete && onComplete) {
                            onComplete(formattedData);
                            // 完成时自动关闭连接
                            eventSource.close();
                        }
                    } catch (e) {
                        console.error('解析日志数据出错:', e);
                    }
                }
            };

            // 处理错误
            eventSource.onerror = (error) => {
                if (onError) {
                    onError(error);
                }
                eventSource.close();
            };

            // 返回EventSource对象，以便外部控制
            return eventSource;
        } catch (error) {
            if (onError) {
                onError(error);
            }
            return null;
        }
    },

    // 获取任务详情
    getTaskDetails: async (taskId) => {
        const response = await axios.get(`/api/tasks/${taskId}`);
        return response.data;
    },

    // 删除任务
    deleteTask: async (taskId) => {
        const response = await axios.delete(`/api/tasks/${taskId}`);
        return response.data;
    },

    // 更新任务
    updateTask: async (taskId, taskData) => {
        const response = await axios.put(`/api/tasks/${taskId}`, taskData);
        return response.data;
    },

    // 更新任务脚本
    updateTaskScript: async (taskId, formData) => {
        const response = await axios.post(`/api/tasks/${taskId}/update-script`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    }
};