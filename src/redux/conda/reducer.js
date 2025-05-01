import { createSlice } from '@reduxjs/toolkit';

// 初始状态
const initialState = {
    environments: [],
    loading: false,
    error: null
};

// 创建Conda环境管理切片
const condaSlice = createSlice({
    name: 'conda',
    initialState,
    reducers: {
        // 获取环境列表请求
        fetchEnvironmentsRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 获取环境列表成功
        fetchEnvironmentsSuccess: (state, action) => {
            state.loading = false;
            state.environments = action.payload;
        },
        // 获取环境列表失败
        fetchEnvironmentsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 创建环境请求
        createEnvironmentRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 创建环境成功
        createEnvironmentSuccess: (state, action) => {
            state.loading = false;
            // 仅在API返回新环境时添加到列表
            if (action.payload.env) {
                state.environments = [...state.environments, action.payload.env];
            }
        },
        // 创建环境失败
        createEnvironmentFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 删除环境请求
        deleteEnvironmentRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 删除环境成功
        deleteEnvironmentSuccess: (state, action) => {
            state.loading = false;
            state.environments = state.environments.filter(
                (env) => env.env_id !== action.payload.envId
            );
        },
        // 删除环境失败
        deleteEnvironmentFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 安装包请求
        installPackagesRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 安装包成功
        installPackagesSuccess: (state) => {
            state.loading = false;
        },
        // 安装包失败
        installPackagesFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        }
    }
});

// 导出action creators
export const {
    fetchEnvironmentsRequest,
    fetchEnvironmentsSuccess,
    fetchEnvironmentsFailure,
    createEnvironmentRequest,
    createEnvironmentSuccess,
    createEnvironmentFailure,
    deleteEnvironmentRequest,
    deleteEnvironmentSuccess,
    deleteEnvironmentFailure,
    installPackagesRequest,
    installPackagesSuccess,
    installPackagesFailure
} = condaSlice.actions;

// 导出reducer
export default condaSlice.reducer;