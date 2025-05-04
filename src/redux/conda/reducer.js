import { createSlice } from '@reduxjs/toolkit';

// 初始状态
const initialState = {
    environments: [],
    envStats: {},
    envDetails: null,
    loading: false,
    error: null,
    streamLoading: false, // 标记流式加载状态
    extendedInfoLoading: {}, // 存储每个环境扩展信息的加载状态
    extendedInfo: {}, // 存储每个环境的扩展信息
    envDetailsLoading: false, // 用于标记环境详情加载状态

    // 添加模态框和表单相关的状态
    createModalVisible: false,
    newEnvName: '',
    pythonVersion: '3.10', // Python版本
    initialPackages: '', // 初始包列表
    pythonVersionOptions: [], // 可用的Python版本列表
    pythonVersionSource: null, // Python版本数据来源
    pythonVersionsLoading: false, // Python版本是否加载中

    selectedEnv: null,
    detailsModalVisible: false,
    editModalVisible: false,
    editEnvName: '',

    // 包管理相关状态
    installPackagesModalVisible: false,
    newPackages: '',
    removePackagesModalVisible: false,
    selectedPackages: []
};

// 创建Conda环境管理切片
const condaSlice = createSlice({
    name: 'conda',
    initialState,
    reducers: {
        // 设置环境加载状态（用于流式加载）
        setEnvironmentsLoading: (state, action) => {
            state.streamLoading = action.payload;
            if (action.payload === true) {
                // 开始新的流式加载时，清空原有环境列表
                state.environments = [];
            }
        },

        // 添加单个环境（用于流式加载）
        addEnvironment: (state, action) => {
            state.environments.push(action.payload);
        },

        // 获取环境列表请求
        fetchEnvironmentsRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 获取环境列表成功
        fetchEnvironmentsSuccess: (state, action) => {
            state.loading = false;
            // 仅在非流式加载时才替换环境列表
            if (action.payload.length > 0) {
                state.environments = action.payload;
            }
        },
        // 获取环境列表失败
        fetchEnvironmentsFailure: (state, action) => {
            state.loading = false;
            state.streamLoading = false; // 确保流式加载状态也被重置
            state.error = action.payload;
        },

        // 获取环境统计信息请求
        fetchEnvStatsRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 获取环境统计信息成功
        fetchEnvStatsSuccess: (state, action) => {
            state.loading = false;
            state.envStats = action.payload;
        },
        // 获取环境统计信息失败
        fetchEnvStatsFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 获取环境详情请求
        fetchEnvDetailsRequest: (state) => {
            // 使用单独的加载标识而不是全局loading状态
            state.envDetailsLoading = true;
            state.error = null;
        },
        // 获取环境详情成功
        fetchEnvDetailsSuccess: (state, action) => {
            state.envDetailsLoading = false;
            state.envDetails = action.payload;
        },
        // 获取环境详情失败
        fetchEnvDetailsFailure: (state, action) => {
            state.envDetailsLoading = false;
            state.error = action.payload;
        },

        // 创建环境请求
        createEnvironmentRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 创建环境成功
        createEnvironmentSuccess: (state, action) => {
            state.loading = false;
            // 仅在API返回新环境时添加到列表
            if (action.payload.env) {
                state.environments = [...state.environments, action.payload.env];
            }
        },
        // 创建环境失败
        createEnvironmentFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 删除环境请求
        deleteEnvironmentRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 删除环境成功
        deleteEnvironmentSuccess: (state, action) => {
            state.loading = false;
            state.environments = state.environments.filter(
                (env) => env.name !== action.payload.envName
            );
        },
        // 删除环境失败
        deleteEnvironmentFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 重命名环境请求
        renameEnvironmentRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 重命名环境成功
        renameEnvironmentSuccess: (state, action) => {
            state.loading = false;
            // 更新环境名称
            state.environments = state.environments.map(env =>
                env.name === action.payload.envName
                    ? { ...env, name: action.payload.new_name }
                    : env
            );
        },
        // 重命名环境失败
        renameEnvironmentFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 安装包请求
        installPackagesRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 安装包成功
        installPackagesSuccess: (state) => {
            state.loading = false;
        },
        // 安装包失败
        installPackagesFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 删除包请求
        removePackagesRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        // 删除包成功
        removePackagesSuccess: (state) => {
            state.loading = false;
        },
        // 删除包失败
        removePackagesFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },

        // 获取Python版本列表请求
        fetchPythonVersionsRequest: (state) => {
            state.pythonVersionsLoading = true;
            state.error = null;
        },
        // 获取Python版本列表成功
        fetchPythonVersionsSuccess: (state, action) => {
            state.pythonVersionsLoading = false;
            state.pythonVersionOptions = action.payload.versions;
            state.pythonVersionSource = action.payload.source;

            // 如果当前设置的版本不在获取的列表中，则重置为列表中的第一个版本
            if (state.pythonVersionOptions.length > 0 &&
                !state.pythonVersionOptions.includes(state.pythonVersion)) {
                state.pythonVersion = state.pythonVersionOptions[0];
            }
        },
        // 获取Python版本列表失败
        fetchPythonVersionsFailure: (state, action) => {
            state.pythonVersionsLoading = false;
            state.error = action.payload;
        },

        // 获取环境扩展信息请求
        fetchEnvExtendedInfoRequest: (state, action) => {
            const envName = action.payload;
            state.extendedInfoLoading = {
                ...state.extendedInfoLoading,
                [envName]: true
            };
        },
        // 获取环境扩展信息成功
        fetchEnvExtendedInfoSuccess: (state, action) => {
            const { envName, data } = action.payload;
            state.extendedInfoLoading = {
                ...state.extendedInfoLoading,
                [envName]: false
            };
            state.extendedInfo = {
                ...state.extendedInfo,
                [envName]: data
            };
        },
        // 获取环境扩展信息失败
        fetchEnvExtendedInfoFailure: (state, action) => {
            const { envName, error } = action.payload;
            state.extendedInfoLoading = {
                ...state.extendedInfoLoading,
                [envName]: false
            };
            // 可以选择是否存储错误信息
        },

        // 打开创建环境模态框
        showCreateModal: (state) => {
            state.createModalVisible = true;
            state.newEnvName = '';
            state.pythonVersion = '3.10'; // 重置为默认Python版本
            state.initialPackages = ''; // 重置初始包列表
        },
        // 关闭创建环境模态框
        hideCreateModal: (state) => {
            state.createModalVisible = false;
        },
        // 更新新环境名称
        setNewEnvName: (state, action) => {
            state.newEnvName = action.payload;
        },

        // 更新Python版本
        setPythonVersion: (state, action) => {
            state.pythonVersion = action.payload;
        },

        // 更新初始包列表
        setInitialPackages: (state, action) => {
            state.initialPackages = action.payload;
        },

        // 打开环境详情模态框
        showDetailsModal: (state, action) => {
            state.selectedEnv = action.payload;
            state.detailsModalVisible = true;
        },
        // 关闭环境详情模态框
        hideDetailsModal: (state) => {
            state.detailsModalVisible = false;
        },

        // 打开编辑环境模态框
        showEditModal: (state, action) => {
            state.selectedEnv = action.payload;
            state.editEnvName = action.payload.name;
            state.editModalVisible = true;
        },
        // 关闭编辑环境模态框
        hideEditModal: (state) => {
            state.editModalVisible = false;
        },
        // 更新编辑环境名称
        setEditEnvName: (state, action) => {
            state.editEnvName = action.payload;
        },

        // 打开安装包模态框
        showInstallPackagesModal: (state, action) => {
            state.selectedEnv = action.payload;
            state.installPackagesModalVisible = true;
            state.newPackages = '';
        },
        // 关闭安装包模态框
        hideInstallPackagesModal: (state) => {
            state.installPackagesModalVisible = false;
        },
        // 更新新包列表
        setNewPackages: (state, action) => {
            state.newPackages = action.payload;
        },

        // 打开删除包模态框
        showRemovePackagesModal: (state, action) => {
            state.selectedEnv = action.payload.env;
            state.selectedPackages = action.payload.packages || [];
            state.removePackagesModalVisible = true;
        },
        // 关闭删除包模态框
        hideRemovePackagesModal: (state) => {
            state.removePackagesModalVisible = false;
            state.selectedPackages = [];
        },
        // 设置选中的包
        setSelectedPackages: (state, action) => {
            state.selectedPackages = action.payload;
        }
    }
});

// 导出action creators
export const {
    setEnvironmentsLoading,
    addEnvironment,
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
    removePackagesFailure,
    fetchPythonVersionsRequest,
    fetchPythonVersionsSuccess,
    fetchPythonVersionsFailure,
    fetchEnvExtendedInfoRequest,
    fetchEnvExtendedInfoSuccess,
    fetchEnvExtendedInfoFailure,
    showCreateModal,
    hideCreateModal,
    setNewEnvName,
    setPythonVersion,
    setInitialPackages,
    showDetailsModal,
    hideDetailsModal,
    showEditModal,
    hideEditModal,
    setEditEnvName,
    showInstallPackagesModal,
    hideInstallPackagesModal,
    setNewPackages,
    showRemovePackagesModal,
    hideRemovePackagesModal,
    setSelectedPackages
} = condaSlice.actions;

// 导出reducer
export default condaSlice.reducer;