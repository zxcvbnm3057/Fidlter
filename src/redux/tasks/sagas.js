import { takeLatest, all } from 'redux-saga/effects';
import {
    fetchTasksRequest,
    fetchTaskHistoryRequest,
    fetchTaskStatsRequest,
    createTaskRequest,
    stopTaskRequest
} from './reducer';

// 导入拆分后的saga文件
import {
    fetchTasksSaga,
    fetchTaskHistorySaga,
    fetchTaskStatsSaga
} from './sagas/taskQueries';

import {
    createTaskSaga,
    stopTaskSaga
} from './sagas/taskOperations';

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