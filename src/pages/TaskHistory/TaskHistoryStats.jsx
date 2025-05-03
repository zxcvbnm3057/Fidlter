import React from 'react';
import { CRow, CCol } from '@coreui/react';
import { StatCard } from '../../components/common';

// 任务历史统计卡片组件
const TaskHistoryStats = ({ taskStats, taskHistory, onFilter, currentFilter = 'all' }) => {
    // 计算异常任务数（状态非成功也非失败的任务）
    const abnormalTasks = taskHistory.filter(t => t.status !== 'success' && t.status !== 'failed').length;

    return (
        <CRow className="mb-4">
            <CCol md={3}>
                <StatCard
                    value={taskStats.totalTasks || taskHistory.length}
                    label="近期总执行数"
                    color="primary"
                    onClick={() => onFilter('all')}
                    isActive={currentFilter === 'all'}
                    clickable={true}
                />
            </CCol>
            <CCol md={3}>
                <StatCard
                    value={taskStats.successTasks || taskHistory.filter(t => t.status === 'success').length}
                    label="成功数"
                    color="success"
                    onClick={() => onFilter('success')}
                    isActive={currentFilter === 'success'}
                    clickable={true}
                />
            </CCol>
            <CCol md={3}>
                <StatCard
                    value={taskStats.failedTasks || taskHistory.filter(t => t.status === 'failed').length}
                    label="失败数"
                    color="danger"
                    onClick={() => onFilter('failed')}
                    isActive={currentFilter === 'failed'}
                    clickable={true}
                />
            </CCol>
            <CCol md={3}>
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