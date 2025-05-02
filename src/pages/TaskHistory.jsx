import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTaskHistoryRequest, fetchTaskStatsRequest } from '../redux/tasks/reducer';
import {
    CSpinner,
    CAlert,
} from '@coreui/react';

// 导入子组件
import TaskHistoryStats from './TaskHistory/TaskHistoryStats';
import TaskHistoryCharts from './TaskHistory/TaskHistoryCharts';
import TaskHistoryList from './TaskHistory/TaskHistoryList';

const TaskHistory = () => {
    const dispatch = useDispatch();
    const { taskHistory, taskStats, loading, error } = useSelector(state => state.tasks);
    const [filteredHistory, setFilteredHistory] = useState([]);

    useEffect(() => {
        // 分发获取任务历史记录请求action
        dispatch(fetchTaskHistoryRequest());
        // 分发获取任务统计数据请求action
        dispatch(fetchTaskStatsRequest());
    }, [dispatch]);

    useEffect(() => {
        // 当获取到历史数据后，设置筛选后的数据
        if (taskHistory.length > 0) {
            setFilteredHistory(taskHistory);
        }
    }, [taskHistory]);

    const handleFilter = (filter) => {
        if (filter === 'all') {
            setFilteredHistory(taskHistory);
        } else {
            setFilteredHistory(taskHistory.filter(task => task.status === filter));
        }
    };

    if (loading && taskHistory.length === 0) {
        return <div className="text-center mt-5"><CSpinner color="primary" /></div>;
    }

    return (
        <div>
            <h2>任务执行历史</h2>
            {error && <CAlert color="danger">{error}</CAlert>}

            {/* 使用子组件 */}
            <TaskHistoryStats taskStats={taskStats} taskHistory={taskHistory} />
            <TaskHistoryCharts taskHistory={taskHistory} />
            <TaskHistoryList taskHistory={filteredHistory} onFilter={handleFilter} />
        </div>
    );
};

export default TaskHistory;