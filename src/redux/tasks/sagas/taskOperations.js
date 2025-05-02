// 任务操作相关的sagas
import { call, put } from 'redux-saga/effects';
import { taskService } from '../../../services';
import {
    createTaskSuccess,
    createTaskFailure,
    stopTaskSuccess,
    stopTaskFailure,
    fetchTasksRequest
} from '../reducer';

// 创建任务
export function* createTaskSaga(action) {
    try {
        // 调整任务参数格式，将前端参数转换为API格式
        const taskData = { ...action.payload };

        // 处理Conda环境
        if (taskData.condaEnv) {
            taskData.conda_env = taskData.condaEnv;
            delete taskData.condaEnv;
        }

        // 处理调度选项
        if (taskData.scheduleType === 'once' && taskData.scheduledDate && taskData.scheduledTime) {
            // 一次性延迟执行
            const scheduledDateTime = new Date(`${taskData.scheduledDate}T${taskData.scheduledTime}`);
            const now = new Date();
            const delaySeconds = Math.floor((scheduledDateTime - now) / 1000);

            if (delaySeconds > 0) {
                taskData.delay_seconds = delaySeconds;
            }
        } else if (taskData.scheduleType === 'cron' && taskData.cronExpression) {
            // 直接使用cron表达式
            taskData.cron_expression = taskData.cronExpression;
        }

        // 删除非API字段
        delete taskData.scheduleType;
        delete taskData.scheduledDate;
        delete taskData.scheduledTime;
        delete taskData.cronExpression;

        // 使用taskService发送请求
        const data = yield call(taskService.createTask, taskData);

        // 处理响应
        if (data.success) {
            yield put(createTaskSuccess(data.task || data));
            // 创建成功后重新获取任务列表
            yield put(fetchTasksRequest());
        } else {
            yield put(createTaskFailure(data.message || '创建任务失败'));
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
            yield put(createTaskFailure(error.message || '创建任务失败'));
        }
    }
}

// 停止任务
export function* stopTaskSaga(action) {
    try {
        const taskId = action.payload.taskId;
        // 使用taskService停止任务
        const data = yield call(taskService.stopTask, taskId);

        if (data.success) {
            yield put(stopTaskSuccess({ taskId }));
        } else {
            yield put(stopTaskFailure(data.message || '停止任务失败'));
        }

        // 无论成功与否，都重新获取任务列表
        yield put(fetchTasksRequest());
    } catch (error) {
        yield put(stopTaskFailure(error.message || '停止任务失败'));
        // 仍需重新获取任务列表以保持UI同步
        yield put(fetchTasksRequest());
    }
}