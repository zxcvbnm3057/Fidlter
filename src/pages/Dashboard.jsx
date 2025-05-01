import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTaskStatsRequest } from '../redux/tasks/reducer';
import {
    CCard,
    CCardBody,
    CCardTitle,
    CTable,
    CSpinner,
    CAlert,
    CRow,
    CCol,
} from '@coreui/react';
import { CChart } from '@coreui/react-chartjs';

const Dashboard = () => {
    const dispatch = useDispatch();
    const { taskStats, loading, error } = useSelector(state => state.tasks);
    const [chartData, setChartData] = useState({});

    useEffect(() => {
        // 分发获取任务统计数据请求action
        dispatch(fetchTaskStatsRequest());
    }, [dispatch]);

    useEffect(() => {
        // 当获取到统计数据后，准备图表数据
        if (taskStats && Object.keys(taskStats).length > 0) {
            prepareChartData();
        }
    }, [taskStats]);

    const prepareChartData = () => {
        // 饼图 - 任务状态分布
        const statusData = {
            labels: ['运行中', '已完成', '失败', '等待中'],
            datasets: [
                {
                    data: [
                        taskStats.running || 0,
                        taskStats.completed || 0,
                        taskStats.failed || 0,
                        taskStats.scheduled || 0
                    ],
                    backgroundColor: ['#5DADE2', '#58D68D', '#EC7063', '#F4D03F'],
                    hoverBackgroundColor: ['#3498DB', '#2ECC71', '#E74C3C', '#F1C40F'],
                },
            ],
        };

        // 柱状图 - 最近7天任务趋势
        const last7DaysData = {
            labels: taskStats.last_7_days?.dates || ['7天前', '6天前', '5天前', '4天前', '3天前', '2天前', '昨天'],
            datasets: [
                {
                    label: '成功的任务',
                    backgroundColor: '#2ECC71',
                    data: taskStats.last_7_days?.success_counts || Array(7).fill(0),
                },
                {
                    label: '失败的任务',
                    backgroundColor: '#E74C3C',
                    data: taskStats.last_7_days?.failed_counts || Array(7).fill(0),
                },
            ],
        };

        setChartData({
            statusData,
            last7DaysData
        });
    };

    if (loading && !Object.keys(taskStats).length) {
        return <div className="text-center mt-5"><CSpinner color="primary" /></div>;
    }

    return (
        <div>
            <h2>系统仪表盘</h2>
            {error && <CAlert color="danger">{error}</CAlert>}

            <CRow className="mb-4">
                <CCol md={3}>
                    <CCard className="text-center">
                        <CCardBody>
                            <CCardTitle component="h5">总任务数</CCardTitle>
                            <div className="display-4">{taskStats.total || 0}</div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol md={3}>
                    <CCard className="text-center">
                        <CCardBody>
                            <CCardTitle component="h5">正在运行</CCardTitle>
                            <div className="display-4">{taskStats.running || 0}</div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol md={3}>
                    <CCard className="text-center">
                        <CCardBody>
                            <CCardTitle component="h5">已完成</CCardTitle>
                            <div className="display-4">{taskStats.completed || 0}</div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol md={3}>
                    <CCard className="text-center">
                        <CCardBody>
                            <CCardTitle component="h5">失败</CCardTitle>
                            <div className="display-4">{taskStats.failed || 0}</div>
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>

            {chartData.statusData && chartData.last7DaysData && (
                <CRow className="mb-4">
                    <CCol md={6}>
                        <CCard>
                            <CCardBody>
                                <CCardTitle component="h5">任务状态分布</CCardTitle>
                                <div style={{ height: '300px' }}>
                                    <CChart
                                        type="doughnut"
                                        data={chartData.statusData}
                                        options={{
                                            plugins: {
                                                legend: {
                                                    position: 'bottom',
                                                }
                                            },
                                            maintainAspectRatio: false
                                        }}
                                    />
                                </div>
                            </CCardBody>
                        </CCard>
                    </CCol>
                    <CCol md={6}>
                        <CCard>
                            <CCardBody>
                                <CCardTitle component="h5">最近7天任务趋势</CCardTitle>
                                <div style={{ height: '300px' }}>
                                    <CChart
                                        type="bar"
                                        data={chartData.last7DaysData}
                                        options={{
                                            plugins: {
                                                legend: {
                                                    position: 'bottom',
                                                }
                                            },
                                            scales: {
                                                x: {
                                                    grid: {
                                                        display: false
                                                    }
                                                },
                                                y: {
                                                    grid: {
                                                        display: true
                                                    },
                                                    beginAtZero: true
                                                }
                                            },
                                            maintainAspectRatio: false
                                        }}
                                    />
                                </div>
                            </CCardBody>
                        </CCard>
                    </CCol>
                </CRow>
            )}

            <CCard>
                <CCardBody>
                    <CCardTitle component="h5">最近任务执行情况</CCardTitle>
                    <CTable striped responsive>
                        <thead>
                            <tr>
                                <th>任务名称</th>
                                <th>状态</th>
                                <th>开始时间</th>
                                <th>结束时间</th>
                                <th>执行时长</th>
                            </tr>
                        </thead>
                        <tbody>
                            {taskStats.recent_tasks && taskStats.recent_tasks.length > 0 ? (
                                taskStats.recent_tasks.map((task, index) => (
                                    <tr key={index}>
                                        <td>{task.name}</td>
                                        <td>
                                            {task.status === 'success' ?
                                                <span className="text-success">成功</span> :
                                                task.status === 'failed' ?
                                                    <span className="text-danger">失败</span> :
                                                    task.status}
                                        </td>
                                        <td>{new Date(task.start_time).toLocaleString()}</td>
                                        <td>{task.end_time ? new Date(task.end_time).toLocaleString() : '-'}</td>
                                        <td>{task.duration || '-'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center">暂无任务数据</td>
                                </tr>
                            )}
                        </tbody>
                    </CTable>
                </CCardBody>
            </CCard>
        </div>
    );
};

export default Dashboard;