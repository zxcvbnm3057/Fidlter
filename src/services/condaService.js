import axios from '../utils/axios';

// Conda环境管理相关API服务
export const condaService = {
    // 获取所有环境（支持流式请求）
    getEnvironments: async (streamMode = false) => {
        const url = streamMode
            ? '/api/conda/environments?stream=true'
            : '/api/conda/environments';

        if (streamMode) {
            // 使用fetch进行流式请求
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                credentials: 'include'
            });

            // 返回响应对象，由调用方处理流
            return response;
        } else {
            // 普通请求直接返回数据
            const response = await axios.get(url);
            return response.data;
        }
    },

    // 获取环境统计数据
    getEnvStats: async () => {
        const response = await axios.get('/api/conda/stats');
        return response.data;
    },

    // 获取单个环境的详细信息
    getEnvironmentDetails: async (envName) => {
        const response = await axios.get(`/api/conda/environment/${envName}`);
        return response.data;
    },

    // 创建新环境
    createEnvironment: async (envData) => {
        const response = await axios.post('/api/conda/environment', envData);
        return response.data;
    },

    // 删除环境
    deleteEnvironment: async (envName) => {
        const response = await axios.delete(`/api/conda/environment/${envName}`);
        return response.data;
    },

    // 重命名环境
    renameEnvironment: async (envName, newName) => {
        const response = await axios.put(`/api/conda/environment/${envName}`, { new_name: newName });
        return response.data;
    },

    // 在环境中安装包
    installPackages: async (envName, packages) => {
        const response = await axios.post(`/api/conda/environment/${envName}/packages`, { packages });
        return response.data;
    },

    // 从环境中移除包
    removePackages: async (envName, packages) => {
        const response = await axios.delete(`/api/conda/environment/${envName}/packages`, { data: { packages } });
        return response.data;
    }
};