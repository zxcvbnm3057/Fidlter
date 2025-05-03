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
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        // 分发获取任务历史记录请求action
        dispatch(fetchTaskHistoryRequest());
        // 分发获取任务统计数据请求action
        dispatch(fetchTaskStatsRequest());
    }, [dispatch]);

    useEffect(() => {
        // 当获取到历史数据后，应用当前筛选条件
        if (taskHistory.length > 0) {
            applyFilter(filter);
        } else {
            setFilteredHistory([]);
        }
    }, [taskHistory, filter]);

    // 应用筛选条件
    const applyFilter = (filterValue) => {
        if (filterValue === 'all') {
            setFilteredHistory(taskHistory);
        } else if (filterValue === 'abnormal') {
            // 筛选异常任务（非成功、非失败状态）
            setFilteredHistory(taskHistory.filter(task =>
                task.status !== 'success' && task.status !== 'failed'
            ));
        } else {
            setFilteredHistory(taskHistory.filter(task => task.status === filterValue));
        }
    };

    // 处理筛选变更
    const handleFilter = (filterValue) => {
        setFilter(filterValue);
    };

    if (loading && taskHistory.length === 0) {
        return <div className="text-center mt-5"><CSpinner color="primary" /></div>;
    }

    return (
        <div>
            <h2>任务执行历史</h2>
            {error && <CAlert color="danger">{error}</CAlert>}

            {/* 传递currentFilter属性到TaskHistoryStats组件 */}
            <TaskHistoryStats
                taskStats={taskStats}
                taskHistory={taskHistory}
                onFilter={handleFilter}
                currentFilter={filter}
            />
            <TaskHistoryCharts taskHistory={taskHistory} />
            <TaskHistoryList taskHistory={filteredHistory} onFilter={handleFilter} currentFilter={filter} />
        </div>
    );
};

export default TaskHistory;