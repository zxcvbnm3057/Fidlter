import React from 'react';
import { CChart } from '@coreui/react-chartjs';
import {
    CCard,
    CCardBody,
    CCardTitle,
    CRow,
    CCol,
    CTable,
    CBadge
} from '@coreui/react';

const ChartSection = ({ chartData = {}, upcomingTasks = [] }) => {
    // 检查是否有图表数据
    const hasSystemResourcesData = chartData &&
        chartData.systemResourcesData !== null &&
        chartData.systemResourcesData !== undefined;
    const hasTaskSuccessRateData = chartData &&
        chartData.taskSuccessRateData !== null &&
        chartData.taskSuccessRateData !== undefined;

    // 始终显示图表布局，不再返回null
    return (
        <>
            <CRow className="mb-4">
                <CCol md={6}>
                    <CCard>
                        <CCardBody>
                            <CCardTitle component="h5">系统资源使用情况(24小时)</CCardTitle>
                            <div style={{ height: '300px' }}>
                                {hasSystemResourcesData ? (
                                    <CChart
                                        type="line"
                                        data={chartData.systemResourcesData}
                                        options={{
                                            plugins: {
                                                legend: {
                                                    position: 'bottom',
                                                },
                                                tooltip: {
                                                    callbacks: {
                                                        label: function (context) {
                                                            const label = context.dataset.label || '';
                                                            const value = context.raw || 0;
                                                            if (context.dataset.yAxisID === 'y-memory') {
                                                                return `${label}: ${value} MB`;
                                                            }
                                                            return `${label}: ${value}`;
                                                        }
                                                    }
                                                }
                                            },
                                            scales: {
                                                x: {
                                                    grid: {
                                                        display: false
                                                    },
                                                    ticks: {
                                                        maxRotation: 45,
                                                        minRotation: 45
                                                    }
                                                },
                                                'y-memory': {
                                                    type: 'linear',
                                                    display: true,
                                                    position: 'left',
                                                    title: {
                                                        display: true,
                                                        text: '内存使用量 (MB)'
                                                    },
                                                    grid: {
                                                        display: true
                                                    }
                                                },
                                                'y-tasks': {
                                                    type: 'linear',
                                                    display: true,
                                                    position: 'right',
                                                    title: {
                                                        display: true,
                                                        text: '任务数量'
                                                    },
                                                    grid: {
                                                        display: false
                                                    },
                                                    // 确保右侧Y轴不与左侧重叠
                                                    ticks: {
                                                        beginAtZero: true,
                                                        stepSize: 1,
                                                        // 只显示整数值
                                                        callback: function (value) {
                                                            if (Math.floor(value) === value) {
                                                                return value;
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            maintainAspectRatio: false
                                        }}
                                    />
                                ) : (
                                    <div className="text-center py-4 d-flex flex-column align-items-center justify-content-center h-100">
                                        <div className="empty-state-icon mb-3">
                                            <i className="cil-chart" style={{ fontSize: '3rem', opacity: 0.5, color: '#3399ff' }}></i>
                                        </div>
                                        <h5 className="text-muted mb-3">
                                            <span role="img" aria-label="chart" style={{ fontSize: '1.5rem' }}>📊</span>
                                        </h5>
                                        <p className="text-muted mb-4" style={{ maxWidth: '80%' }}>
                                            当前没有系统资源数据。执行任务后，可以在此查看内存使用情况。
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol md={6}>
                    <CCard>
                        <CCardBody>
                            <CCardTitle component="h5">任务成功率分布</CCardTitle>
                            <div style={{ height: '300px' }}>
                                {hasTaskSuccessRateData ? (
                                    <CChart
                                        type="pie"
                                        data={chartData.taskSuccessRateData}
                                        options={{
                                            plugins: {
                                                legend: {
                                                    position: 'bottom',
                                                },
                                                tooltip: {
                                                    callbacks: {
                                                        label: function (context) {
                                                            const label = context.label || '';
                                                            const value = context.raw || 0;
                                                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                                            return `${label}: ${percentage}% (${value}个任务)`;
                                                        }
                                                    }
                                                }
                                            },
                                            maintainAspectRatio: false
                                        }}
                                    />
                                ) : (
                                    <div className="text-center h-100 d-flex flex-column justify-content-between">
                                        {/* 空状态提示 */}
                                        <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center mt-4">
                                            <span role="img" aria-label="chart" style={{ fontSize: '1.5rem', marginBottom: '15px' }}>📊</span>
                                            <p className="text-muted" style={{ maxWidth: '80%' }}>
                                                还没有任务执行记录。执行任务后，可以在此查看任务成功率统计。
                                            </p>
                                        </div>

                                        {/* 图例部分 - 与有数据时相同，放在底部 */}
                                        <div className="d-flex justify-content-center mt-3 mb-3" style={{ flexWrap: 'wrap' }}>
                                            <div className="d-flex align-items-center mx-2 mb-2">
                                                <span className="me-1" style={{ width: '28px', height: '8px', backgroundColor: '#2ECC71', display: 'inline-block', borderRadius: '0' }}>&nbsp;</span>
                                                <small>成功</small>
                                            </div>
                                            <div className="d-flex align-items-center mx-2 mb-2">
                                                <span className="me-1" style={{ width: '28px', height: '8px', backgroundColor: '#E74C3C', display: 'inline-block', borderRadius: '0' }}>&nbsp;</span>
                                                <small>失败</small>
                                            </div>
                                            <div className="d-flex align-items-center mx-2 mb-2">
                                                <span className="me-1" style={{ width: '28px', height: '8px', backgroundColor: '#F39C12', display: 'inline-block', borderRadius: '0' }}>&nbsp;</span>
                                                <small>取消</small>
                                            </div>
                                            <div className="d-flex align-items-center mx-2 mb-2">
                                                <span className="me-1" style={{ width: '28px', height: '8px', backgroundColor: '#95A5A6', display: 'inline-block', borderRadius: '0' }}>&nbsp;</span>
                                                <small>异常终止</small>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>

            {/* 即将执行的十条任务 */}
            <CRow className="mb-4">
                <CCol md={12}>
                    <CCard>
                        <CCardBody>
                            <CCardTitle component="h5">即将执行的任务</CCardTitle>
                            {upcomingTasks.length > 0 ? (
                                <CTable striped responsive>
                                    <thead>
                                        <tr>
                                            <th>任务ID</th>
                                            <th>任务名称</th>
                                            <th>Conda环境</th>
                                            <th>执行命令</th>
                                            <th>计划执行时间</th>
                                            <th>状态</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {upcomingTasks.map((task, index) => (
                                            <tr key={index}>
                                                <td>{task.task_id}</td>
                                                <td>{task.task_name}</td>
                                                <td>{task.conda_env}</td>
                                                <td>
                                                    <code className="small">{task.command?.length > 30 ? `${task.command.substring(0, 30)}...` : task.command}</code>
                                                </td>
                                                <td>{new Date(task.scheduled_time).toLocaleString()}</td>
                                                <td>
                                                    <CBadge color="info">待执行</CBadge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </CTable>
                            ) : (
                                <div className="text-center d-flex flex-column justify-content-center align-items-center" style={{ height: '150px' }}>
                                    <div className="text-muted">
                                        <i className="cil-list" style={{ fontSize: '3rem' }}></i>
                                        <p className="mt-3">当前没有调度任务</p>
                                    </div>
                                </div>
                            )}
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>
        </>
    );
};

export default ChartSection;