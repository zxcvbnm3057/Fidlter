import axios from '../utils/axios';

// 身份验证相关API服务
export const authService = {
    // 用户登录
    login: async (credentials) => {
        try {
            const response = await axios.post('/api/auth/login', credentials);

            // 后端使用HTTP-Only Cookie进行认证，不返回token
            // 我们只需要返回响应数据即可
            return response.data;
        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(error.response.data.message || '登录失败');
            }
            throw error;
        }
    },

    // 用户注销
    logout: async () => {
        try {
            // 调用后端注销接口，后端会清除会话Cookie
            await axios.post('/api/auth/logout');
            return { success: true };
        } catch (error) {
            console.error("注销过程中出错:", error);
            return { success: false, error: error.message };
        }
    },

    // 获取当前用户信息 - 可以用来验证会话是否有效
    getCurrentUser: async () => {
        try {
            const response = await axios.get('/api/auth/user');
            return response.data;
        } catch (error) {
            // 如果请求失败（401未授权），说明会话无效
            return null;
        }
    },

    // 检查会话是否有效的简单方法
    checkSession: async () => {
        try {
            await axios.get('/api/auth/check');
            return true;
        } catch (error) {
            return false;
        }
    }
};