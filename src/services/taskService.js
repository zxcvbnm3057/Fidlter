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

    // 获取任务执行日志
    getTaskExecutionLogs: async (taskId, executionId, realTime = false) => {
        const response = await axios.get(
            `/api/tasks/${taskId}/executions/${executionId}/logs?real_time=${realTime}`
        );
        return response.data;
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
    }
};