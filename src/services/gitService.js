import axios from '../utils/axios';

// Git仓库同步相关API服务
export const gitService = {
    // 从Git仓库创建任务
    createTaskFromGit: async (data) => {
        const response = await axios.post('/api/git/tasks', data);
        return response.data;
    },

    // 更新Git仓库任务
    updateGitTask: async (taskId, data) => {
        const response = await axios.put(`/api/git/tasks/${taskId}`, data);
        return response.data;
    },

    // 获取Git任务状态
    getGitTaskStatus: async (taskId) => {
        const response = await axios.get(`/api/git/tasks/${taskId}`);
        return response.data;
    }
};