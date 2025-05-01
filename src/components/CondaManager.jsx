import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchEnvironmentsRequest,
    createEnvironmentRequest,
    deleteEnvironmentRequest
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
    const { environments, loading, error } = useSelector(state => state.conda);
    const [visible, setVisible] = useState(false);
    const [newEnvName, setNewEnvName] = useState('');
    const [selectedEnv, setSelectedEnv] = useState(null);
    const [detailsVisible, setDetailsVisible] = useState(false);

    useEffect(() => {
        // 分发获取环境列表请求action
        dispatch(fetchEnvironmentsRequest());
    }, [dispatch]);

    const handleCreateEnvironment = () => {
        if (!newEnvName.trim()) return;

        // 分发创建环境请求action
        dispatch(createEnvironmentRequest({ name: newEnvName }));
        setNewEnvName('');
        setVisible(false);
    };

    const handleDeleteEnvironment = (envId) => {
        if (!window.confirm('确定要删除这个环境吗？')) return;

        // 分发删除环境请求action
        dispatch(deleteEnvironmentRequest({ envId }));
    };

    const openDetails = (env) => {
        setSelectedEnv(env);
        setDetailsVisible(true);
    };

    // 为环境使用情况准备饼图数据
    const prepareEnvUsageChart = () => {
        if (environments.length === 0) return null;

        // 模拟数据，实际应从API获取
        const usageData = environments.map(env => ({
            name: env.name,
            usage: Math.floor(Math.random() * 100)
        }));

        return {
            labels: usageData.map(item => item.name),
            datasets: [
                {
                    data: usageData.map(item => item.usage),
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
        if (environments.length === 0) return null;

        // 模拟数据，实际应从API获取
        const packageData = environments.map(env => ({
            name: env.name,
            packages: Math.floor(Math.random() * 50) + 10
        }));

        return {
            labels: packageData.map(item => item.name),
            datasets: [
                {
                    label: '已安装包数量',
                    backgroundColor: '#36A2EB',
                    data: packageData.map(item => item.packages),
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
                            <div className="h1 mt-3 mb-2">{environments.length}</div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol sm={6} lg={3}>
                    <CCard className="mb-4 text-center">
                        <CCardBody>
                            <CCardTitle component="h5">活跃环境</CCardTitle>
                            <div className="h1 mt-3 mb-2 text-success">
                                {/* 模拟数据 */}
                                {Math.min(environments.length, Math.floor(Math.random() * environments.length) + 1)}
                            </div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol sm={6} lg={3}>
                    <CCard className="mb-4 text-center">
                        <CCardBody>
                            <CCardTitle component="h5">磁盘使用</CCardTitle>
                            <div className="h1 mt-3 mb-2 text-info">
                                {/* 模拟数据 */}
                                {Math.floor(Math.random() * 10) + 1} GB
                            </div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol sm={6} lg={3}>
                    <CCard className="mb-4 text-center">
                        <CCardBody>
                            <CCardTitle component="h5">最近创建</CCardTitle>
                            <div className="h1 mt-3 mb-2 text-warning">
                                {/* 显示最近创建的环境名称 */}
                                {environments.length > 0 ? environments[environments.length - 1].name : '-'}
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
                    <CButton color="primary" onClick={() => setVisible(true)}>
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
                                environments.map((env) => (
                                    <tr key={env.env_id}>
                                        <td>{env.env_id}</td>
                                        <td>{env.name}</td>
                                        <td>
                                            <CBadge color="success">活跃</CBadge>
                                        </td>
                                        <td>
                                            {/* 模拟Python版本 */}
                                            {`3.${Math.floor(Math.random() * 3) + 8}.${Math.floor(Math.random() * 10)}`}
                                        </td>
                                        <td>
                                            {/* 模拟使用率 */}
                                            <div className="d-flex align-items-center">
                                                <div className="me-2" style={{ width: '60%' }}>
                                                    <CProgress
                                                        value={Math.floor(Math.random() * 100)}
                                                        color="info"
                                                        height={8}
                                                    />
                                                </div>
                                                <small>{Math.floor(Math.random() * 100)}%</small>
                                            </div>
                                        </td>
                                        <td>
                                            <CButton color="info" size="sm" className="me-2" onClick={() => openDetails(env)}>
                                                <CIcon icon={cilInfo} />
                                            </CButton>
                                            <CButton color="warning" size="sm" className="me-2">
                                                <CIcon icon={cilPencil} />
                                            </CButton>
                                            <CButton color="danger" size="sm" onClick={() => handleDeleteEnvironment(env.env_id)}>
                                                <CIcon icon={cilTrash} />
                                            </CButton>
                                        </td>
                                    </tr>
                                ))
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
            <CModal visible={visible} onClose={() => setVisible(false)}>
                <CModalHeader onClose={() => setVisible(false)}>
                    <CModalTitle>创建新Conda环境</CModalTitle>
                </CModalHeader>
                <CModalBody>
                    <div className="mb-3">
                        <label className="form-label">环境名称</label>
                        <CFormInput
                            type="text"
                            value={newEnvName}
                            onChange={(e) => setNewEnvName(e.target.value)}
                            placeholder="输入环境名称"
                        />
                    </div>
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" onClick={() => setVisible(false)}>
                        取消
                    </CButton>
                    <CButton color="primary" onClick={handleCreateEnvironment}>
                        创建
                    </CButton>
                </CModalFooter>
            </CModal>

            {/* 环境详情模态框 */}
            <CModal visible={detailsVisible} onClose={() => setDetailsVisible(false)} size="lg">
                <CModalHeader onClose={() => setDetailsVisible(false)}>
                    <CModalTitle>环境详情: {selectedEnv?.name}</CModalTitle>
                </CModalHeader>
                <CModalBody>
                    {selectedEnv && (
                        <CCard>
                            <CCardBody>
                                <CRow>
                                    <CCol md={6}>
                                        <h6>基本信息</h6>
                                        <p><strong>环境ID:</strong> {selectedEnv.env_id}</p>
                                        <p><strong>环境名称:</strong> {selectedEnv.name}</p>
                                        <p><strong>Python版本:</strong> 3.9.7</p>
                                        <p><strong>创建日期:</strong> 2025-04-15</p>
                                    </CCol>
                                    <CCol md={6}>
                                        <h6>使用统计</h6>
                                        <p><strong>总任务数:</strong> 24</p>
                                        <p><strong>成功率:</strong> 92%</p>
                                        <p><strong>平均执行时间:</strong> 45秒</p>
                                        <p><strong>磁盘占用:</strong> 1.2 GB</p>
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
                                        <tr>
                                            <td>numpy</td>
                                            <td>1.24.3</td>
                                        </tr>
                                        <tr>
                                            <td>pandas</td>
                                            <td>2.0.1</td>
                                        </tr>
                                        <tr>
                                            <td>scikit-learn</td>
                                            <td>1.2.2</td>
                                        </tr>
                                        <tr>
                                            <td>matplotlib</td>
                                            <td>3.7.1</td>
                                        </tr>
                                    </tbody>
                                </CTable>
                            </CCardBody>
                        </CCard>
                    )}
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" onClick={() => setDetailsVisible(false)}>
                        关闭
                    </CButton>
                </CModalFooter>
            </CModal>
        </div>
    );
};

export default CondaManager;