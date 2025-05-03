import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTaskStatsRequest } from '../redux/tasks/reducer';
import {
    CAlert,
    CSpinner,
} from '@coreui/react';

// 导入子组件
import StatCards from './Dashboard/StatCards';
import ChartSection from './Dashboard/ChartSection';
import TaskTable from './Dashboard/TaskTable';

const Dashboard = () => {
    const dispatch = useDispatch();
    const { taskStats, loading, error } = useSelector(state => state.tasks);
    const [chartData, setChartData] = useState({});
    const [upcomingTasks, setUpcomingTasks] = useState([]);

    useEffect(() => {
        // 分发获取任务统计数据请求action
        dispatch(fetchTaskStatsRequest());
    }, [dispatch]);

    useEffect(() => {
        // 当获取到统计数据后，准备图表数据
        if (taskStats && Object.keys(taskStats).length > 0) {
            prepareChartData();
            prepareUpcomingTasks();
        }
    }, [taskStats]);

    const prepareUpcomingTasks = () => {
        // 处理即将执行的10条任务
        const tasks = taskStats.upcoming_tasks || [];
        setUpcomingTasks(tasks.slice(0, 10)); // 只取前10条
    };

    const prepareChartData = () => {
        // 折线图 - 系统内存使用情况及任务执行数
        // 验证有可用的系统资源数据
        const systemResources = taskStats.system_resources;

        if (!systemResources) {
            // 如果没有系统资源数据，设置空图表数据
            setChartData({
                systemResourcesData: null,
                taskSuccessRateData: prepareTaskSuccessRateData()
            });
            return;
        }

        const timestamps = systemResources.timestamps || [];
        const memoryData = systemResources.memory_usage || [];
        const taskCounts = systemResources.task_counts || [];

        // 如果所有时间戳都为空，则返回null
        if (timestamps.length === 0) {
            setChartData({
                systemResourcesData: null,
                taskSuccessRateData: prepareTaskSuccessRateData()
            });
            return;
        }

        // 处理数据中可能的null值，将其替换为0
        const processedMemoryData = memoryData.map(value => value === null ? 0 : value);
        const processedTaskCounts = taskCounts.map(value => value === null ? 0 : value);

        // 创建系统资源图表数据
        const systemResourcesData = {
            labels: timestamps.map(ts => {
                // 格式化时间戳，只显示小时和日期
                const date = new Date(ts);
                return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
            }),
            datasets: [
                {
                    label: '系统内存使用 (MB)',
                    borderColor: '#3498DB',
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    data: processedMemoryData,
                    tension: 0.4,
                    fill: true,
                    pointStyle: 'circle',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    yAxisID: 'y-memory',
                },
                {
                    label: '任务执行数',
                    borderColor: '#F39C12', // 橙色
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    data: processedTaskCounts,
                    tension: 0.4,
                    fill: false,
                    borderDash: [3, 3], // 点链线效果
                    pointStyle: 'circle',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    yAxisID: 'y-tasks',
                }
            ],
        };

        // 检查是否所有内存数据都是0
        const allMemoryZeros = processedMemoryData.every(value => value === 0);
        // 检查是否所有任务数据都是0
        const allTaskCountsZeros = processedTaskCounts.every(value => value === 0);

        setChartData({
            // 如果所有数据点都是0，则返回null，显示没有数据的占位图
            systemResourcesData: (allMemoryZeros && allTaskCountsZeros) ? null : systemResourcesData,
            taskSuccessRateData: prepareTaskSuccessRateData()
        });
    };

    const prepareTaskSuccessRateData = () => {
        // 饼图 - 任务成功率分布
        return {
            labels: ['成功', '失败', '取消', '异常终止'],
            datasets: [
                {
                    data: [
                        taskStats.task_success_rate?.success || 0,
                        taskStats.task_success_rate?.failed || 0,
                        taskStats.task_success_rate?.cancelled || 0,
                        taskStats.task_success_rate?.abnormal || 0
                    ],
                    backgroundColor: ['#2ECC71', '#E74C3C', '#F39C12', '#95A5A6'],
                    hoverBackgroundColor: ['#27AE60', '#C0392B', '#D35400', '#7F8C8D'],
                },
            ],
        };
    };

    if (loading && !Object.keys(taskStats).length) {
        return <div className="text-center mt-5"><CSpinner color="primary" /></div>;
    }

    return (
        <div>
            <h2>系统仪表盘</h2>
            {error && <CAlert color="danger">{error}</CAlert>}

            {/* 使用子组件 */}
            <StatCards taskStats={taskStats} />
            <ChartSection chartData={chartData} upcomingTasks={upcomingTasks} />
            <TaskTable recentTasks={taskStats.recent_tasks || []} />
        </div>
    );
};

export default Dashboard;