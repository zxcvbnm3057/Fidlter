import axios from 'axios';

// 设置基础URL
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// 配置axios支持Cookie认证
axios.defaults.withCredentials = true;

// 添加请求拦截器
axios.interceptors.request.use(
    config => {
        // 移除Token认证相关代码，使用Cookie认证
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// 添加响应拦截器
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            // 认证失败时重定向到登录页
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axios;