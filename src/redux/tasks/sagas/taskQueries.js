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
import store from '../../store';

// 获取任务列表
export function* fetchTasksSaga(action) {
    try {
        // 使用action中的type参数，默认为defined
        const type = action.payload?.type || 'defined';
        // API直接返回任务数组，不需要额外处理
        const tasks = yield call(taskService.getTasks, type);
        yield put(fetchTasksSuccess(tasks));
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
        const {
            taskId,
            executionId,
            realTime,
            pollInterval
        } = action.payload;

        // 如果请求使用实时模式且支持EventSource，使用流式API
        if (realTime && typeof EventSource !== 'undefined') {
            // 创建EventSource
            const eventSource = taskService.createLogStream(
                taskId,
                executionId,
                {
                    onMessage: (data) => {
                        // 接收到新日志数据时，分发action更新Redux状态
                        if (data.logs) {
                            const action = fetchTaskLogsSuccess({
                                taskId,
                                executionId,
                                logs: data.logs,
                                isComplete: data.isComplete || false
                            });
                            // 直接分发action而不是使用put (因为在回调中)
                            action && store.dispatch(action);
                        }
                    },
                    onComplete: (data) => {
                        // 任务完成时，分发最终状态
                        const action = fetchTaskLogsSuccess({
                            taskId,
                            executionId,
                            logs: "",  // 完成事件不包含日志内容
                            isComplete: true
                        });
                        action && store.dispatch(action);
                    },
                    onError: (error) => {
                        // 出错时，分发错误action
                        const action = fetchTaskLogsFailure(error.message || '流式日志连接失败');
                        action && store.dispatch(action);
                    }
                }
            );

            // 返回一个不会resolve的Promise，因为EventSource会自己处理连接的生命周期
            return yield new Promise(() => { });
        }

        // 如果不使用流式API或浏览器不支持EventSource，则使用传统轮询方式
        const options = {
            stream: false // 确保不使用stream模式
        };

        const data = yield call(taskService.getTaskExecutionLogs, taskId, executionId, options);

        // 将获取到的日志更新到Redux状态
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