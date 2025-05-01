import { takeLatest, put, call } from 'redux-saga/effects';
import axios from '../../utils/axios';
import {
    loginRequest,
    loginSuccess,
    loginFailure,
    logoutRequest,
    logoutSuccess
} from './reducer';

// 处理登录请求的worker saga
function* loginSaga(action) {
    try {
        // 修改API路径与后端一致
        const response = yield call(
            axios.post,
            '/login',
            action.payload
        );

        // 如果登录成功 - 使用Cookie认证，不再处理token
        if (response.data.message === "Login successful") {
            // 分发登录成功action
            yield put(loginSuccess({
                user: response.data.user || { username: action.payload.username }
            }));
        } else {
            // 分发登录失败action
            yield put(loginFailure('登录失败：用户名或密码错误'));
        }
    } catch (error) {
        // 处理错误
        yield put(loginFailure(error.response?.data?.message || '登录失败，请稍后重试'));
    }
}

// 处理登出请求的worker saga
function* logoutSaga() {
    try {
        // 调用登出API
        yield call(axios.post, '/logout');

        // 分发登出成功action
        yield put(logoutSuccess());
    } catch (error) {
        console.error('登出错误:', error);
        // 即使出错，也要确保用户登出
        yield put(logoutSuccess());
    }
}

// auth模块的根saga
export default function* authSagas() {
    // 监听登录请求action
    yield takeLatest(loginRequest.type, loginSaga);

    // 监听登出请求action
    yield takeLatest(logoutRequest.type, logoutSaga);
}