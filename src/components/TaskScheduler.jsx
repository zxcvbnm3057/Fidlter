import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchTasksRequest,
    fetchTaskHistoryRequest,
    createTaskRequest,
    stopTaskRequest
} from '../redux/tasks/reducer';
import { fetchEnvironmentsRequest } from '../redux/conda/reducer';
import { CAlert, CSpinner } from '@coreui/react';

// 导入拆分后的子组件
import TaskStatistics from './TaskScheduler/TaskStatistics';
import TaskForm from './TaskScheduler/TaskForm';
import TaskList from './TaskScheduler/TaskList';
import TaskHistory from './TaskScheduler/TaskHistory';
import TaskDetails from './TaskScheduler/TaskDetails';

const TaskScheduler = () => {
    const dispatch = useDispatch();
    const [taskDetailsVisible, setTaskDetailsVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    // 从Redux store获取状态
    const { taskList, taskHistory, loading: tasksLoading, error: tasksError } = useSelector(state => state.tasks);
    const { environments } = useSelector(state => state.conda);

    useEffect(() => {
        // 分发获取任务列表请求action
        dispatch(fetchTasksRequest());
        // 分发获取任务历史记录请求action
        dispatch(fetchTaskHistoryRequest());
        // 分发获取环境列表请求action
        dispatch(fetchEnvironmentsRequest());
    }, [dispatch]);

    const handleSubmit = (data) => {
        const taskData = {
            task_name: data.taskName,
            condaEnv: data.condaEnv,
            script: data.scriptPath,
            scheduleType: data.scheduleType,
            cronExpression: data.cronExpression,
            scheduledDate: data.scheduledDate,
            scheduledTime: data.scheduledTime
        };

        // 分发创建任务请求action
        dispatch(createTaskRequest(taskData));
    };

    const handleStopTask = async (taskId) => {
        if (!window.confirm('确定要停止这个任务吗？')) return;

        // 分发停止任务请求action
        dispatch(stopTaskRequest({ taskId }));
    };

    const openTaskDetails = (task) => {
        setSelectedTask(task);
        setTaskDetailsVisible(true);
    };

    if (tasksLoading && taskList.length === 0 && environments.length === 0) {
        return <div className="text-center mt-5"><CSpinner color="primary" /></div>;
    }

    return (
        <div>
            <h2>任务调度器</h2>
            {tasksError && <CAlert color="danger">{tasksError}</CAlert>}

            {/* 任务统计信息 */}
            <TaskStatistics taskList={taskList} taskHistory={taskHistory} />

            {/* 任务创建表单 */}
            <TaskForm
                environments={environments}
                onSubmit={handleSubmit}
                loading={tasksLoading}
            />

            {/* 当前任务列表 */}
            <TaskList
                taskList={taskList}
                onViewDetails={openTaskDetails}
                onStopTask={handleStopTask}
            />

            {/* 任务历史记录 */}
            <TaskHistory taskHistory={taskHistory} />

            {/* 任务详情模态框 */}
            <TaskDetails
                task={selectedTask}
                visible={taskDetailsVisible}
                onClose={() => setTaskDetailsVisible(false)}
                onStopTask={handleStopTask}
            />
        </div>
    );
};

export default TaskScheduler;