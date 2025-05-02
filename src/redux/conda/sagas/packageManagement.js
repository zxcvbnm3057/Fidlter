// 包管理相关的sagas
import { call, put } from 'redux-saga/effects';
import { condaService } from '../../../services';
import {
    installPackagesSuccess,
    installPackagesFailure,
    removePackagesSuccess,
    removePackagesFailure,
    fetchEnvDetailsRequest,
    fetchEnvironmentsRequest
} from '../reducer';

// 安装包
export function* installPackagesSaga(action) {
    try {
        const data = yield call(
            condaService.installPackages,
            action.payload.envName,
            action.payload.packages
        );
        // 修改成功返回处理，根据API返回的结构调整
        yield put(installPackagesSuccess({
            success: data.success,
            message: data.message,
            environment: data.environment,
            installed_packages: data.installed_packages
        }));
        // 操作成功后重新获取环境列表
        yield put(fetchEnvironmentsRequest());
    } catch (error) {
        // 根据Endpoint文档处理可能的错误情况
        if (error.response?.status === 400) {
            yield put(installPackagesFailure(error.message || '环境被任务使用中，无法修改包'));
        } else if (error.response?.status === 404) {
            yield put(installPackagesFailure('环境不存在'));
        } else {
            yield put(installPackagesFailure(error.message || '安装包失败'));
        }
    }
}

// 删除包
export function* removePackagesSaga(action) {
    try {
        const data = yield call(
            condaService.removePackages,
            action.payload.envName,
            action.payload.packages
        );
        // 修改成功返回处理，根据API返回的结构调整
        yield put(removePackagesSuccess({
            success: data.success,
            message: data.message,
            environment: data.environment,
            removed_packages: data.removed_packages
        }));
        // 操作成功后重新获取环境详情和环境列表
        yield put(fetchEnvDetailsRequest({ envName: action.payload.envName }));
        yield put(fetchEnvironmentsRequest());
    } catch (error) {
        // 根据Endpoint文档处理可能的错误情况
        if (error.response?.status === 400) {
            yield put(removePackagesFailure(error.message || '环境被任务使用中，无法修改包'));
        } else if (error.response?.status === 404) {
            yield put(removePackagesFailure('环境不存在'));
        } else {
            yield put(removePackagesFailure(error.message || '删除包失败'));
        }
    }
}