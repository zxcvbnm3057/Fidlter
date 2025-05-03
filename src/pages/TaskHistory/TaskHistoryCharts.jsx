import React from 'react';
import {
    CCard,
    CCardBody,
    CRow,
    CCol,
    CCardTitle
} from '@coreui/react';
import { CChart } from '@coreui/react-chartjs';

const TaskHistoryCharts = ({ taskHistory }) => {
    // 准备任务成功率饼状图数据
    const prepareSuccessRateChartData = () => {
        if (taskHistory.length === 0) return null;

        const completedTasks = taskHistory.filter(task => task.status === 'success' || task.status === 'failed');
        if (completedTasks.length === 0) return null;

        const successCount = taskHistory.filter(task => task.status === 'success').length;
        const failedCount = taskHistory.filter(task => task.status === 'failed').length;

        const successRate = Math.round((successCount / (successCount + failedCount)) * 100);
        const failureRate = 100 - successRate;

        return {
            labels: [`成功 (${successRate}%)`, `失败 (${failureRate}%)`],
            datasets: [
                {
                    data: [successCount, failedCount],
                    backgroundColor: ['#2eb85c', '#e55353'],
                }
            ]
        };
    };

    // 准备最近一周耗时任务统计数据
    const prepareWeeklyDurationChartData = () => {
        if (taskHistory.length === 0) return null;

        // 获取近一周完成的任务
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // 筛选出近一周的任务并按耗时排序
        const weeklyTasks = taskHistory
            .filter(task => {
                const taskDate = new Date(task.start_time);
                return taskDate >= oneWeekAgo && (task.status === 'success' || task.status === 'failed');
            })
            .sort((a, b) => {
                const durationA = parseFloat(a.duration.split(' ')[0]);
                const durationB = parseFloat(b.duration.split(' ')[0]);
                return durationB - durationA; // 降序排序，最耗时的在前
            });

        if (weeklyTasks.length === 0) return null;

        // 取前10个最耗时任务和其他任务的总和
        const topTasks = weeklyTasks.slice(0, 10);
        const otherTasks = weeklyTasks.slice(10);

        const labels = topTasks.map(task => task.task_name.substring(0, 10) + '...');
        const data = topTasks.map(task => parseFloat(task.duration.split(' ')[0]));

        // 如果有其他任务，添加一个"其他"类别
        if (otherTasks.length > 0) {
            const otherDuration = otherTasks.reduce((sum, task) => {
                return sum + parseFloat(task.duration.split(' ')[0]);
            }, 0);

            labels.push(`其他 (${otherTasks.length}个任务)`);
            data.push(otherDuration);
        }

        return {
            labels: labels,
            datasets: [
                {
                    label: '执行时长(秒)',
                    backgroundColor: [
                        '#3399ff', '#20c997', '#f9b115', '#e55353', '#2eb85c',
                        '#39f', '#6610f2', '#fd7e14', '#6f42c1', '#dc3545',
                        '#6c757d' // 最后一个颜色用于"其他"
                    ],
                    data: data
                }
            ]
        };
    };

    // 渲染空任务状态界面
    const renderEmptyState = (type) => {
        const configs = {
            'success-rate': {
                title: '任务成功率',
                message: '您尚未执行任何任务或任务尚未完成。完成任务后，可以在此查看任务成功率统计。'
            },
            'duration': {
                title: '最近一周耗时任务统计',
                message: '暂无最近一周的任务执行数据。执行任务后，可以在此查看哪些任务最耗时。'
            }
        };

        const config = configs[type];

        return (
            <div className="text-center py-4 d-flex flex-column align-items-center justify-content-center" style={{ height: '250px' }}>
                <span role="img" aria-label="chart" style={{ fontSize: '3rem', marginBottom: '15px' }}>📊</span>
                <h5 className="text-muted mb-3">暂无数据</h5>
                <p className="text-muted mb-4" style={{ maxWidth: '80%' }}>
                    {config.message}
                </p>
            </div>
        );
    };

    // 根据加载状态和数据可用性渲染适当的图表或消息
    const renderChartOrEmptyState = (chartData, chartType, chartOptions, emptyStateType) => {
        if (!chartData) {
            return renderEmptyState(emptyStateType);
        }

        return (
            <CChart
                type={chartType}
                data={chartData}
                options={chartOptions}
                style={{ height: '250px' }}
            />
        );
    };

    const successRateData = prepareSuccessRateChartData();
    const weeklyDurationData = prepareWeeklyDurationChartData();

    const successRateOptions = {
        plugins: {
            legend: {
                position: 'bottom',
            }
        },
        maintainAspectRatio: false,
    };

    const durationChartOptions = {
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return `${context.raw} 秒`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: '耗时(秒)'
                }
            }
        },
        maintainAspectRatio: false,
    };

    return (
        <CRow className="mb-4">
            <CCol md={5}>
                <CCard className="mb-4 h-100">
                    <CCardBody>
                        <CCardTitle component="h5">任务成功率</CCardTitle>
                        {renderChartOrEmptyState(
                            successRateData,
                            'doughnut',
                            successRateOptions,
                            'success-rate'
                        )}
                    </CCardBody>
                </CCard>
            </CCol>
            <CCol md={7}>
                <CCard className="mb-4 h-100">
                    <CCardBody>
                        <CCardTitle component="h5">最近一周耗时任务统计</CCardTitle>
                        {renderChartOrEmptyState(
                            weeklyDurationData,
                            'bar',
                            durationChartOptions,
                            'duration'
                        )}
                    </CCardBody>
                </CCard>
            </CCol>
        </CRow>
    );
};

export default TaskHistoryCharts;