import { takeLatest, all } from 'redux-saga/effects';
import {
    fetchEnvironmentsRequest,
    fetchEnvStatsRequest,
    fetchEnvDetailsRequest,
    createEnvironmentRequest,
    deleteEnvironmentRequest,
    renameEnvironmentRequest,
    installPackagesRequest,
    removePackagesRequest
} from './reducer';

// 导入拆分后的saga文件
import {
    fetchEnvironmentsSaga,
    fetchEnvStatsSaga,
    fetchEnvDetailsSaga,
    createEnvironmentSaga,
    deleteEnvironmentSaga,
    renameEnvironmentSaga
} from './sagas/environmentManagement';

import {
    installPackagesSaga,
    removePackagesSaga
} from './sagas/packageManagement';

// Conda环境管理模块的根saga
export default function* condaSagas() {
    yield all([
        takeLatest(fetchEnvironmentsRequest.type, fetchEnvironmentsSaga),
        takeLatest(fetchEnvStatsRequest.type, fetchEnvStatsSaga),
        takeLatest(fetchEnvDetailsRequest.type, fetchEnvDetailsSaga),
        takeLatest(createEnvironmentRequest.type, createEnvironmentSaga),
        takeLatest(deleteEnvironmentRequest.type, deleteEnvironmentSaga),
        takeLatest(installPackagesRequest.type, installPackagesSaga),
        takeLatest(renameEnvironmentRequest.type, renameEnvironmentSaga),
        takeLatest(removePackagesRequest.type, removePackagesSaga)
    ]);
}