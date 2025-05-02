import React from 'react';
import {
    CCard,
    CCardBody,
    CRow,
    CCol,
} from '@coreui/react';
import { CChart } from '@coreui/react-chartjs';

const TaskHistoryCharts = ({ taskHistory }) => {
    // 根据任务历史数据准备饼图的数据
    const prepareStatusChartData = () => {
        if (taskHistory.length === 0) return null;

        const statusCounts = {
            success: 0,
            failed: 0,
            running: 0,
            other: 0
        };

        taskHistory.forEach(task => {
            if (task.status === 'success') statusCounts.success++;
            else if (task.status === 'failed') statusCounts.failed++;
            else if (task.status === 'running') statusCounts.running++;
            else statusCounts.other++;
        });

        return {
            labels: ['成功', '失败', '运行中', '其他'],
            datasets: [
                {
                    data: [
                        statusCounts.success,
                        statusCounts.failed,
                        statusCounts.running,
                        statusCounts.other
                    ],
                    backgroundColor: [
                        '#2eb85c', // 成功 - 绿色
                        '#e55353', // 失败 - 红色
                        '#3399ff', // 运行中 - 蓝色
                        '#f9b115'  // 其他 - 黄色
                    ],
                }
            ]
        };
    };

    // 根据任务历史数据准备折线图的数据（显示近期任务执行时间）
    const prepareDurationChartData = () => {
        if (taskHistory.length === 0) return null;

        // 只取最近10条完成的任务
        const recentTasks = [...taskHistory]
            .filter(task => task.status === 'success' || task.status === 'failed')
            .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
            .slice(0, 10)
            .reverse();

        return {
            labels: recentTasks.map(task => task.task_name.substring(0, 8) + '...'),
            datasets: [
                {
                    label: '执行时长(秒)',
                    backgroundColor: 'rgba(51, 153, 255, 0.2)',
                    borderColor: '#3399ff',
                    pointBackgroundColor: '#3399ff',
                    pointBorderColor: '#fff',
                    data: recentTasks.map(task => parseFloat(task.duration.split(' ')[0]))
                }
            ]
        };
    };

    const statusData = prepareStatusChartData();
    const durationData = prepareDurationChartData();

    return (
        <CRow className="mb-4">
            <CCol md={5}>
                <CCard className="mb-4">
                    <CCardBody>
                        <h5>任务状态分布</h5>
                        {statusData && (
                            <CChart
                                type="doughnut"
                                data={statusData}
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
                        <h5>最近任务执行时长</h5>
                        {durationData && (
                            <CChart
                                type="line"
                                data={durationData}
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
                                                text: '耗时(秒)'
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
    );
};

export default TaskHistoryCharts;