import React, { useEffect, useState } from 'react';
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
} from '../redux/conda/reducer';
import {
    CButton,
    CTable,
    CAlert,
    CSpinner,
    CCard,
    CCardBody,
    CCardTitle,
    CRow,
    CCol,
    CFormInput,
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
    CCardHeader,
    CBadge,
    CProgress
} from '@coreui/react';
import { CChart } from '@coreui/react-chartjs';
import { cilTrash, cilPencil, cilPlus, cilInfo } from '@coreui/icons';
import CIcon from '@coreui/icons-react';

const CondaManager = () => {
    const dispatch = useDispatch();
    const {
        environments,
        envStats,
        envDetails,
        loading,
        error,
        createModalVisible,
        newEnvName,
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
        dispatch(createEnvironmentRequest({ name: newEnvName }));
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

        // 将输入的包名按行或逗号分割转换为数组
        const packagesArray = newPackages
            .split(/[\n,]+/)
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

    // 为环境使用情况准备饼图数据
    const prepareEnvUsageChart = () => {
        if (!envStats || !envStats.environment_usage || envStats.environment_usage.length === 0) return null;

        return {
            labels: envStats.environment_usage.map(item => item.name),
            datasets: [
                {
                    data: envStats.environment_usage.map(item => item.usage_percent),
                    backgroundColor: [
                        '#4BC0C0', '#FF6384', '#36A2EB', '#FFCE56', '#9966FF',
                        '#FF9F40', '#2EB85C', '#3399FF', '#E55353', '#F9B115'
                    ],
                }
            ]
        };
    };

    // 为环境包数量准备柱状图数据
    const preparePackagesChart = () => {
        if (!envStats || !envStats.package_stats || envStats.package_stats.length === 0) return null;

        return {
            labels: envStats.package_stats.map(item => item.name),
            datasets: [
                {
                    label: '已安装包数量',
                    backgroundColor: '#36A2EB',
                    data: envStats.package_stats.map(item => item.package_count),
                }
            ]
        };
    };

    if (loading && environments.length === 0) {
        return <div className="text-center mt-5"><CSpinner color="primary" /></div>;
    }

    return (
        <div>
            <h2>Conda环境管理</h2>
            {error && <CAlert color="danger">{error}</CAlert>}

            <CRow className="mb-4">
                <CCol sm={6} lg={3}>
                    <CCard className="mb-4 text-center">
                        <CCardBody>
                            <CCardTitle component="h5">总环境数</CCardTitle>
                            <div className="h1 mt-3 mb-2">{envStats?.total_environments || environments.length}</div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol sm={6} lg={3}>
                    <CCard className="mb-4 text-center">
                        <CCardBody>
                            <CCardTitle component="h5">活跃环境</CCardTitle>
                            <div className="h1 mt-3 mb-2 text-success">
                                {envStats?.active_environments || 0}
                            </div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol sm={6} lg={3}>
                    <CCard className="mb-4 text-center">
                        <CCardBody>
                            <CCardTitle component="h5">磁盘使用</CCardTitle>
                            <div className="h1 mt-3 mb-2 text-info">
                                {envStats?.total_disk_usage ? `${envStats.total_disk_usage} GB` : '0 GB'}
                            </div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol sm={6} lg={3}>
                    <CCard className="mb-4 text-center">
                        <CCardBody>
                            <CCardTitle component="h5">最近创建</CCardTitle>
                            <div className="h1 mt-3 mb-2 text-warning">
                                {envStats?.latest_created?.name || (environments.length > 0 ? environments[environments.length - 1].name : '-')}
                            </div>
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>

            <CRow className="mb-4">
                <CCol md={5}>
                    <CCard className="mb-4">
                        <CCardBody>
                            <CCardTitle component="h5">环境使用情况</CCardTitle>
                            {prepareEnvUsageChart() && (
                                <CChart
                                    type="pie"
                                    data={prepareEnvUsageChart()}
                                    options={{
                                        plugins: {
                                            legend: {
                                                position: 'bottom',
                                            }
                                        },
                                        maintainAspectRatio: false,
                                    }}
                                    style={{ height: '250px' }}
                                />
                            )}
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol md={7}>
                    <CCard className="mb-4">
                        <CCardBody>
                            <CCardTitle component="h5">环境包数量统计</CCardTitle>
                            {preparePackagesChart() && (
                                <CChart
                                    type="bar"
                                    data={preparePackagesChart()}
                                    options={{
                                        plugins: {
                                            legend: {
                                                position: 'top',
                                            }
                                        },
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                                title: {
                                                    display: true,
                                                    text: '包数量'
                                                }
                                            }
                                        },
                                        maintainAspectRatio: false,
                                    }}
                                    style={{ height: '250px' }}
                                />
                            )}
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>

            <CCard>
                <CCardHeader className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">环境列表</h5>
                    <CButton color="primary" onClick={() => dispatch(showCreateModal())}>
                        <CIcon icon={cilPlus} className="me-2" />
                        创建新环境
                    </CButton>
                </CCardHeader>
                <CCardBody>
                    <CTable striped hover responsive>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>环境名称</th>
                                <th>状态</th>
                                <th>Python版本</th>
                                <th>使用率</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {environments.length > 0 ? (
                                environments.map((env) => {
                                    // 查找环境在统计数据中的使用率
                                    const usageData = envStats?.environment_usage?.find(item => item.name === env.name);
                                    const usagePercent = usageData ? usageData.usage_percent : 0;

                                    return (
                                        <tr key={env.name}>
                                            <td>{environments.indexOf(env) + 1}</td>
                                            <td>{env.name}</td>
                                            <td>
                                                <CBadge color="success">活跃</CBadge>
                                            </td>
                                            <td>{env.python_version || '未知'}</td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <div className="me-2" style={{ width: '60%' }}>
                                                        <CProgress
                                                            value={usagePercent}
                                                            color="info"
                                                            height={8}
                                                        />
                                                    </div>
                                                    <small>{usagePercent}%</small>
                                                </div>
                                            </td>
                                            <td>
                                                <CButton color="info" size="sm" className="me-2" onClick={() => openDetails(env)}>
                                                    <CIcon icon={cilInfo} />
                                                </CButton>
                                                <CButton color="warning" size="sm" className="me-2" onClick={() => openEdit(env)}>
                                                    <CIcon icon={cilPencil} />
                                                </CButton>
                                                <CButton color="danger" size="sm" onClick={() => handleDeleteEnvironment(env.name)}>
                                                    <CIcon icon={cilTrash} />
                                                </CButton>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center">
                                        {loading ? <CSpinner size="sm" /> : '暂无环境数据'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </CTable>
                </CCardBody>
            </CCard>

            {/* 创建环境模态框 */}
            <CModal visible={createModalVisible} onClose={() => dispatch(hideCreateModal())}>
                <CModalHeader onClose={() => dispatch(hideCreateModal())}>
                    <CModalTitle>创建新Conda环境</CModalTitle>
                </CModalHeader>
                <CModalBody>
                    <div className="mb-3">
                        <label className="form-label">环境名称</label>
                        <CFormInput
                            type="text"
                            value={newEnvName}
                            onChange={(e) => dispatch(setNewEnvName(e.target.value))}
                            placeholder="输入环境名称"
                        />
                    </div>
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" onClick={() => dispatch(hideCreateModal())}>
                        取消
                    </CButton>
                    <CButton color="primary" onClick={handleCreateEnvironment}>
                        创建
                    </CButton>
                </CModalFooter>
            </CModal>

            {/* 环境详情模态框 */}
            <CModal visible={detailsModalVisible} onClose={() => dispatch(hideDetailsModal())} size="lg">
                <CModalHeader onClose={() => dispatch(hideDetailsModal())}>
                    <CModalTitle>环境详情: {selectedEnv?.name}</CModalTitle>
                </CModalHeader>
                <CModalBody>
                    {selectedEnv && envDetails && (
                        <CCard>
                            <CCardBody>
                                <CRow>
                                    <CCol md={6}>
                                        <h6>基本信息</h6>
                                        <p><strong>环境名称:</strong> {envDetails.name}</p>
                                        <p><strong>Python版本:</strong> {envDetails.python_version || '未知'}</p>
                                        <p><strong>创建日期:</strong> {envDetails.created_at || '未知'}</p>
                                    </CCol>
                                    <CCol md={6}>
                                        <h6>使用统计</h6>
                                        <p><strong>总任务数:</strong> {envDetails.usage_stats?.total_tasks || 0}</p>
                                        <p><strong>成功率:</strong> {envDetails.usage_stats?.success_rate || 0}%</p>
                                        <p><strong>平均执行时间:</strong> {envDetails.usage_stats?.avg_execution_time || 0}秒</p>
                                        <p><strong>磁盘占用:</strong> {envDetails.usage_stats?.disk_usage || 0} GB</p>
                                    </CCol>
                                </CRow>
                                <h6 className="mt-4">已安装的主要包</h6>
                                <CTable small bordered>
                                    <thead>
                                        <tr>
                                            <th>包名</th>
                                            <th>版本</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {envDetails.packages && envDetails.packages.length > 0 ? (
                                            envDetails.packages.map((pkg, index) => (
                                                <tr key={index}>
                                                    <td>{pkg.name}</td>
                                                    <td>{pkg.version}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="2" className="text-center">暂无包信息</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </CTable>
                            </CCardBody>
                        </CCard>
                    )}
                    {selectedEnv && !envDetails && (
                        <div className="text-center mt-3 mb-3">
                            <CSpinner color="primary" />
                            <p className="mt-2">正在加载环境详情...</p>
                        </div>
                    )}
                </CModalBody>
                <CModalFooter>
                    <CButton color="primary" onClick={() => dispatch(showInstallPackagesModal(selectedEnv))}>
                        安装包
                    </CButton>
                    <CButton
                        color="warning"
                        onClick={() => dispatch(showRemovePackagesModal({
                            env: selectedEnv,
                            packages: envDetails?.packages?.map(pkg => pkg.name) || []
                        }))}
                    >
                        删除包
                    </CButton>
                    <CButton color="secondary" onClick={() => dispatch(hideDetailsModal())}>
                        关闭
                    </CButton>
                </CModalFooter>
            </CModal>

            {/* 编辑环境模态框 */}
            <CModal visible={editModalVisible} onClose={() => dispatch(hideEditModal())}>
                <CModalHeader onClose={() => dispatch(hideEditModal())}>
                    <CModalTitle>编辑环境: {selectedEnv?.name}</CModalTitle>
                </CModalHeader>
                <CModalBody>
                    <div className="mb-3">
                        <label className="form-label">新环境名称</label>
                        <CFormInput
                            type="text"
                            value={editEnvName}
                            onChange={(e) => dispatch(setEditEnvName(e.target.value))}
                            placeholder="输入新环境名称"
                        />
                    </div>
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" onClick={() => dispatch(hideEditModal())}>
                        取消
                    </CButton>
                    <CButton color="primary" onClick={handleRenameEnvironment}>
                        保存
                    </CButton>
                </CModalFooter>
            </CModal>

            {/* 安装包模态框 */}
            <CModal visible={installPackagesModalVisible} onClose={() => dispatch(hideInstallPackagesModal())}>
                <CModalHeader onClose={() => dispatch(hideInstallPackagesModal())}>
                    <CModalTitle>安装包: {selectedEnv?.name}</CModalTitle>
                </CModalHeader>
                <CModalBody>
                    <div className="mb-3">
                        <label className="form-label">要安装的包列表</label>
                        <CFormInput
                            as="textarea"
                            rows={5}
                            value={newPackages}
                            onChange={(e) => dispatch(setNewPackages(e.target.value))}
                            placeholder="输入要安装的包名，每行一个或用逗号分隔，例如：numpy,pandas,matplotlib>=3.4.0"
                        />
                        <small className="text-muted">提示：可以指定版本，例如 numpy==1.20.0，也可以使用 {'>='} 指定最低版本</small>
                    </div>
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" onClick={() => dispatch(hideInstallPackagesModal())}>
                        取消
                    </CButton>
                    <CButton color="primary" onClick={handleInstallPackages}>
                        安装
                    </CButton>
                </CModalFooter>
            </CModal>

            {/* 删除包模态框 */}
            <CModal visible={removePackagesModalVisible} onClose={() => dispatch(hideRemovePackagesModal())}>
                <CModalHeader onClose={() => dispatch(hideRemovePackagesModal())}>
                    <CModalTitle>删除包: {selectedEnv?.name}</CModalTitle>
                </CModalHeader>
                <CModalBody>
                    <div className="mb-3">
                        <label className="form-label">选择要删除的包</label>
                        <div className="border p-3 rounded" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            {envDetails?.packages?.length > 0 ? (
                                envDetails.packages.map((pkg, index) => (
                                    <div className="form-check" key={index}>
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id={`pkg-${index}`}
                                            value={pkg.name}
                                            checked={selectedPackages.includes(pkg.name)}
                                            onChange={(e) => {
                                                const name = pkg.name;
                                                if (e.target.checked) {
                                                    dispatch(setSelectedPackages([...selectedPackages, name]));
                                                } else {
                                                    dispatch(setSelectedPackages(selectedPackages.filter(p => p !== name)));
                                                }
                                            }}
                                        />
                                        <label className="form-check-label" htmlFor={`pkg-${index}`}>
                                            {pkg.name} ({pkg.version})
                                        </label>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-muted">该环境中没有可删除的包</p>
                            )}
                        </div>
                        {selectedPackages.length > 0 && (
                            <div className="mt-2">
                                <small className="text-primary">已选择 {selectedPackages.length} 个包</small>
                            </div>
                        )}
                    </div>
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" onClick={() => dispatch(hideRemovePackagesModal())}>
                        取消
                    </CButton>
                    <CButton
                        color="danger"
                        onClick={handleRemovePackages}
                        disabled={selectedPackages.length === 0}
                    >
                        删除
                    </CButton>
                </CModalFooter>
            </CModal>
        </div>
    );
};

export default CondaManager;