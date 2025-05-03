import React, { useMemo } from 'react';
import { CChart } from '@coreui/react-chartjs';
import {
    CCard,
    CCardBody,
    CCardTitle,
    CRow,
    CCol,
    CBadge,
    CTooltip,
    CButton
} from '@coreui/react';

const EnvStatistics = ({ environments, envStats, error }) => {
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
        // 如果没有环境，不应该显示数据不完整
        if (!environments || environments.length === 0) return false;

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

    // 渲染空环境状态界面
    const renderEmptyState = (type) => {
        const titles = {
            'pie': '环境使用情况',
            'bar': '环境包数量统计'
        };

        return (
            <div className="text-center py-4 d-flex flex-column align-items-center justify-content-center" style={{ height: '250px' }}>
                <span role="img" aria-label="chart" style={{ fontSize: '3rem', marginBottom: '15px' }}>📊</span>
                <h5 className="text-muted mb-3">暂无数据</h5>
                <p className="text-muted mb-4" style={{ maxWidth: '80%' }}>
                    {type === 'pie'
                        ? '您尚未创建任何 Conda 环境。创建环境后，可以在此查看环境使用统计。'
                        : '您尚未创建任何 Conda 环境。创建环境后，可以在此查看包数量统计。'}
                </p>
            </div>
        );
    };

    // 根据状态返回适当的图表或提示信息
    const renderChartOrMessage = (chartData, chartType, isEmpty) => {
        if (error) {
            return (
                <div className="text-center py-5 text-muted">
                    <span className="h4"><i className="fa fa-exclamation-triangle me-2" style={{ color: '#e55353' }}></i></span>
                    <p>无法获取数据</p>
                </div>
            );
        }

        if (!chartData) {
            return isEmpty ? renderEmptyState(chartType) : (
                <div className="text-center py-5 text-muted">
                    <div className="spinner-border text-info mb-3" role="status">
                        <span className="visually-hidden">加载中...</span>
                    </div>
                    <p>数据加载中...</p>
                </div>
            );
        }

        const chartOptions = {
            pie: {
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                },
                maintainAspectRatio: false,
            },
            bar: {
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
            }
        };

        return (
            <CChart
                type={chartType}
                data={chartData}
                options={chartOptions[chartType]}
                style={{ height: '250px' }}
            />
        );
    };

    // 判断环境列表是否为空
    const isEnvironmentsEmpty = environments && environments.length === 0;

    // 渲染卡片统计信息
    const renderStatCard = (title, value, color, icon) => (
        <CCard className="mb-4 border-top-3" style={{ borderTop: `3px solid ${color}` }}>
            <CCardBody className="text-center">
                <div className="h1 mt-2 mb-3" style={{ color }}>
                    {value}
                </div>
                <div className="h5 text-muted mb-0">{title}</div>
            </CCardBody>
        </CCard>
    );

    return (
        <>
            <CRow className="mb-4">
                <CCol sm={6} lg={3}>
                    {renderStatCard(
                        '总环境数',
                        envStats?.total_environments || environments?.length || 0,
                        '#321fdb',
                        'fa-list'
                    )}
                </CCol>
                <CCol sm={6} lg={3}>
                    {renderStatCard(
                        '活跃环境',
                        envStats?.active_environments || 0,
                        '#2eb85c',
                        'fa-play-circle'
                    )}
                </CCol>
                <CCol sm={6} lg={3}>
                    <CCard className="mb-4 border-top-3" style={{ borderTop: '3px solid #3399ff' }}>
                        <CCardBody className="text-center">
                            <div className="h1 mt-2 mb-3" style={{ color: '#3399ff' }}>
                                {(!environments || environments.length === 0) ? '0 MB' : (totalDiskUsage.value > 0 ? `${totalDiskUsage.value} GB` : '未知')}
                            </div>
                            <div className="h5 text-muted mb-0">
                                磁盘使用 {renderDiskUsageWarning()}
                                {hasInaccurateSizeData && (
                                    <div className="mt-2">
                                        <CBadge color="warning">
                                            某些环境占用大小数据可能不准确
                                        </CBadge>
                                    </div>
                                )}
                            </div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol sm={6} lg={3}>
                    {renderStatCard(
                        '最近创建',
                        envStats?.latest_created?.name || (environments?.length > 0 ? environments[environments.length - 1].name : '-'),
                        '#f9b115',
                        'fa-clock'
                    )}
                </CCol>
            </CRow>

            <CRow className="mb-4">
                <CCol md={5}>
                    <CCard className="mb-4 h-100">
                        <CCardBody>
                            <CCardTitle component="h5">环境使用情况</CCardTitle>
                            {renderChartOrMessage(prepareEnvUsageChart(), 'pie', isEnvironmentsEmpty)}
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol md={7}>
                    <CCard className="mb-4 h-100">
                        <CCardBody>
                            <CCardTitle component="h5">环境包数量统计</CCardTitle>
                            {renderChartOrMessage(preparePackagesChart(), 'bar', isEnvironmentsEmpty)}
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>
        </>
    );
};

export default EnvStatistics;