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

            {/* 使用子组件 */}
            <StatCards taskStats={taskStats} />
            <ChartSection chartData={chartData} />
            <TaskTable recentTasks={taskStats.recent_tasks || []} />
        </div>
    );
};

export default Dashboard;