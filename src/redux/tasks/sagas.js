import { all, takeLatest } from 'redux-saga/effects';
import {
    fetchTasksRequest,
    createTaskRequest,
    stopTaskRequest,
    pauseTaskRequest,
    resumeTaskRequest,
    fetchTaskHistoryRequest,
    fetchTaskStatsRequest,
    fetchTaskDetailsRequest,
    fetchTaskLogsRequest,
    deleteTaskRequest,
    updateTaskRequest,
    triggerTaskRequest
} from './reducer';
import {
    createTaskSaga,
    stopTaskSaga,
    pauseTaskSaga,
    resumeTaskSaga,
    deleteTaskSaga,
    updateTaskSaga,
    triggerTaskSaga
} from './sagas/taskOperations';
import {
    fetchTasksSaga,
    fetchTaskHistorySaga,
    fetchTaskStatsSaga,
    fetchTaskDetailsSaga,
    fetchTaskLogsSaga
} from './sagas/taskQueries';

export default function* tasksSaga() {
    yield all([
        takeLatest(fetchTasksRequest.type, fetchTasksSaga),
        takeLatest(createTaskRequest.type, createTaskSaga),
        takeLatest(triggerTaskRequest.type, triggerTaskSaga),
        takeLatest(stopTaskRequest.type, stopTaskSaga),
        takeLatest(pauseTaskRequest.type, pauseTaskSaga),
        takeLatest(resumeTaskRequest.type, resumeTaskSaga),
        takeLatest(fetchTaskHistoryRequest.type, fetchTaskHistorySaga),
        takeLatest(fetchTaskStatsRequest.type, fetchTaskStatsSaga),
        takeLatest(fetchTaskDetailsRequest.type, fetchTaskDetailsSaga),
        takeLatest(fetchTaskLogsRequest.type, fetchTaskLogsSaga),
        takeLatest(deleteTaskRequest.type, deleteTaskSaga),
        takeLatest(updateTaskRequest.type, updateTaskSaga)
    ]);
}