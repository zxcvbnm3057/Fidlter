import { createSlice } from '@reduxjs/toolkit';

// 初始状态
const initialState = {
    taskList: [],
    taskHistory: [],
    taskStats: {},
    loading: false,
    error: null
};

// 创建Tasks切片
const tasksSlice = createSlice({
    name: 'tasks',
    initialState,
    reducers: {
        // 获取任务列表请求
        fetchTasksRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 获取任务列表成功
        fetchTasksSuccess: (state, action) => {
            state.loading = false;
            state.taskList = action.payload;
        },
        // 获取任务列表失败
        fetchTasksFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 获取任务历史记录请求
        fetchTaskHistoryRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 获取任务历史记录成功
        fetchTaskHistorySuccess: (state, action) => {
            state.loading = false;
            state.taskHistory = action.payload;
        },
        // 获取任务历史记录失败
        fetchTaskHistoryFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 获取任务统计数据请求
        fetchTaskStatsRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 获取任务统计数据成功
        fetchTaskStatsSuccess: (state, action) => {
            state.loading = false;
            state.taskStats = action.payload;
        },
        // 获取任务统计数据失败
        fetchTaskStatsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 创建任务请求
        createTaskRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 创建任务成功
        createTaskSuccess: (state, action) => {
            state.loading = false;
            state.taskList = [...state.taskList, action.payload];
        },
        // 创建任务失败
        createTaskFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 停止任务请求
        stopTaskRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 停止任务成功
        stopTaskSuccess: (state, action) => {
            state.loading = false;
            // 更新任务状态
            state.taskList = state.taskList.map(task =>
                task.task_id === action.payload.taskId
                    ? { ...task, status: 'stopped' }
                    : task
            );
        },
        // 停止任务失败
        stopTaskFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        }
    }
});

// 导出action creators
export const {
    fetchTasksRequest,
    fetchTasksSuccess,
    fetchTasksFailure,
    fetchTaskHistoryRequest,
    fetchTaskHistorySuccess,
    fetchTaskHistoryFailure,
    fetchTaskStatsRequest,
    fetchTaskStatsSuccess,
    fetchTaskStatsFailure,
    createTaskRequest,
    createTaskSuccess,
    createTaskFailure,
    stopTaskRequest,
    stopTaskSuccess,
    stopTaskFailure
} = tasksSlice.actions;

// 导出reducer
export default tasksSlice.reducer;