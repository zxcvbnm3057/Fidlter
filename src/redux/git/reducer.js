import { createSlice } from '@reduxjs/toolkit';

// 初始状态
const initialState = {
    loading: false,
    error: null,
    gitTaskStatus: null,
    gitTaskCreated: null,
    gitTaskUpdated: null
};

// 创建redux切片
const gitSlice = createSlice({
    name: 'git',
    initialState,
    reducers: {
        // 创建Git任务
        createGitTaskRequest: (state) => {
            state.loading = true;
            state.error = null;
            state.gitTaskCreated = null;
        },
        createGitTaskSuccess: (state, action) => {
            state.loading = false;
            state.gitTaskCreated = action.payload;
        },
        createGitTaskFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 更新Git任务
        updateGitTaskRequest: (state) => {
            state.loading = true;
            state.error = null;
            state.gitTaskUpdated = null;
        },
        updateGitTaskSuccess: (state, action) => {
            state.loading = false;
            state.gitTaskUpdated = action.payload;
        },
        updateGitTaskFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 获取Git任务状态
        fetchGitTaskStatusRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        fetchGitTaskStatusSuccess: (state, action) => {
            state.loading = false;
            state.gitTaskStatus = action.payload;
        },
        fetchGitTaskStatusFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 清除Git操作结果
        clearGitTaskResults: (state) => {
            state.gitTaskCreated = null;
            state.gitTaskUpdated = null;
            state.error = null;
        }
    }
});

// 导出Actions
export const {
    createGitTaskRequest,
    createGitTaskSuccess,
    createGitTaskFailure,
    updateGitTaskRequest,
    updateGitTaskSuccess,
    updateGitTaskFailure,
    fetchGitTaskStatusRequest,
    fetchGitTaskStatusSuccess,
    fetchGitTaskStatusFailure,
    clearGitTaskResults
} = gitSlice.actions;

// 导出Reducer
export default gitSlice.reducer;