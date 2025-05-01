import { takeLatest, call, put, all } from 'redux-saga/effects';
import axios from '../../utils/axios';
import {
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
    stopTaskRequest,
    stopTaskSuccess,
    stopTaskFailure
} from './reducer';

// 获取任务列表 - 路径已符合Endpoint文档
function* fetchTasksSaga() {
    try {
        const response = yield call(axios.get, '/api/tasks');
        yield put(fetchTasksSuccess(response.data));
    } catch (error) {
        yield put(fetchTasksFailure(error.response?.data?.message || '获取任务列表失败'));
    }
}

// 获取任务历史记录 - 路径已符合Endpoint文档
function* fetchTaskHistorySaga() {
    try {
        const response = yield call(axios.get, '/api/tasks/history');
        // 调整为匹配Endpoint文档中的响应格式
        yield put(fetchTaskHistorySuccess(response.data.data || []));
    } catch (error) {
        yield put(fetchTaskHistoryFailure(error.response?.data?.message || '获取任务历史记录失败'));
    }
}

// 获取任务统计数据 - 路径已符合Endpoint文档
function* fetchTaskStatsSaga() {
    try {
        const response = yield call(axios.get, '/api/tasks/stats');
        yield put(fetchTaskStatsSuccess(response.data));
    } catch (error) {
        yield put(fetchTaskStatsFailure(error.response?.data?.message || '获取任务统计数据失败'));
    }
}

// 创建任务 - 路径已符合Endpoint文档
function* createTaskSaga(action) {
    try {
        // 调整任务参数格式，将前端参数转换为API格式
        const taskData = { ...action.payload };

        // 处理调度选项，转换为API支持的格式
        if (taskData.schedule) {
            // 如果是一次性延迟执行
            if (taskData.schedule.type === 'once' && taskData.schedule.datetime) {
                // 计算延迟秒数
                const now = new Date();
                const scheduledTime = new Date(taskData.schedule.datetime);
                const delaySeconds = Math.floor((scheduledTime - now) / 1000);

                if (delaySeconds > 0) {
                    taskData.delay_seconds = delaySeconds;
                }
                // 删除前端特有的schedule参数
                delete taskData.schedule;
            }
            // 如果是周期性执行，转换为cron表达式
            else if (['daily', 'weekly', 'monthly'].includes(taskData.schedule.type)) {
                // 简单的cron表达式转换示例
                if (taskData.schedule.type === 'daily') {
                    // 每天在指定时间执行
                    const time = new Date(taskData.schedule.datetime || Date.now());
                    taskData.cron_expression = `${time.getMinutes()} ${time.getHours()} * * *`;
                } else if (taskData.schedule.type === 'weekly') {
                    // 每周在指定时间执行
                    const time = new Date(taskData.schedule.datetime || Date.now());
                    taskData.cron_expression = `${time.getMinutes()} ${time.getHours()} * * ${time.getDay()}`;
                } else if (taskData.schedule.type === 'monthly') {
                    // 每月在指定日期和时间执行
                    const time = new Date(taskData.schedule.datetime || Date.now());
                    taskData.cron_expression = `${time.getMinutes()} ${time.getHours()} ${time.getDate()} * *`;
                }
                // 删除前端特有的schedule参数
                delete taskData.schedule;
            }
        }

        // 确保使用env_id而不是conda_env
        if (taskData.condaEnvId) {
            taskData.env_id = taskData.condaEnvId;
            delete taskData.condaEnvId;
        }

        const response = yield call(axios.post, '/api/tasks', taskData);

        // 根据API文档调整响应处理
        if (response.data.success) {
            yield put(createTaskSuccess(response.data.task || response.data));
            // 创建成功后重新获取任务列表
            yield put(fetchTasksRequest());
        } else {
            yield put(createTaskFailure(response.data.message || '创建任务失败'));
        }
    } catch (error) {
        // 根据API文档处理特定错误
        if (error.response?.status === 400) {
            if (error.response.data.message.includes('already exists')) {
                yield put(createTaskFailure('任务名称已存在'));
            } else if (error.response.data.message.includes('cron expression')) {
                yield put(createTaskFailure('Cron表达式无效'));
            } else {
                yield put(createTaskFailure(error.response.data.message || '创建任务失败'));
            }
        } else {
            yield put(createTaskFailure(error.response?.data?.message || '创建任务失败'));
        }
    }
}

// 停止任务 - 注意：此功能在Endpoint文档中未定义
// 需要与后端确认是否支持此API，或者定义新的API
function* stopTaskSaga(action) {
    try {
        // 临时方案：根据任务ID获取任务详情，然后判断如何处理
        const taskResponse = yield call(axios.get, `/api/tasks/${action.payload.taskId}`);

        if (taskResponse.data.success) {
            // 如果任务状态为running，则尝试停止
            if (taskResponse.data.task.status === 'running') {
                // 临时API调用，实际应确认后端是否有停止任务的API
                yield call(axios.post, `/api/tasks/${action.payload.taskId}/stop`);
                yield put(stopTaskSuccess({ taskId: action.payload.taskId }));
            } else {
                yield put(stopTaskFailure('任务当前不在运行状态，无法停止'));
            }
        } else {
            yield put(stopTaskFailure('获取任务信息失败，无法停止任务'));
        }

        // 无论成功与否，都重新获取任务列表
        yield put(fetchTasksRequest());
    } catch (error) {
        yield put(stopTaskFailure(error.response?.data?.message || '停止任务失败'));
    }
}

// 任务管理模块的根saga
export default function* tasksSagas() {
    yield all([
        takeLatest(fetchTasksRequest.type, fetchTasksSaga),
        takeLatest(fetchTaskHistoryRequest.type, fetchTaskHistorySaga),
        takeLatest(fetchTaskStatsRequest.type, fetchTaskStatsSaga),
        takeLatest(createTaskRequest.type, createTaskSaga),
        takeLatest(stopTaskRequest.type, stopTaskSaga),
    ]);
}