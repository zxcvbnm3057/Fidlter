import React from 'react';
import {
    CCard,
    CCardBody,
    CRow,
    CCol,
} from '@coreui/react';

const TaskStats = ({ taskStats, taskList }) => {
    // 如果没有从API获取到统计数据，则基于任务列表自行计算
    const totalTasks = taskStats.totalTasks || taskList.length;
    const runningTasks = taskStats.runningTasks || 
        taskList.filter(task => task.status === 'running').length;
    const completedTasks = taskStats.completedTasks || 
        taskList.filter(task => task.status === 'success').length;
    const failedTasks = taskStats.failedTasks || 
        taskList.filter(task => task.status === 'failed').length;

    return (
        <CRow className="mb-4">
            <CCol md={3}>
                <CCard className="mb-4">
                    <CCardBody className="text-center">
                        <div className="h1 mt-2 mb-3">{totalTasks}</div>
                        <div className="h5 text-muted mb-0">总任务数</div>
                    </CCardBody>
                </CCard>
            </CCol>
            <CCol md={3}>
                <CCard className="mb-4">
                    <CCardBody className="text-center">
                        <div className="h1 mt-2 mb-3 text-primary">{runningTasks}</div>
                        <div className="h5 text-muted mb-0">运行中任务</div>
                    </CCardBody>
                </CCard>
            </CCol>
            <CCol md={3}>
                <CCard className="mb-4">
                    <CCardBody className="text-center">
                        <div className="h1 mt-2 mb-3 text-success">{completedTasks}</div>
                        <div className="h5 text-muted mb-0">已完成任务</div>
                    </CCardBody>
                </CCard>
            </CCol>
            <CCol md={3}>
                <CCard className="mb-4">
                    <CCardBody className="text-center">
                        <div className="h1 mt-2 mb-3 text-danger">{failedTasks}</div>
                        <div className="h5 text-muted mb-0">失败任务</div>
                    </CCardBody>
                </CCard>
            </CCol>
        </CRow>
    );
};

export default TaskStats;