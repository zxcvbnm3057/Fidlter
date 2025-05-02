import React from 'react';
import { CChart } from '@coreui/react-chartjs';
import {
    CRow,
    CCol,
    CCard,
    CCardBody,
    CCardTitle
} from '@coreui/react';

// 任务统计组件
const TaskStatistics = ({ taskList, taskHistory }) => {
    // 准备任务状态饼图数据
    const prepareTaskStatusChart = () => {
        if (!taskList.length && !taskHistory.length) return null;

        const statusCounts = {
            running: 0,
            success: 0,
            failed: 0,
            scheduled: 0,
            other: 0
        };

        // 统计当前任务
        taskList.forEach(task => {
            if (task.status === 'running') statusCounts.running++;
            else if (task.status === 'scheduled') statusCounts.scheduled++;
            else statusCounts.other++;
        });

        // 统计最近的历史任务（限制为最近10条）
        const recentHistory = taskHistory.slice(0, 10);
        recentHistory.forEach(task => {
            if (task.status === 'success') statusCounts.success++;
            else if (task.status === 'failed') statusCounts.failed++;
            else statusCounts.other++;
        });

        return {
            labels: ['运行中', '已完成', '失败', '已调度', '其他'],
            datasets: [
                {
                    data: [
                        statusCounts.running,
                        statusCounts.success,
                        statusCounts.failed,
                        statusCounts.scheduled,
                        statusCounts.other
                    ],
                    backgroundColor: [
                        '#3399ff', // 运行中 - 蓝色
                        '#2eb85c', // 已完成 - 绿色
                        '#e55353', // 失败 - 红色
                        '#f9b115', // 已调度 - 黄色
                        '#ababab'  // 其他 - 灰色
                    ],
                }
            ]
        };
    };

    // 准备环境使用情况图表数据
    const prepareEnvUsageChart = () => {
        if (!taskHistory.length) return null;

        const envUsage = {};

        // 计算每个环境的使用次数
        taskHistory.forEach(task => {
            const env = task.conda_env;
            if (env) {
                envUsage[env] = (envUsage[env] || 0) + 1;
            }
        });

        // 转换为图表所需格式
        const labels = Object.keys(envUsage);
        const data = labels.map(label => envUsage[label]);

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
    };

    return (
        <>
            <CRow className="mb-4">
                <CCol sm={6} lg={3}>
                    <CCard className="mb-4 text-center">
                        <CCardBody>
                            <CCardTitle component="h5">总任务数</CCardTitle>
                            <div className="h1 mt-3 mb-2">{taskList.length + taskHistory.length}</div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol sm={6} lg={3}>
                    <CCard className="mb-4 text-center">
                        <CCardBody>
                            <CCardTitle component="h5">运行中任务</CCardTitle>
                            <div className="h1 mt-3 mb-2 text-primary">
                                {taskList.filter(task => task.status === 'running').length}
                            </div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol sm={6} lg={3}>
                    <CCard className="mb-4 text-center">
                        <CCardBody>
                            <CCardTitle component="h5">已完成任务</CCardTitle>
                            <div className="h1 mt-3 mb-2 text-success">
                                {taskHistory.filter(task => task.status === 'success').length}
                            </div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol sm={6} lg={3}>
                    <CCard className="mb-4 text-center">
                        <CCardBody>
                            <CCardTitle component="h5">失败任务</CCardTitle>
                            <div className="h1 mt-3 mb-2 text-danger">
                                {taskHistory.filter(task => task.status === 'failed').length}
                            </div>
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>

            <CRow className="mb-4">
                <CCol md={6}>
                    <CCard className="mb-4">
                        <CCardBody>
                            <CCardTitle component="h5">任务状态分布</CCardTitle>
                            {prepareTaskStatusChart() && (
                                <CChart
                                    type="doughnut"
                                    data={prepareTaskStatusChart()}
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
                <CCol md={6}>
                    <CCard className="mb-4">
                        <CCardBody>
                            <CCardTitle component="h5">环境使用情况</CCardTitle>
                            {prepareEnvUsageChart() ? (
                                <CChart
                                    type="bar"
                                    data={prepareEnvUsageChart()}
                                    options={{
                                        plugins: {
                                            legend: {
                                                display: false,
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
                                        },
                                        maintainAspectRatio: false,
                                    }}
                                    style={{ height: '250px' }}
                                />
                            ) : (
                                <div className="text-center my-5">暂无环境使用数据</div>
                            )}
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>
        </>
    );
};

export default TaskStatistics;