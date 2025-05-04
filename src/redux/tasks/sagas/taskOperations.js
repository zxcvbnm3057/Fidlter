// 任务操作相关的sagas
import { call, put } from 'redux-saga/effects';
import { taskService } from '../../../services';
import {
    createTaskSuccess,
    createTaskFailure,
    stopTaskSuccess,
    stopTaskFailure,
    pauseTaskSuccess,
    pauseTaskFailure,
    resumeTaskSuccess,
    resumeTaskFailure,
    fetchTasksRequest,
    fetchTaskStatsRequest,
    deleteTaskSuccess,
    deleteTaskFailure,
    updateTaskSuccess,
    updateTaskFailure
} from '../reducer';

// 创建任务
export function* createTaskSaga(action) {
    try {
        // FormData对象已经在TaskForm组件中创建
        // 直接使用taskService发送请求
        const data = yield call(taskService.createTask, action.payload);

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
        // 更新任务统计信息
        yield put(fetchTaskStatsRequest());
    } catch (error) {
        yield put(stopTaskFailure(error.message || '停止任务失败'));
        // 仍需重新获取任务列表以保持UI同步
        yield put(fetchTasksRequest());
    }
}

// 暂停任务
export function* pauseTaskSaga(action) {
    try {
        const taskId = action.payload.taskId;
        // 使用taskService暂停任务
        const data = yield call(taskService.pauseTask, taskId);

        if (data.success) {
            yield put(pauseTaskSuccess({ taskId }));
        } else {
            yield put(pauseTaskFailure(data.message || '暂停任务失败'));
        }

        // 无论成功与否，都重新获取任务列表
        yield put(fetchTasksRequest());
    } catch (error) {
        yield put(pauseTaskFailure(error.message || '暂停任务失败'));
        // 仍需重新获取任务列表以保持UI同步
        yield put(fetchTasksRequest());
    }
}

// 恢复任务
export function* resumeTaskSaga(action) {
    try {
        const taskId = action.payload.taskId;
        // 使用taskService恢复任务
        const data = yield call(taskService.resumeTask, taskId);

        if (data.success) {
            yield put(resumeTaskSuccess({ taskId }));
        } else {
            yield put(resumeTaskFailure(data.message || '恢复任务失败'));
        }

        // 无论成功与否，都重新获取任务列表
        yield put(fetchTasksRequest());
    } catch (error) {
        yield put(resumeTaskFailure(error.message || '恢复任务失败'));
        // 仍需重新获取任务列表以保持UI同步
        yield put(fetchTasksRequest());
    }
}

// 删除任务
export function* deleteTaskSaga(action) {
    try {
        const taskId = action.payload.taskId;
        // 使用taskService删除任务
        const data = yield call(taskService.deleteTask, taskId);

        if (data.success) {
            yield put(deleteTaskSuccess({ taskId }));
        } else {
            yield put(deleteTaskFailure(data.message || '删除任务失败'));
        }

        // 无论成功与否，都重新获取任务列表
        yield put(fetchTasksRequest());
        // 更新任务统计信息
        yield put(fetchTaskStatsRequest());
    } catch (error) {
        yield put(deleteTaskFailure(error.message || '删除任务失败'));
        // 仍需重新获取任务列表以保持UI同步
        yield put(fetchTasksRequest());
    }
}

// 更新任务
export function* updateTaskSaga(action) {
    try {
        const { taskId, ...taskData } = action.payload;

        // 调整任务参数格式，将前端参数转换为API格式
        const apiTaskData = { ...taskData };

        // 处理Conda环境
        if (apiTaskData.condaEnv) {
            apiTaskData.conda_env = apiTaskData.condaEnv;
            delete apiTaskData.condaEnv;
        }

        // 处理调度选项
        if (apiTaskData.scheduleType === 'once' && apiTaskData.scheduledDate && apiTaskData.scheduledTime) {
            // 一次性延迟执行
            const scheduledDateTime = new Date(`${apiTaskData.scheduledDate}T${apiTaskData.scheduledTime}`);
            const now = new Date();
            const delaySeconds = Math.floor((scheduledDateTime - now) / 1000);

            if (delaySeconds > 0) {
                apiTaskData.delay_seconds = delaySeconds;
            }
        } else if (apiTaskData.scheduleType === 'cron' && apiTaskData.cronExpression) {
            // 直接使用cron表达式
            apiTaskData.cron_expression = apiTaskData.cronExpression;
        }

        // 删除非API字段
        delete apiTaskData.scheduleType;
        delete apiTaskData.scheduledDate;
        delete apiTaskData.scheduledTime;
        delete apiTaskData.cronExpression;

        // 使用taskService更新任务
        const data = yield call(taskService.updateTask, taskId, apiTaskData);

        if (data.success) {
            yield put(updateTaskSuccess(data.task || data));
        } else {
            yield put(updateTaskFailure(data.message || '更新任务失败'));
        }

        // 无论成功与否，都重新获取任务列表
        yield put(fetchTasksRequest());
    } catch (error) {
        // 根据API文档处理特定错误
        if (error.response?.status === 400) {
            if (error.response.data.message.includes('cannot be updated')) {
                yield put(updateTaskFailure('当前状态的任务不能被更新'));
            } else if (error.response.data.message.includes('cron expression')) {
                yield put(updateTaskFailure('Cron表达式无效'));
            } else {
                yield put(updateTaskFailure(error.response.data.message || '更新任务失败'));
            }
        } else {
            yield put(updateTaskFailure(error.message || '更新任务失败'));
        }

        // 仍需重新获取任务列表以保持UI同步
        yield put(fetchTasksRequest());
    }
}