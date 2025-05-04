import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchTasksRequest,
    fetchTaskHistoryRequest,
    createTaskRequest,
    stopTaskRequest,
    pauseTaskRequest,
    resumeTaskRequest,
    fetchTaskStatsRequest,
    triggerTaskRequest
} from '../redux/tasks/reducer';
import { fetchEnvironmentsRequest } from '../redux/conda/reducer';
import { CAlert, CSpinner, CNav, CNavItem, CNavLink, CTabContent, CTabPane } from '@coreui/react';

// 导入拆分后的子组件
import TaskStatistics from '../components/TaskScheduler/TaskStatistics';
import TaskForm from '../components/TaskScheduler/TaskForm';
import TaskList from '../components/TaskScheduler/TaskList';
import GitTaskForm from '../components/TaskScheduler/GitTaskForm';

const TaskSchedulerPage = () => {
    const dispatch = useDispatch();
    const [statusFilter, setStatusFilter] = useState('all'); // 添加状态筛选器状态
    const [activeTab, setActiveTab] = useState(1); // 添加标签页状态，1: 普通任务表单, 2: Git任务表单

    // 从Redux store获取状态
    const { taskList, taskStats, loading: tasksLoading, error: tasksError } = useSelector(state => state.tasks);
    const { environments } = useSelector(state => state.conda);
    const { error: gitError } = useSelector(state => state.git);

    useEffect(() => {
        // 分发获取任务列表请求action - 获取已定义的任务而非历史记录
        dispatch(fetchTasksRequest({ type: 'defined' }));
        // 分发获取任务统计数据请求action
        dispatch(fetchTaskStatsRequest());
        // 分发获取环境列表请求action
        dispatch(fetchEnvironmentsRequest());
    }, [dispatch]);

    // 处理卡片筛选状态变更
    const handleFilterChange = (filter) => {
        setStatusFilter(filter);
    };

    // 处理表单提交 - 直接传递FormData对象
    const handleSubmit = (formData) => {
        // 分发创建任务请求action，直接传递FormData对象
        dispatch(createTaskRequest(formData));
    };

    const handleStopTask = async (taskId) => {
        if (!window.confirm('确定要停止这个任务吗？停止后任务将不再自动执行。')) return;

        // 分发停止任务请求action
        dispatch(stopTaskRequest({ taskId }));
    };

    const handlePauseTask = async (taskId) => {
        if (!window.confirm('确定要暂停这个任务吗？')) return;

        // 分发暂停任务请求action
        dispatch(pauseTaskRequest({ taskId }));
    };

    const handleResumeTask = async (taskId) => {
        // 分发恢复任务请求action
        dispatch(resumeTaskRequest({ taskId }));
    };

    const handleTriggerTask = async (taskId) => {
        if (!window.confirm('确定要立即执行这个任务吗？')) return;

        // 分发触发任务请求action
        dispatch(triggerTaskRequest({ taskId }));
    };

    if (tasksLoading && taskList.length === 0 && environments.length === 0) {
        return <div className="text-center mt-5"><CSpinner color="primary" /></div>;
    }

    return (
        <div>
            <h2>任务调度器</h2>
            {tasksError && <CAlert color="danger">{tasksError}</CAlert>}
            {gitError && <CAlert color="danger">{gitError}</CAlert>}

            {/* 任务统计信息 - 传递筛选处理函数和当前筛选状态 */}
            <TaskStatistics
                taskList={taskList}
                taskStats={taskStats}
                onFilterChange={handleFilterChange}
                currentFilter={statusFilter}
            />

            {/* 任务创建表单标签页 */}
            <CNav variant="tabs" className="mt-4">
                <CNavItem>
                    <CNavLink
                        active={activeTab === 1}
                        onClick={() => setActiveTab(1)}
                    >
                        创建标准任务
                    </CNavLink>
                </CNavItem>
                <CNavItem>
                    <CNavLink
                        active={activeTab === 2}
                        onClick={() => setActiveTab(2)}
                    >
                        从Git仓库创建任务
                    </CNavLink>
                </CNavItem>
            </CNav>

            <CTabContent>
                <CTabPane role="tabpanel" visible={activeTab === 1} className="pt-3">
                    {/* 标准任务创建表单 */}
                    <TaskForm
                        environments={environments}
                        onSubmit={handleSubmit}
                        loading={tasksLoading}
                    />
                </CTabPane>
                <CTabPane role="tabpanel" visible={activeTab === 2} className="pt-3">
                    {/* Git仓库任务创建表单 */}
                    <GitTaskForm />
                </CTabPane>
            </CTabContent>

            {/* 当前任务列表 - 传递当前筛选状态 */}
            <TaskList
                taskList={taskList}
                onStopTask={handleStopTask}
                onPauseTask={handlePauseTask}
                onResumeTask={handleResumeTask}
                onTriggerTask={handleTriggerTask}
                initialFilterStatus={statusFilter} // 传递初始筛选状态
                onFilterChange={setStatusFilter} // 传递筛选状态更新函数
            />
        </div>
    );
};

export default TaskSchedulerPage;