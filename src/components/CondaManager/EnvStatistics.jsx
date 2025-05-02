import React, { useMemo } from 'react';
import { CChart } from '@coreui/react-chartjs';
import {
    CCard,
    CCardBody,
    CCardTitle,
    CRow,
    CCol,
    CBadge,
    CTooltip
} from '@coreui/react';

const EnvStatistics = ({ environments, envStats }) => {
    // 在前端计算总磁盘使用量
    const totalDiskUsage = useMemo(() => {
        if (!environments || environments.length === 0) return 0;

        // 计算有效磁盘使用量的环境数
        const validEnvsCount = environments.filter(env =>
            env.disk_usage !== null && env.disk_usage > 0
        ).length;

        // 累加所有环境的磁盘使用量
        const total = environments.reduce((sum, env) => {
            return sum + (env.disk_usage || 0);
        }, 0);

        return {
            value: parseFloat(total.toFixed(2)),
            isComplete: validEnvsCount === environments.length
        };
    }, [environments]);

    // 在前端计算包数量统计
    const packageStats = useMemo(() => {
        if (!environments || environments.length === 0) return [];

        return environments.map(env => ({
            name: env.name,
            package_count: env.package_count || 0
        }));
    }, [environments]);

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
        if (!packageStats || packageStats.length === 0) return null;

        return {
            labels: packageStats.map(item => item.name),
            datasets: [
                {
                    label: '已安装包数量',
                    backgroundColor: '#36A2EB',
                    data: packageStats.map(item => item.package_count),
                }
            ]
        };
    };

    // 检查数据是否存在不完整情况
    const isDataIncomplete = (dataObj) => {
        if (!dataObj) return true;
        return dataObj.value === 0 || !dataObj.isComplete;
    }

    // 磁盘使用数据不可用提示
    const renderDiskUsageWarning = () => {
        if (isDataIncomplete(totalDiskUsage)) {
            return (
                <CTooltip content="无法获取准确的磁盘使用数据">
                    <CBadge color="warning" className="ms-2">
                        <span className="me-1">⚠️</span> 数据不完整
                    </CBadge>
                </CTooltip>
            );
        }
        return null;
    }

    // 检查是否有环境显示磁盘使用量不准确警告
    const hasInaccurateSizeData = useMemo(() => {
        if (!environments || environments.length === 0) return false;
        return environments.some(env => env.is_size_accurate === false);
    }, [environments]);

    return (
        <>
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
                            <CCardTitle component="h5">
                                磁盘使用
                                {renderDiskUsageWarning()}
                            </CCardTitle>
                            <div className="h1 mt-3 mb-2 text-info">
                                {totalDiskUsage.value > 0 ? `${totalDiskUsage.value} GB` : '未知'}
                            </div>
                            {hasInaccurateSizeData && (
                                <CBadge color="warning" className="mt-2">
                                    某些环境占用大小数据可能不准确
                                </CBadge>
                            )}
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
                            {prepareEnvUsageChart() ? (
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
                            ) : (
                                <div className="text-center py-5 text-muted">
                                    <span className="h4">⚠️</span>
                                    <p>无法获取环境使用数据</p>
                                </div>
                            )}
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol md={7}>
                    <CCard className="mb-4">
                        <CCardBody>
                            <CCardTitle component="h5">环境包数量统计</CCardTitle>
                            {preparePackagesChart() ? (
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
                            ) : (
                                <div className="text-center py-5 text-muted">
                                    <span className="h4">⚠️</span>
                                    <p>无法获取包统计数据</p>
                                </div>
                            )}
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>
        </>
    );
};

export default EnvStatistics;