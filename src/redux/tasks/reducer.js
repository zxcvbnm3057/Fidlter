import { createSlice } from '@reduxjs/toolkit';

// 初始状态
const initialState = {
    taskList: [],
    taskHistory: [],
    taskStats: {},
    taskLogs: {}, // 存储任务日志的对象，按任务ID和执行ID进行索引
    currentTaskDetails: null, // 当前查看的任务详情
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

        // 手动触发任务请求
        triggerTaskRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 手动触发任务成功
        triggerTaskSuccess: (state, action) => {
            state.loading = false;
            // 更新任务状态为running
            state.taskList = state.taskList.map(task =>
                task.task_id === action.payload.taskId
                    ? { ...task, status: 'running' }
                    : task
            );
        },
        // 手动触发任务失败
        triggerTaskFailure: (state, action) => {
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
            // 更新任务状态为stopped
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
        },

        // 暂停任务请求
        pauseTaskRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 暂停任务成功
        pauseTaskSuccess: (state, action) => {
            state.loading = false;
            // 更新任务状态
            state.taskList = state.taskList.map(task =>
                task.task_id === action.payload.taskId
                    ? { ...task, status: 'paused' }
                    : task
            );
        },
        // 暂停任务失败
        pauseTaskFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 恢复任务请求
        resumeTaskRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 恢复任务成功
        resumeTaskSuccess: (state, action) => {
            state.loading = false;
            // 更新任务状态
            state.taskList = state.taskList.map(task =>
                task.task_id === action.payload.taskId
                    ? { ...task, status: 'scheduled' }
                    : task
            );
        },
        // 恢复任务失败
        resumeTaskFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 获取任务详情请求
        fetchTaskDetailsRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 获取任务详情成功
        fetchTaskDetailsSuccess: (state, action) => {
            state.loading = false;
            state.currentTaskDetails = action.payload;
        },
        // 获取任务详情失败
        fetchTaskDetailsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 获取任务执行日志请求
        fetchTaskLogsRequest: (state, action) => {
            // 不设置全局loading状态，因为日志获取可能是持续轮询的
            state.error = null;
        },
        // 获取任务执行日志成功
        fetchTaskLogsSuccess: (state, action) => {
            const { taskId, executionId, logs, isComplete } = action.payload;
            // 使用嵌套结构存储日志
            if (!state.taskLogs[taskId]) {
                state.taskLogs[taskId] = {};
            }

            // 如果是第一次接收日志，直接设置
            if (!state.taskLogs[taskId][executionId]) {
                state.taskLogs[taskId][executionId] = {
                    logs: logs || "",
                    isComplete: isComplete || false,
                    lastUpdated: new Date().toISOString()
                };
            } else if (isComplete) {
                // 如果收到完成信号，更新完成状态但不替换日志内容
                state.taskLogs[taskId][executionId] = {
                    ...state.taskLogs[taskId][executionId],
                    isComplete: true,
                    lastUpdated: new Date().toISOString()
                };
            } else if (logs) {
                // 如果已有日志且收到新内容，则追加新的日志内容
                const existingLogs = state.taskLogs[taskId][executionId];
                state.taskLogs[taskId][executionId] = {
                    logs: logs ? existingLogs.logs + logs : existingLogs.logs,
                    isComplete: isComplete || existingLogs.isComplete,
                    lastUpdated: new Date().toISOString()
                };
            }
        },
        // 获取任务执行日志失败
        fetchTaskLogsFailure: (state, action) => {
            state.error = action.payload;
        },

        // 清除任务日志
        clearTaskLogs: (state, action) => {
            const { taskId, executionId } = action.payload;
            if (taskId && executionId && state.taskLogs[taskId]) {
                delete state.taskLogs[taskId][executionId];
            } else if (taskId && state.taskLogs[taskId]) {
                delete state.taskLogs[taskId];
            } else {
                state.taskLogs = {};
            }
        },

        // 删除任务请求
        deleteTaskRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 删除任务成功
        deleteTaskSuccess: (state, action) => {
            state.loading = false;
            state.taskList = state.taskList.filter(task => task.task_id !== action.payload.taskId);
        },
        // 删除任务失败
        deleteTaskFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 更新任务请求
        updateTaskRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 更新任务成功
        updateTaskSuccess: (state, action) => {
            state.loading = false;
            state.taskList = state.taskList.map(task =>
                task.task_id === action.payload.task_id ? action.payload : task
            );
        },
        // 更新任务失败
        updateTaskFailure: (state, action) => {
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
    triggerTaskRequest,
    triggerTaskSuccess,
    triggerTaskFailure,
    stopTaskRequest,
    stopTaskSuccess,
    stopTaskFailure,
    pauseTaskRequest,
    pauseTaskSuccess,
    pauseTaskFailure,
    resumeTaskRequest,
    resumeTaskSuccess,
    resumeTaskFailure,
    fetchTaskDetailsRequest,
    fetchTaskDetailsSuccess,
    fetchTaskDetailsFailure,
    fetchTaskLogsRequest,
    fetchTaskLogsSuccess,
    fetchTaskLogsFailure,
    clearTaskLogs,
    deleteTaskRequest,
    deleteTaskSuccess,
    deleteTaskFailure,
    updateTaskRequest,
    updateTaskSuccess,
    updateTaskFailure
} = tasksSlice.actions;

// 导出reducer
export default tasksSlice.reducer;