import { all, fork } from 'redux-saga/effects';
import authSagas from './auth/sagas';
import tasksSagas from './tasks/sagas';
import condaSagas from './conda/sagas';

// 根Saga，组合所有模块的Saga
export default function* rootSaga() {
    yield all([
        fork(authSagas),
        fork(tasksSagas),
        fork(condaSagas),
    ]);
}