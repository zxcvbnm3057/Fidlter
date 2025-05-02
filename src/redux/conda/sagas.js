import { takeLatest, call, put, all } from 'redux-saga/effects';
import axios from '../../utils/axios';
import {
    fetchEnvironmentsRequest,
    fetchEnvironmentsSuccess,
    fetchEnvironmentsFailure,
    fetchEnvStatsRequest,
    fetchEnvStatsSuccess,
    fetchEnvStatsFailure,
    fetchEnvDetailsRequest,
    fetchEnvDetailsSuccess,
    fetchEnvDetailsFailure,
    createEnvironmentRequest,
    createEnvironmentSuccess,
    createEnvironmentFailure,
    deleteEnvironmentRequest,
    deleteEnvironmentSuccess,
    deleteEnvironmentFailure,
    renameEnvironmentRequest,
    renameEnvironmentSuccess,
    renameEnvironmentFailure,
    installPackagesRequest,
    installPackagesSuccess,
    installPackagesFailure,
    removePackagesRequest,
    removePackagesSuccess,
    removePackagesFailure
} from './reducer';

// 获取环境列表 - 路径已符合Endpoint文档
function* fetchEnvironmentsSaga() {
    try {
        const response = yield call(axios.get, '/api/conda/environments');
        yield put(fetchEnvironmentsSuccess(response.data));
    } catch (error) {
        yield put(fetchEnvironmentsFailure(error.response?.data?.message || '获取环境列表失败'));
    }
}

// 获取环境统计信息
function* fetchEnvStatsSaga() {
    try {
        const response = yield call(axios.get, '/api/conda/stats');
        yield put(fetchEnvStatsSuccess(response.data));
    } catch (error) {
        yield put(fetchEnvStatsFailure(error.response?.data?.message || '获取环境统计信息失败'));
    }
}

// 获取环境详情
function* fetchEnvDetailsSaga(action) {
    try {
        // 使用环境名称而不是env_id来获取环境详情
        const response = yield call(axios.get, `/api/conda/environment/${action.payload.envName}`);
        yield put(fetchEnvDetailsSuccess(response.data));
    } catch (error) {
        if (error.response?.status === 404) {
            yield put(fetchEnvDetailsFailure('环境不存在'));
        } else {
            yield put(fetchEnvDetailsFailure(error.response?.data?.message || '获取环境详情失败'));
        }
    }
}

// 创建新环境 - 路径已符合Endpoint文档
function* createEnvironmentSaga(action) {
    try {
        const response = yield call(axios.post, '/api/conda/environment', { name: action.payload.name });
        // 修改成功返回处理，根据API返回的结构调整
        yield put(createEnvironmentSuccess({
            success: response.data.success,
            env: response.data.environment || null
        }));
        // 创建成功后重新获取环境列表和统计信息
        yield put(fetchEnvironmentsRequest());
        yield put(fetchEnvStatsRequest());
    } catch (error) {
        yield put(createEnvironmentFailure(error.response?.data?.message || '创建环境失败'));
    }
}

// 删除环境 - 路径已符合Endpoint文档
function* deleteEnvironmentSaga(action) {
    try {
        // 根据Endpoint文档，删除成功返回204状态码，无内容
        // 使用环境名称而不是envId
        yield call(axios.delete, `/api/conda/environment/${action.payload.envName}`);
        yield put(deleteEnvironmentSuccess({ envName: action.payload.envName }));
        // 删除成功后重新获取环境列表和统计信息
        yield put(fetchEnvironmentsRequest());
        yield put(fetchEnvStatsRequest());
    } catch (error) {
        // 根据Endpoint文档处理可能的错误情况
        if (error.response?.status === 400) {
            yield put(deleteEnvironmentFailure('无法删除被任务引用的环境'));
        } else if (error.response?.status === 404) {
            yield put(deleteEnvironmentFailure('环境不存在'));
        } else {
            yield put(deleteEnvironmentFailure(error.response?.data?.message || '删除环境失败'));
        }
    }
}

// 安装包 - 路径已符合Endpoint文档
function* installPackagesSaga(action) {
    try {
        const response = yield call(
            axios.post,
            `/api/conda/environment/${action.payload.envName}/packages`,
            { packages: action.payload.packages }
        );
        // 修改成功返回处理，根据API返回的结构调整
        yield put(installPackagesSuccess({
            success: response.data.success,
            message: response.data.message,
            environment: response.data.environment,
            installed_packages: response.data.installed_packages
        }));
        // 操作成功后重新获取环境列表
        yield put(fetchEnvironmentsRequest());
    } catch (error) {
        // 根据Endpoint文档处理可能的错误情况
        if (error.response?.status === 400) {
            yield put(installPackagesFailure(error.response?.data?.message || '环境被任务使用中，无法修改包'));
        } else if (error.response?.status === 404) {
            yield put(installPackagesFailure('环境不存在'));
        } else {
            yield put(installPackagesFailure(error.response?.data?.message || '安装包失败'));
        }
    }
}

// 重命名环境 - 路径已符合Endpoint文档
function* renameEnvironmentSaga(action) {
    try {
        const response = yield call(
            axios.put,
            `/api/conda/environment/${action.payload.envName}`,
            { new_name: action.payload.newName }
        );
        // 修改成功返回处理，根据API返回的结构调整
        yield put(renameEnvironmentSuccess({
            success: true,
            envName: action.payload.envName,
            new_name: action.payload.newName
        }));
        // 重命名成功后重新获取环境列表和统计信息
        yield put(fetchEnvironmentsRequest());
        yield put(fetchEnvStatsRequest());
    } catch (error) {
        // 根据Endpoint文档处理可能的错误情况
        if (error.response?.status === 400) {
            yield put(renameEnvironmentFailure(error.response?.data?.message || '新环境名已存在'));
        } else if (error.response?.status === 404) {
            yield put(renameEnvironmentFailure('环境不存在'));
        } else {
            yield put(renameEnvironmentFailure(error.response?.data?.message || '重命名环境失败'));
        }
    }
}

// 删除包 - 路径已符合Endpoint文档
function* removePackagesSaga(action) {
    try {
        const response = yield call(
            axios.delete,
            `/api/conda/environment/${action.payload.envName}/packages`,
            { data: { packages: action.payload.packages } }
        );
        // 修改成功返回处理，根据API返回的结构调整
        yield put(removePackagesSuccess({
            success: response.data.success,
            message: response.data.message,
            environment: response.data.environment,
            removed_packages: response.data.removed_packages
        }));
        // 操作成功后重新获取环境详情和环境列表
        yield put(fetchEnvDetailsRequest({ envName: action.payload.envName }));
        yield put(fetchEnvironmentsRequest());
    } catch (error) {
        // 根据Endpoint文档处理可能的错误情况
        if (error.response?.status === 400) {
            yield put(removePackagesFailure(error.response?.data?.message || '环境被任务使用中，无法修改包'));
        } else if (error.response?.status === 404) {
            yield put(removePackagesFailure('环境不存在'));
        } else {
            yield put(removePackagesFailure(error.response?.data?.message || '删除包失败'));
        }
    }
}

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