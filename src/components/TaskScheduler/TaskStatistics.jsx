import React, { useEffect, useState, useMemo } from 'react';
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
    CCardHeader,
    CCol,
    CRow,
    CSpinner
} from '@coreui/react';
import { StatCard, ChartCard } from '../common';

// 任务统计组件 - 显示基于任务列表的统计信息和未来任务预期
const TaskStatistics = ({ taskList, taskStats, error, onFilterChange, currentFilter }) => {
    // 检查数据是否存在不完整情况 - 仅当taskList为undefined或null时认为数据不完整
    // 任务列表为空数组是正常情况，表示没有任务
    const isDataIncomplete = (data) => {
        return data === undefined || data === null;
    }

    // 准备未来一周任务预期图表数据
    const weeklyForecastChart = useMemo(() => {
        if (!taskStats?.next_7_days?.dates || !taskStats?.next_7_days?.scheduled_counts) {
            return null;
        }

        const { dates, scheduled_counts } = taskStats.next_7_days;

        if (dates.length === 0 || scheduled_counts.length === 0) {
            return null;
        }

        // 格式化日期标签 - 转换为 "MM-DD 周几" 格式
        const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const labels = dates.map(dateStr => {
            const date = new Date(dateStr);
            const formattedDate = `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
            const weekday = weekdayNames[date.getDay()];
            return `${formattedDate} ${weekday}`;
        });

        return {
            labels,
            datasets: [
                {
                    label: '预期执行任务数',
                    backgroundColor: 'rgba(51, 153, 255, 0.5)',
                    borderColor: '#3399ff',
                    borderWidth: 1,
                    data: scheduled_counts
                }
            ]
        };
    }, [taskStats]);

    // 准备环境使用情况图表数据
    const envUsageChart = useMemo(() => {
        if (!Array.isArray(taskList) || taskList.length === 0) return null;

        const envUsage = {};

        // 计算每个环境的使用次数
        taskList.forEach(task => {
            const env = task.conda_env;
            if (env) {
                envUsage[env] = (envUsage[env] || 0) + 1;
            }
        });

        // 转换为图表所需格式
        const labels = Object.keys(envUsage);
        const data = labels.map(label => envUsage[label]);

        // 如果没有有效数据，返回null
        if (labels.length === 0) return null;

        return {
            labels,
            datasets: [
                {
                    label: '使用次数',
                    backgroundColor: 'rgba(51, 153, 255, 0.5)',
                    borderColor: '#3399ff',
                    borderWidth: 1,
                    data
                }
            ]
        };
    }, [taskList]);

    // 准备图表配置选项
    const weeklyChartOptions = {
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                enabled: false // 禁用默认悬浮提示
            },
            datalabels: {
                formatter: (value) => `${value}`,
                color: '#000',
                anchor: 'end',
                align: 'top',
                offset: 0,
                font: {
                    weight: 'bold',
                    size: 11
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
                    text: '预期任务数'
                }
            },
            x: {
                ticks: {
                    autoSkip: false,
                    maxRotation: 45,
                    minRotation: 45
                }
            }
        }
    };

    const envChartOptions = {
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                enabled: false // 禁用默认悬浮提示
            },
            datalabels: {
                formatter: (value, ctx) => {
                    return `${ctx.chart.data.labels[ctx.dataIndex]}: ${value}`;
                },
                color: '#000',
                anchor: 'end',
                align: 'top',
                offset: 0,
                font: {
                    weight: 'bold',
                    size: 11
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
                    text: '使用次数'
                }
            }
        }
    };

    // 计算各种状态的任务数量
    const totalTasks = Array.isArray(taskList) ? taskList.length : 0;
    const runningTasks = Array.isArray(taskList) ? taskList.filter(task => task.status === 'running').length : 0;
    const completedTasks = Array.isArray(taskList) ? taskList.filter(task => task.status === 'completed' || task.status === 'success').length : 0;
    const failedTasks = Array.isArray(taskList) ? taskList.filter(task => task.status === 'failed').length : 0;
    const scheduledTasks = Array.isArray(taskList) ? taskList.filter(task => task.status === 'scheduled').length : 0;
    const pausedTasks = Array.isArray(taskList) ? taskList.filter(task => task.status === 'paused').length : 0;
    const stoppedTasks = Array.isArray(taskList) ? taskList.filter(task => task.status === 'stopped').length : 0;

    // 如果有来自API的统计数据，优先使用API数据
    const totalTasksCount = taskStats?.total || totalTasks;
    const runningTasksCount = taskStats?.running || runningTasks;
    const completedTasksCount = taskStats?.completed || completedTasks;
    const failedTasksCount = taskStats?.failed || failedTasks;
    const pausedTasksCount = taskStats?.paused || pausedTasks;
    const scheduledTasksCount = taskStats?.scheduled || scheduledTasks;
    const disabledTasksCount = taskStats?.disabled_count || 0;
    const stoppedTasksCount = taskStats?.stopped || stoppedTasks;

    // 任务列表为空数组是正常情况，仅显示为0，不显示警告
    const noTasks = Array.isArray(taskList) && taskList.length === 0;

    // 处理卡片点击事件，根据卡片类型设置不同的过滤条件
    const handleCardClick = (filterType) => {
        if (onFilterChange) {
            // 如果当前已经是这个过滤器，则切换回全部
            if (currentFilter === filterType) {
                onFilterChange('all');
            } else {
                onFilterChange(filterType);
            }
        }
    };

    return (
        <>
            <CRow className="mb-4">
                <CCol sm={6} lg={3}>
                    <StatCard
                        value={totalTasksCount}
                        label="总任务数"
                        color="primary"
                        warning={isDataIncomplete(taskList) ? "数据不完整" : null}
                        warningText={isDataIncomplete(taskList) ? "无法获取任务列表数据" : null}
                        onClick={() => handleCardClick('all')}
                        isActive={currentFilter === 'all'}
                        clickable={true}
                    />
                </CCol>
                <CCol sm={6} lg={3}>
                    <StatCard
                        value={runningTasksCount}
                        label="运行中任务"
                        color="primary"
                        warning={isDataIncomplete(taskList) ? "数据不完整" : null}
                        warningText={isDataIncomplete(taskList) ? "无法获取运行中任务数据" : null}
                        onClick={() => handleCardClick('running')}
                        isActive={currentFilter === 'running'}
                        clickable={true}
                    />
                </CCol>
                <CCol sm={6} lg={3}>
                    <StatCard
                        value={pausedTasksCount}
                        label="已暂停任务"
                        color="info"
                        warning={isDataIncomplete(taskList) ? "数据不完整" : null}
                        warningText={isDataIncomplete(taskList) ? "无法获取已暂停任务数据" : null}
                        onClick={() => handleCardClick('paused')}
                        isActive={currentFilter === 'paused'}
                        clickable={true}
                    />
                </CCol>
                <CCol sm={6} lg={3}>
                    <StatCard
                        value={stoppedTasksCount + disabledTasksCount}
                        label="已停止任务"
                        color="secondary"
                        warning={isDataIncomplete(taskList) ? "数据不完整" : null}
                        warningText={isDataIncomplete(taskList) ? "无法获取已停止任务数据" : null}
                        onClick={() => handleCardClick('stopped')}
                        isActive={currentFilter === 'stopped' || currentFilter === 'disabled'}
                        clickable={true}
                    />
                </CCol>
            </CRow>

            <CRow className="mb-4">
                <CCol md={6}>
                    <ChartCard
                        title="未来一周任务预期"
                        chartData={weeklyForecastChart}
                        chartOptions={weeklyChartOptions}
                        chartType="bar"
                        height="250px"
                        warning={(!taskStats || !taskStats.next_7_days) && !noTasks ? "数据不完整" : null}
                        warningText={(!taskStats || !taskStats.next_7_days) && !noTasks ? "任务预期数据可能不完整" : null}
                        noData={noTasks}
                        emptyText="无法获取任务预期数据"
                        emptyNoDataText="当前没有调度任务"
                    />
                </CCol>
                <CCol md={6}>
                    <ChartCard
                        title="环境使用情况"
                        chartData={envUsageChart}
                        chartOptions={envChartOptions}
                        chartType="bar"
                        height="250px"
                        warning={isDataIncomplete(taskList) ? "数据不完整" : null}
                        warningText={isDataIncomplete(taskList) ? "环境使用数据可能不完整" : null}
                        noData={noTasks}
                        emptyText="无法获取环境使用数据"
                        emptyNoDataText="当前没有环境使用数据"
                    />
                </CCol>
            </CRow>
        </>
    );
};

export default TaskStatistics;