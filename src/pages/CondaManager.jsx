import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchEnvironmentsRequest,
    fetchEnvStatsRequest,
    fetchEnvDetailsRequest,
    createEnvironmentRequest,
    deleteEnvironmentRequest,
    renameEnvironmentRequest,
    installPackagesRequest,
    removePackagesRequest,
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
    setSelectedPackages,
    fetchPythonVersionsRequest
} from '../redux/conda/reducer';
import { CAlert, CSpinner } from '@coreui/react';

// 导入拆分后的子组件
import EnvStatistics from '../components/CondaManager/EnvStatistics';
import EnvList from '../components/CondaManager/EnvList';
import CreateEnvModal from '../components/CondaManager/CreateEnvModal';
import EnvDetailsModal from '../components/CondaManager/EnvDetailsModal';
import EditEnvModal from '../components/CondaManager/EditEnvModal';
import { InstallPackagesModal, RemovePackagesModal } from '../components/CondaManager/PackageModals';

const CondaManagerPage = () => {
    const dispatch = useDispatch();
    const {
        environments,
        envStats,
        envDetails,
        loading,
        error,
        createModalVisible,
        newEnvName,
        pythonVersion,
        initialPackages,
        pythonVersionOptions,
        pythonVersionsLoading,
        pythonVersionSource,
        selectedEnv,
        detailsModalVisible,
        editModalVisible,
        editEnvName,
        installPackagesModalVisible,
        newPackages,
        removePackagesModalVisible,
        selectedPackages
    } = useSelector(state => state.conda);

    useEffect(() => {
        // 分发获取环境列表和统计信息请求action
        dispatch(fetchEnvironmentsRequest());
        dispatch(fetchEnvStatsRequest());
    }, [dispatch]);

    const handleCreateEnvironment = () => {
        if (!newEnvName.trim()) return;

        // 分发创建环境请求action
        dispatch(createEnvironmentRequest({
            name: newEnvName,
            pythonVersion: pythonVersion,
            packages: initialPackages
                .split(/\n+/)  // 只按换行符分隔，不再支持逗号
                .map(pkg => pkg.trim())
                .filter(pkg => pkg)
        }));
        dispatch(hideCreateModal());
    };

    const handleDeleteEnvironment = (envName) => {
        if (!window.confirm('确定要删除这个环境吗？')) return;

        // 分发删除环境请求action，使用环境名称
        dispatch(deleteEnvironmentRequest({ envName }));
    };

    const handleRenameEnvironment = () => {
        if (!editEnvName.trim() || !selectedEnv) return;

        // 分发重命名环境请求action，使用环境名称替代环境ID
        dispatch(renameEnvironmentRequest({ envName: selectedEnv.name, newName: editEnvName }));
        dispatch(hideEditModal());
    };

    const handleInstallPackages = () => {
        if (!newPackages.trim() || !selectedEnv) return;

        // 将输入的包名仅按行分割转换为数组，不再支持逗号分隔
        const packagesArray = newPackages
            .split(/\n+/)
            .map(pkg => pkg.trim())
            .filter(pkg => pkg);

        if (packagesArray.length === 0) return;

        // 分发安装包请求action，使用环境名称替代环境ID
        dispatch(installPackagesRequest({
            envName: selectedEnv.name,
            packages: packagesArray
        }));

        dispatch(hideInstallPackagesModal());
    };

    const handleRemovePackages = () => {
        if (!selectedPackages.length || !selectedEnv) return;

        // 分发删除包请求action，使用环境名称替代环境ID
        dispatch(removePackagesRequest({
            envName: selectedEnv.name,
            packages: selectedPackages
        }));

        dispatch(hideRemovePackagesModal());
    };

    const openDetails = (env) => {
        dispatch(showDetailsModal(env));
        dispatch(fetchEnvDetailsRequest({ envName: env.name }));
    };

    const openEdit = (env) => {
        dispatch(showEditModal(env));
    };

    if (loading && environments.length === 0) {
        return <div className="text-center mt-5"><CSpinner color="primary" /></div>;
    }

    return (
        <div>
            <h2>Conda环境管理</h2>
            {error && <CAlert color="danger">{error}</CAlert>}

            {/* 环境统计组件 */}
            <EnvStatistics environments={environments} envStats={envStats} error={error} />

            {/* 环境列表组件 */}
            <EnvList
                environments={environments}
                envStats={envStats}
                loading={loading}
                onShowDetails={openDetails}
                onShowEdit={openEdit}
                onDelete={handleDeleteEnvironment}
                onShowCreateModal={() => dispatch(showCreateModal())}
            />

            {/* 创建环境模态框 */}
            <CreateEnvModal
                visible={createModalVisible}
                onClose={() => dispatch(hideCreateModal())}
                envName={newEnvName}
                onEnvNameChange={(value) => dispatch(setNewEnvName(value))}
                pythonVersion={pythonVersion}
                onPythonVersionChange={(value) => dispatch(setPythonVersion(value))}
                initialPackages={initialPackages}
                onInitialPackagesChange={(value) => dispatch(setInitialPackages(value))}
                onCreate={handleCreateEnvironment}
                pythonVersionOptions={pythonVersionOptions}
                pythonVersionsLoading={pythonVersionsLoading}
                pythonVersionSource={pythonVersionSource}
                onFetchPythonVersions={() => dispatch(fetchPythonVersionsRequest())}
            />

            {/* 环境详情模态框 */}
            <EnvDetailsModal
                visible={detailsModalVisible}
                onClose={() => dispatch(hideDetailsModal())}
                env={selectedEnv}
                envDetails={envDetails}
                onShowInstallPackages={(env) => dispatch(showInstallPackagesModal(env))}
                onShowRemovePackages={(data) => dispatch(showRemovePackagesModal(data))}
            />

            {/* 编辑环境名称模态框 */}
            <EditEnvModal
                visible={editModalVisible}
                onClose={() => dispatch(hideEditModal())}
                env={selectedEnv}
                editEnvName={editEnvName}
                onEditEnvNameChange={(value) => dispatch(setEditEnvName(value))}
                onRename={handleRenameEnvironment}
            />

            {/* 安装包模态框 */}
            <InstallPackagesModal
                visible={installPackagesModalVisible}
                onClose={() => dispatch(hideInstallPackagesModal())}
                env={selectedEnv}
                newPackages={newPackages}
                onNewPackagesChange={(value) => dispatch(setNewPackages(value))}
                onInstall={handleInstallPackages}
            />

            {/* 删除包模态框 */}
            <RemovePackagesModal
                visible={removePackagesModalVisible}
                onClose={() => dispatch(hideRemovePackagesModal())}
                env={selectedEnv}
                envDetails={envDetails}
                selectedPackages={selectedPackages}
                onSelectedPackagesChange={(packages) => dispatch(setSelectedPackages(packages))}
                onRemove={handleRemovePackages}
            />
        </div>
    );
};

export default CondaManagerPage;