import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTaskHistoryRequest, fetchTaskStatsRequest } from '../redux/tasks/reducer';
import {
    CTable,
    CSpinner,
    CAlert,
    CCard,
    CCardBody,
    CCardTitle,
    CRow,
    CCol,
    CBadge,
    CDropdown,
    CDropdownToggle,
    CDropdownMenu,
    CDropdownItem
} from '@coreui/react';
import { CChart } from '@coreui/react-chartjs';

const TaskHistory = () => {
    const dispatch = useDispatch();
    const { taskHistory, taskStats, loading, error } = useSelector(state => state.tasks);

    useEffect(() => {
        // 分发获取任务历史记录请求action
        dispatch(fetchTaskHistoryRequest());
        // 分发获取任务统计数据请求action
        dispatch(fetchTaskStatsRequest());
    }, [dispatch]);

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

    const handleFilter = (filter) => {
        // 可以通过Redux实现过滤功能
        console.log(`应用过滤器: ${filter}`);
        // 这里可以dispatch一个action来过滤数据
    };

    if (loading && taskHistory.length === 0) {
        return <div className="text-center mt-5"><CSpinner color="primary" /></div>;
    }

    return (
        <div>
            <h2>任务执行历史</h2>
            {error && <CAlert color="danger">{error}</CAlert>}

            {/* 添加统计卡片 */}
            <CRow className="mb-4">
                <CCol md={3}>
                    <CCard className="mb-4">
                        <CCardBody className="text-center">
                            <div className="h1 mt-2 mb-3">{taskStats.totalTasks || taskHistory.length}</div>
                            <div className="h5 text-muted mb-0">总任务数</div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol md={3}>
                    <CCard className="mb-4">
                        <CCardBody className="text-center">
                            <div className="h1 mt-2 mb-3 text-success">
                                {taskStats.successTasks || taskHistory.filter(t => t.status === 'success').length}
                            </div>
                            <div className="h5 text-muted mb-0">成功任务</div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol md={3}>
                    <CCard className="mb-4">
                        <CCardBody className="text-center">
                            <div className="h1 mt-2 mb-3 text-danger">
                                {taskStats.failedTasks || taskHistory.filter(t => t.status === 'failed').length}
                            </div>
                            <div className="h5 text-muted mb-0">失败任务</div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol md={3}>
                    <CCard className="mb-4">
                        <CCardBody className="text-center">
                            <div className="h1 mt-2 mb-3 text-info">
                                {taskStats.avgDuration || '计算中...'}
                            </div>
                            <div className="h5 text-muted mb-0">平均耗时</div>
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>

            {/* 添加图表 */}
            <CRow className="mb-4">
                <CCol md={5}>
                    <CCard className="mb-4">
                        <CCardBody>
                            <CCardTitle component="h5">任务状态分布</CCardTitle>
                            {prepareStatusChartData() && (
                                <CChart
                                    type="doughnut"
                                    data={prepareStatusChartData()}
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
                            <CCardTitle component="h5">最近任务执行时长</CCardTitle>
                            {prepareDurationChartData() && (
                                <CChart
                                    type="line"
                                    data={prepareDurationChartData()}
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

            <CCard>
                <CCardBody>
                    <div className="d-flex justify-content-between mb-3">
                        <CCardTitle component="h5">历史任务列表</CCardTitle>
                        <CDropdown>
                            <CDropdownToggle color="secondary">筛选</CDropdownToggle>
                            <CDropdownMenu>
                                <CDropdownItem onClick={() => handleFilter('all')}>全部</CDropdownItem>
                                <CDropdownItem onClick={() => handleFilter('success')}>成功任务</CDropdownItem>
                                <CDropdownItem onClick={() => handleFilter('failed')}>失败任务</CDropdownItem>
                                <CDropdownItem onClick={() => handleFilter('running')}>运行中</CDropdownItem>
                            </CDropdownMenu>
                        </CDropdown>
                    </div>
                    <CTable striped responsive>
                        <thead>
                            <tr>
                                <th>任务ID</th>
                                <th>任务名称</th>
                                <th>Conda环境</th>
                                <th>开始时间</th>
                                <th>结束时间</th>
                                <th>状态</th>
                                <th>执行时长</th>
                            </tr>
                        </thead>
                        <tbody>
                            {taskHistory.length > 0 ? (
                                taskHistory.map((task, index) => (
                                    <tr key={index}>
                                        <td>{task.task_id}</td>
                                        <td>{task.task_name}</td>
                                        <td>{task.conda_env}</td>
                                        <td>{task.start_time}</td>
                                        <td>{task.end_time}</td>
                                        <td>
                                            {task.status === 'success' ?
                                                <CBadge color="success">成功</CBadge> :
                                                task.status === 'failed' ?
                                                    <CBadge color="danger">失败</CBadge> :
                                                    task.status === 'running' ?
                                                        <CBadge color="primary">运行中</CBadge> :
                                                        <CBadge color="warning">{task.status}</CBadge>
                                            }
                                        </td>
                                        <td>{task.duration}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="text-center">暂无历史记录</td>
                                </tr>
                            )}
                        </tbody>
                    </CTable>
                </CCardBody>
            </CCard>
        </div>
    );
};

export default TaskHistory;