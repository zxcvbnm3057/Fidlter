import axios from '../utils/axios';

// Conda环境管理相关API服务
export const condaService = {
    // 获取所有环境
    getEnvironments: async () => {
        const response = await axios.get('/api/conda/environments');
        return response.data;
    },

    // 获取环境统计数据
    getEnvStats: async () => {
        const response = await axios.get('/api/conda/stats');
        return response.data;
    },

    // 获取单个环境的详细信息
    getEnvironmentDetails: async (envName) => {
        const response = await axios.get(`/api/conda/environments/${envName}`);
        return response.data;
    },

    // 创建新环境
    createEnvironment: async (envData) => {
        const response = await axios.post('/api/conda/environments', envData);
        return response.data;
    },

    // 删除环境
    deleteEnvironment: async (envName) => {
        const response = await axios.delete(`/api/conda/environments/${envName}`);
        return response.data;
    },

    // 重命名环境
    renameEnvironment: async (envName, newName) => {
        const response = await axios.put(`/api/conda/environments/${envName}/rename`, { newName });
        return response.data;
    },

    // 在环境中安装包
    installPackages: async (envName, packages) => {
        const response = await axios.post(`/api/conda/environments/${envName}/packages`, { packages });
        return response.data;
    },

    // 从环境中移除包
    removePackages: async (envName, packages) => {
        const response = await axios.delete(`/api/conda/environments/${envName}/packages`, { data: { packages } });
        return response.data;
    }
};