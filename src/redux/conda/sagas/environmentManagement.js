// 环境管理相关的sagas
import { call, put } from 'redux-saga/effects';
import { condaService } from '../../../services';
import {
    fetchEnvironmentsSuccess,
    fetchEnvironmentsFailure,
    fetchEnvStatsSuccess,
    fetchEnvStatsFailure,
    fetchEnvDetailsSuccess,
    fetchEnvDetailsFailure,
    createEnvironmentSuccess,
    createEnvironmentFailure,
    deleteEnvironmentSuccess,
    deleteEnvironmentFailure,
    renameEnvironmentSuccess,
    renameEnvironmentFailure,
    fetchEnvironmentsRequest,
    fetchEnvStatsRequest,
    fetchEnvDetailsRequest,
    setEnvironmentsLoading,
    addEnvironment
} from '../reducer';

// 获取环境列表 - 支持流式请求
export function* fetchEnvironmentsSaga() {
    try {
        // 是否使用流式请求 (当环境数量多或网络延迟高时使用)
        const useStreamMode = true;

        if (useStreamMode) {
            // 标记加载中
            yield put(setEnvironmentsLoading(true));

            // 获取流式响应
            const response = yield call(condaService.getEnvironments, true);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 创建流式读取器
            const reader = response.body.getReader();

            // 用于解析不完整的JSON行
            let buffer = '';

            // 循环读取响应流
            while (true) {
                const { done, value } = yield call([reader, reader.read]);

                if (done) break;

                // 将接收到的数据添加到缓冲区
                buffer += new TextDecoder().decode(value);

                // 按行分割并处理完整的JSON对象
                const lines = buffer.split('\n');
                buffer = lines.pop(); // 保留最后一行（可能不完整）

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const envData = JSON.parse(line);
                            // 逐个添加环境到状态
                            yield put(addEnvironment(envData));
                        } catch (e) {
                            console.error('Error parsing JSON line:', e);
                        }
                    }
                }
            }

            // 处理缓冲区中可能剩余的最后一行
            if (buffer.trim()) {
                try {
                    const envData = JSON.parse(buffer);
                    yield put(addEnvironment(envData));
                } catch (e) {
                    console.error('Error parsing final JSON line:', e);
                }
            }

            // 标记加载完成
            yield put(setEnvironmentsLoading(false));
            yield put(fetchEnvironmentsSuccess([])); // 发送一个空数组，表示流式加载完成
        } else {
            // 常规请求
            const data = yield call(condaService.getEnvironments);
            yield put(fetchEnvironmentsSuccess(data));
        }
    } catch (error) {
        yield put(fetchEnvironmentsFailure(error.message || '获取环境列表失败'));
    }
}

// 获取环境统计信息
export function* fetchEnvStatsSaga() {
    try {
        const data = yield call(condaService.getEnvStats);
        yield put(fetchEnvStatsSuccess(data));
    } catch (error) {
        yield put(fetchEnvStatsFailure(error.message || '获取环境统计信息失败'));
    }
}

// 获取环境详情
export function* fetchEnvDetailsSaga(action) {
    try {
        const data = yield call(condaService.getEnvironmentDetails, action.payload.envName);
        yield put(fetchEnvDetailsSuccess(data));
    } catch (error) {
        if (error.response?.status === 404) {
            yield put(fetchEnvDetailsFailure('环境不存在'));
        } else {
            yield put(fetchEnvDetailsFailure(error.message || '获取环境详情失败'));
        }
    }
}

// 创建新环境
export function* createEnvironmentSaga(action) {
    try {
        const data = yield call(condaService.createEnvironment, { name: action.payload.name });
        yield put(createEnvironmentSuccess({
            success: data.success,
            env: data.environment || null
        }));
        // 创建成功后重新获取环境列表和统计信息
        yield put(fetchEnvironmentsRequest());
        yield put(fetchEnvStatsRequest());
    } catch (error) {
        yield put(createEnvironmentFailure(error.message || '创建环境失败'));
    }
}

// 删除环境
export function* deleteEnvironmentSaga(action) {
    try {
        yield call(condaService.deleteEnvironment, action.payload.envName);
        yield put(deleteEnvironmentSuccess({ envName: action.payload.envName }));
        // 删除成功后重新获取环境列表和统计信息
        yield put(fetchEnvironmentsRequest());
        yield put(fetchEnvStatsRequest());
    } catch (error) {
        if (error.response?.status === 400) {
            yield put(deleteEnvironmentFailure('无法删除被任务引用的环境'));
        } else if (error.response?.status === 404) {
            yield put(deleteEnvironmentFailure('环境不存在'));
        } else {
            yield put(deleteEnvironmentFailure(error.message || '删除环境失败'));
        }
    }
}

// 重命名环境
export function* renameEnvironmentSaga(action) {
    try {
        yield call(
            condaService.renameEnvironment,
            action.payload.envName,
            action.payload.newName
        );
        yield put(renameEnvironmentSuccess({
            success: true,
            envName: action.payload.envName,
            new_name: action.payload.newName
        }));
        // 重命名成功后重新获取环境列表和统计信息
        yield put(fetchEnvironmentsRequest());
        yield put(fetchEnvStatsRequest());
    } catch (error) {
        if (error.response?.status === 400) {
            yield put(renameEnvironmentFailure(error.message || '新环境名已存在'));
        } else if (error.response?.status === 404) {
            yield put(renameEnvironmentFailure('环境不存在'));
        } else {
            yield put(renameEnvironmentFailure(error.message || '重命名环境失败'));
        }
    }
}