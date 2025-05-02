import React from 'react';
import { CChart } from '@coreui/react-chartjs';
import {
    CCard,
    CCardBody,
    CCardTitle,
    CRow,
    CCol,
} from '@coreui/react';

const EnvStatistics = ({ environments, envStats }) => {
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
        </>
    );
};

export default EnvStatistics;