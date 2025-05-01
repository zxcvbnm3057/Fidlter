import { createSlice } from '@reduxjs/toolkit';

// 初始状态
const initialState = {
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token'),
    loading: false,
    error: null,
};

// 创建Auth切片
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // 登录请求
        loginRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 登录成功
        loginSuccess: (state, action) => {
            state.loading = false;
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.isAuthenticated = true;
            state.error = null;
        },
        // 登录失败
        loginFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        // 登出
        logoutRequest: (state) => {
            state.loading = true;
        },
        // 登出成功
        logoutSuccess: (state) => {
            state.loading = false;
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
        },
    },
});

// 导出action creators
export const {
    loginRequest,
    loginSuccess,
    loginFailure,
    logoutRequest,
    logoutSuccess,
} = authSlice.actions;

// 导出reducer
export default authSlice.reducer;