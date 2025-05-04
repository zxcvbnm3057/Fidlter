import React, { useMemo, useEffect } from 'react';
import { CChart } from '@coreui/react-chartjs';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Title, Legend, Tooltip } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// 全局配置Chart.js，禁用悬浮提示
ChartJS.defaults.plugins.tooltip = {
    enabled: false
};

// 设置交互模式为null，防止悬浮事件触发
ChartJS.defaults.interaction = {
    mode: null,
    intersect: false
};

// 仅注册所需的插件，不包括Tooltip
ChartJS.register(
    ArcElement,
    BarElement,
    CategoryScale,
    LinearScale,
    Title,
    Legend,
    ChartDataLabels  // 注册数据标签插件
);

import {
    CCard,
    CCardBody,
    CCardTitle,
    CRow,
    CCol,
    CBadge,
    CTooltip,
    CButton,
    CSpinner
} from '@coreui/react';
import { useSelector } from 'react-redux';

const EnvStatistics = ({ environments, envStats, error }) => {
    // 从Redux状态获取流式加载状态和扩展信息
    const { streamLoading, extendedInfoLoading, extendedInfo } = useSelector(state => state.conda);

    // 检查是否所有环境的扩展信息都已加载完成
    const allExtendedInfoLoaded = useMemo(() => {
        if (!environments || environments.length === 0) return true;

        // 检查每个环境是否都已加载扩展信息
        return environments.every(env => {
            // 如果环境不需要加载扩展信息，则视为已加载
            if (!env.basic_info_only) return true;
            // 否则检查该环境的扩展信息是否已加载
            return extendedInfo[env.name] !== undefined;
        });
    }, [environments, extendedInfo]);

    // 检查是否有任何环境正在加载扩展信息
    const isAnyExtendedInfoLoading = useMemo(() => {
        return Object.values(extendedInfoLoading).some(loading => loading === true);
    }, [extendedInfoLoading]);

    // 在前端计算总磁盘使用量
    const totalDiskUsage = useMemo(() => {
        if (!environments || environments.length === 0) return { value: 0, isComplete: true };

        // 检查是否有任何环境正在加载磁盘信息
        const hasLoadingEnvs = environments.some(env =>
            env.basic_info_only && !extendedInfo[env.name] && !extendedInfoLoading[env.name]
        );

        // 计算有效磁盘使用量的环境数
        const validEnvsCount = environments.filter(env => {
            // 如果环境需要扩展信息且已加载，则从扩展信息中获取
            if (env.basic_info_only && extendedInfo[env.name]) {
                return extendedInfo[env.name].disk_usage !== null && extendedInfo[env.name].disk_usage > 0;
            }
            // 否则直接使用环境自身的磁盘使用量
            return env.disk_usage !== null && env.disk_usage > 0;
        }).length;

        // 累加所有环境的磁盘使用量
        const total = environments.reduce((sum, env) => {
            // 如果环境需要扩展信息且已加载，则从扩展信息中获取
            if (env.basic_info_only && extendedInfo[env.name]) {
                return sum + (extendedInfo[env.name].disk_usage || 0);
            }
            // 否则直接使用环境自身的磁盘使用量
            return sum + (env.disk_usage || 0);
        }, 0);

        return {
            value: parseFloat(total.toFixed(2)),
            isComplete: validEnvsCount === environments.length,
            isLoading: hasLoadingEnvs || isAnyExtendedInfoLoading
        };
    }, [environments, extendedInfo, extendedInfoLoading, isAnyExtendedInfoLoading]);

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

        // 筛选出有任务引用的环境
        const environmentsWithTasks = envStats.environment_usage.filter(item => item.task_count > 0);

        // 如果没有环境被任务引用，创建一个占位数据
        if (environmentsWithTasks.length === 0) {
            return {
                labels: ['无任务引用'],
                datasets: [
                    {
                        data: [100],
                        backgroundColor: ['#e1e1e1'],
                    }
                ]
            };
        }

        return {
            labels: environmentsWithTasks.map(item => item.name),
            datasets: [
                {
                    data: environmentsWithTasks.map(item => item.task_count),
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
        // 如果环境列表为空，或者正在流式加载数据，或者尚未加载完所有扩展信息，则返回null
        if (!environments || environments.length === 0 || streamLoading || !allExtendedInfoLoaded) {
            return null;
        }

        // 使用环境本身的包数量数据，或者从扩展信息中获取
        const enhancedPackageStats = environments.map(env => {
            // 如果环境需要加载扩展信息，则从扩展信息中获取包数量
            if (env.basic_info_only && extendedInfo[env.name]) {
                return {
                    name: env.name,
                    package_count: extendedInfo[env.name].package_count || 0
                };
            }
            // 否则使用环境自身的包数量
            return {
                name: env.name,
                package_count: env.package_count || 0
            };
        });

        // 确保有包数据可以显示
        if (enhancedPackageStats.length === 0) {
            return null;
        }

        // 按包数量排序并取前10名
        const top10Environments = [...enhancedPackageStats]
            .sort((a, b) => b.package_count - a.package_count)
            .slice(0, 10);

        return {
            labels: top10Environments.map(item => item.name),
            datasets: [
                {
                    backgroundColor: '#36A2EB',
                    data: top10Environments.map(item => item.package_count),
                }
            ]
        };
    };

    // 检查数据是否存在不完整情况
    const isDataIncomplete = (dataObj) => {
        // 如果没有环境，不应该显示数据不完整
        if (!environments || environments.length === 0) return false;

        // 只在没有数据对象或值为undefined/null时显示不完整
        if (!dataObj) return true;

        // 确保有值的情况下不显示数据不完整，无论isComplete状态如何
        return dataObj.value === null || dataObj.value === undefined;
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

        // 特殊处理包数量图表的加载状态
        if (chartType === 'bar' && (streamLoading || isAnyExtendedInfoLoading)) {
            return (
                <div className="text-center py-5 text-muted">
                    <CSpinner color="primary" className="mb-3" />
                    <p>正在加载环境包数量数据...</p>
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
                    },
                    'chartjs-tooltip': false, // 禁用可能的外部 tooltip 插件
                    datalabels: {
                        formatter: (value, ctx) => {
                            const dataset = ctx.chart.data.datasets[0];
                            const total = dataset.data.reduce((acc, data) => acc + data, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${ctx.chart.data.labels[ctx.dataIndex]}\n${percentage}%`;
                        },
                        color: '#fff',
                        font: {
                            weight: 'bold',
                            size: 12
                        },
                        textAlign: 'center',
                        textStrokeColor: '#000',
                        textStrokeWidth: 1,
                        display: function (context) {
                            return context.dataset.data[context.dataIndex] > 5;
                        }
                    }
                },
                maintainAspectRatio: false
            },
            bar: {
                plugins: {
                    legend: {
                        display: false, // 不显示图例
                    },
                    datalabels: {
                        formatter: (value) => `${value}`,
                        color: '#000',
                        anchor: 'end',
                        align: 'top',
                        offset: 0,
                        font: {
                            weight: 'bold'
                        },
                        display: function (context) {
                            return context.dataset.data[context.dataIndex] > 0; // 只有当值大于0时才显示标签
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '包数量'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '环境名称'
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
                                {(() => {
                                    if (!environments || environments.length === 0) return '0 MB';
                                    if (totalDiskUsage.isLoading) return '加载中...';
                                    if (totalDiskUsage.value > 0) return `${totalDiskUsage.value} GB`;
                                    return '未知';
                                })()}
                            </div>
                            <div className="h5 text-muted mb-0">
                                磁盘使用
                                {!totalDiskUsage.isLoading && !totalDiskUsage.isComplete && totalDiskUsage.value > 0 && (
                                    <CTooltip content="部分环境磁盘使用数据未加载完成">
                                        <CBadge color="warning" className="ms-2">
                                            <span className="me-1">⚠️</span> 部分数据
                                        </CBadge>
                                    </CTooltip>
                                )}
                                {!totalDiskUsage.isLoading && environments?.length > 0 && totalDiskUsage.value === 0 && (
                                    <CTooltip content="无法获取磁盘使用数据">
                                        <CBadge color="danger" className="ms-2">
                                            <span className="me-1">⚠️</span> 数据缺失
                                        </CBadge>
                                    </CTooltip>
                                )}
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