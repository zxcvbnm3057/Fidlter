import { createSlice } from '@reduxjs/toolkit';

// 辅助函数，检查用户认证状态
const checkAuthState = () => {
    // 由于使用Cookie认证，无法直接检查Cookie（只读），
    // 可以在localStorage中保存一个标记，指示用户是否登录
    return !!localStorage.getItem('isAuthenticated');
};

// 初始状态
const initialState = {
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    isAuthenticated: checkAuthState(),
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
            state.isAuthenticated = true;
            state.error = null;

            // 保存标记到localStorage
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('user', JSON.stringify(action.payload.user));
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
            state.isAuthenticated = false;

            // 清除localStorage中的认证标记
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('user');
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