import axios from '../utils/axios';

// 任务管理相关API服务
export const taskService = {
    // 获取所有任务
    getTasks: async () => {
        const response = await axios.get('/api/tasks');
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
    }
};