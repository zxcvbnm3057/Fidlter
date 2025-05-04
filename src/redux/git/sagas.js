import { call, put } from 'redux-saga/effects';
import { gitService } from '../../services';
import {
    createGitTaskSuccess,
    createGitTaskFailure,
    updateGitTaskSuccess,
    updateGitTaskFailure,
    fetchGitTaskStatusSuccess,
    fetchGitTaskStatusFailure
} from './reducer';
import { fetchTasksRequest } from '../tasks/reducer';

// 从Git仓库创建任务
export function* createGitTaskSaga(action) {
    try {
        const data = yield call(gitService.createTaskFromGit, action.payload);

        if (data.success) {
            yield put(createGitTaskSuccess(data));
            // 创建成功后刷新任务列表
            yield put(fetchTasksRequest());
        } else {
            yield put(createGitTaskFailure(data.message || '从Git仓库创建任务失败'));
        }
    } catch (error) {
        yield put(createGitTaskFailure(error.message || '从Git仓库创建任务失败'));
    }
}

// 更新Git仓库任务
export function* updateGitTaskSaga(action) {
    try {
        const { taskId, ...params } = action.payload;
        const data = yield call(gitService.updateGitTask, taskId, params);

        if (data.success) {
            yield put(updateGitTaskSuccess(data));
            // 更新成功后刷新任务列表
            yield put(fetchTasksRequest());
        } else {
            yield put(updateGitTaskFailure(data.message || '更新Git仓库任务失败'));
        }
    } catch (error) {
        yield put(updateGitTaskFailure(error.message || '更新Git仓库任务失败'));
    }
}

// 获取Git任务状态
export function* fetchGitTaskStatusSaga(action) {
    try {
        const { taskId } = action.payload;
        const data = yield call(gitService.getGitTaskStatus, taskId);

        if (data.success) {
            yield put(fetchGitTaskStatusSuccess(data));
        } else {
            yield put(fetchGitTaskStatusFailure(data.message || '获取Git任务状态失败'));
        }
    } catch (error) {
        yield put(fetchGitTaskStatusFailure(error.message || '获取Git任务状态失败'));
    }
}