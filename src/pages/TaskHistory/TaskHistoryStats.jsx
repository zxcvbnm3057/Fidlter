import React from 'react';
import { CRow, CCol } from '@coreui/react';
import { StatCard } from '../../components/common';

// 任务历史统计卡片组件
const TaskHistoryStats = ({ taskStats, taskHistory, onFilter, currentFilter = 'all' }) => {
    // 计算运行中任务数
    const runningTasks = taskHistory.filter(t => t.status === 'running').length;
    // 计算异常任务数（状态非成功、非失败且非运行中的任务）
    const abnormalTasks = taskHistory.filter(t =>
        t.status !== 'success' &&
        t.status !== 'failed' &&
        t.status !== 'running'
    ).length;

    return (
        <CRow className="mb-4">
            <CCol>
                <StatCard
                    value={taskStats.totalTasks || taskHistory.length}
                    label="近期总执行数"
                    color="primary"
                    onClick={() => onFilter('all')}
                    isActive={currentFilter === 'all'}
                    clickable={true}
                />
            </CCol>
            <CCol>
                <StatCard
                    value={taskStats.successTasks || taskHistory.filter(t => t.status === 'success').length}
                    label="成功数"
                    color="success"
                    onClick={() => onFilter('success')}
                    isActive={currentFilter === 'success'}
                    clickable={true}
                />
            </CCol>
            <CCol>
                <StatCard
                    value={taskStats.runningTasks || runningTasks}
                    label="运行中"
                    color="info"
                    onClick={() => onFilter('running')}
                    isActive={currentFilter === 'running'}
                    clickable={true}
                />
            </CCol>
            <CCol>
                <StatCard
                    value={taskStats.failedTasks || taskHistory.filter(t => t.status === 'failed').length}
                    label="失败数"
                    color="danger"
                    onClick={() => onFilter('failed')}
                    isActive={currentFilter === 'failed'}
                    clickable={true}
                />
            </CCol>
            <CCol>
                <StatCard
                    value={taskStats.abnormalTasks || abnormalTasks}
                    label="异常任务数"
                    color="warning"
                    onClick={() => onFilter('abnormal')}
                    isActive={currentFilter === 'abnormal'}
                    clickable={true}
                />
            </CCol>
        </CRow>
    );
};

export default TaskHistoryStats;