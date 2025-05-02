import { takeLatest, put, call } from 'redux-saga/effects';
import { authService } from '../../services';
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
        // 使用authService处理登录请求
        const data = yield call(authService.login, action.payload);

        // 如果登录成功
        if (data.message === "Login successful") {
            // 分发登录成功action
            yield put(loginSuccess({
                user: data.user || { username: action.payload.username }
            }));
        } else {
            // 分发登录失败action
            yield put(loginFailure('登录失败：用户名或密码错误'));
        }
    } catch (error) {
        // 处理错误
        yield put(loginFailure(error.message || '登录失败，请稍后重试'));
    }
}

// 处理登出请求的worker saga
function* logoutSaga() {
    try {
        // 调用登出方法
        yield call(authService.logout);

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