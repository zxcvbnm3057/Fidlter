import { takeLatest } from 'redux-saga/effects';
import {
    createGitTaskRequest,
    updateGitTaskRequest,
    fetchGitTaskStatusRequest
} from './reducer';
import {
    createGitTaskSaga,
    updateGitTaskSaga,
    fetchGitTaskStatusSaga
} from './sagas';

export default function* gitSagas() {
    yield takeLatest(createGitTaskRequest.type, createGitTaskSaga);
    yield takeLatest(updateGitTaskRequest.type, updateGitTaskSaga);
    yield takeLatest(fetchGitTaskStatusRequest.type, fetchGitTaskStatusSaga);
}