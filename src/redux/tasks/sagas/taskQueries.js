// 任务查询相关的sagas
import { call, put, delay } from 'redux-saga/effects';
import { taskService } from '../../../services';
import {
    fetchTasksSuccess,
    fetchTasksFailure,
    fetchTaskHistorySuccess,
    fetchTaskHistoryFailure,
    fetchTaskStatsSuccess,
    fetchTaskStatsFailure,
    fetchTaskDetailsSuccess,
    fetchTaskDetailsFailure,
    fetchTaskLogsSuccess,
    fetchTaskLogsFailure
} from '../reducer';

// 获取任务列表
export function* fetchTasksSaga(action) {
    try {
        // 使用action中的type参数，默认为defined
        const type = action.payload?.type || 'defined';
        const data = yield call(taskService.getTasks, type);
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

// 获取任务详情
export function* fetchTaskDetailsSaga(action) {
    try {
        const taskId = action.payload.taskId;
        const data = yield call(taskService.getTaskDetails, taskId);
        yield put(fetchTaskDetailsSuccess(data));
    } catch (error) {
        yield put(fetchTaskDetailsFailure(error.message || '获取任务详情失败'));
    }
}

// 获取任务执行日志
export function* fetchTaskLogsSaga(action) {
    try {
        const { taskId, executionId, realTime, pollInterval } = action.payload;
        const data = yield call(taskService.getTaskExecutionLogs, taskId, executionId, realTime);

        yield put(fetchTaskLogsSuccess({
            taskId,
            executionId,
            logs: data.logs,
            isComplete: data.is_complete
        }));

        // 如果任务未完成且需要实时轮询，则设置轮询
        if (realTime && !data.is_complete && pollInterval) {
            yield delay(pollInterval);
            yield put(action); // 重新触发相同的action
        }
    } catch (error) {
        yield put(fetchTaskLogsFailure(error.message || '获取任务日志失败'));
    }
}