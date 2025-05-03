import { all, takeLatest } from 'redux-saga/effects';
import {
    fetchTasksRequest,
    fetchTaskHistoryRequest,
    fetchTaskStatsRequest,
    createTaskRequest,
    stopTaskRequest,
    pauseTaskRequest,
    resumeTaskRequest,
    disableTaskRequest,
    fetchTaskDetailsRequest,
    fetchTaskLogsRequest
} from './reducer';
import { fetchTasksSaga, fetchTaskHistorySaga, fetchTaskStatsSaga, fetchTaskDetailsSaga, fetchTaskLogsSaga } from './sagas/taskQueries';
import { createTaskSaga, stopTaskSaga, pauseTaskSaga, resumeTaskSaga, disableTaskSaga } from './sagas/taskOperations';

// 根Saga
export default function* rootTasksSaga() {
    yield all([
        // 查询Sagas
        takeLatest(fetchTasksRequest.type, fetchTasksSaga),
        takeLatest(fetchTaskHistoryRequest.type, fetchTaskHistorySaga),
        takeLatest(fetchTaskStatsRequest.type, fetchTaskStatsSaga),
        takeLatest(fetchTaskDetailsRequest.type, fetchTaskDetailsSaga),
        takeLatest(fetchTaskLogsRequest.type, fetchTaskLogsSaga),

        // 操作Sagas
        takeLatest(createTaskRequest.type, createTaskSaga),
        takeLatest(stopTaskRequest.type, stopTaskSaga),
        takeLatest(pauseTaskRequest.type, pauseTaskSaga),
        takeLatest(resumeTaskRequest.type, resumeTaskSaga),
        takeLatest(disableTaskRequest.type, disableTaskSaga)
    ]);
}