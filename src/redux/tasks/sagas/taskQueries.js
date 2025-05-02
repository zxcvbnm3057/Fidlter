// 任务查询相关的sagas
import { call, put } from 'redux-saga/effects';
import { taskService } from '../../../services';
import {
    fetchTasksSuccess,
    fetchTasksFailure,
    fetchTaskHistorySuccess,
    fetchTaskHistoryFailure,
    fetchTaskStatsSuccess,
    fetchTaskStatsFailure
} from '../reducer';

// 获取任务列表
export function* fetchTasksSaga() {
    try {
        const data = yield call(taskService.getTasks);
        yield put(fetchTasksSuccess(data));
    } catch (error) {
        yield put(fetchTasksFailure(error.message || '获取任务列表失败'));
    }
}

// 获取任务历史记录
export function* fetchTaskHistorySaga() {
    try {
        const response = yield call(taskService.getTaskHistory);
        // 调整为匹配Endpoint文档中的响应格式
        yield put(fetchTaskHistorySuccess(response.data || []));
    } catch (error) {
        yield put(fetchTaskHistoryFailure(error.message || '获取任务历史记录失败'));
    }
}

// 获取任务统计数据
export function* fetchTaskStatsSaga() {
    try {
        const data = yield call(taskService.getTaskStats);
        yield put(fetchTaskStatsSuccess(data));
    } catch (error) {
        yield put(fetchTaskStatsFailure(error.message || '获取任务统计数据失败'));
    }
}