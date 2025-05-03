// API请求相关常量
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// 任务状态常量
export const TASK_STATUS = {
    RUNNING: 'running',
    SUCCESS: 'success',
    FAILED: 'failed',
    SCHEDULED: 'scheduled'
};

// Conda环境状态常量
export const ENV_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive'
};

// 本地存储常量
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    USER_INFO: 'user_info'
};

// 路由路径常量
export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    DASHBOARD: '/dashboard',
    TASK_SCHEDULER: '/task-scheduler',
    TASK_HISTORY: '/task-history',
    TASK_DETAIL: '/task-detail/:taskId',
    CONDA_MANAGER: '/conda-manager',
    GIT_SYNC: '/git-sync'
};