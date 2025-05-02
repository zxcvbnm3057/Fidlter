import React from 'react';
import {
    CCard,
    CCardBody,
    CRow,
    CCol,
} from '@coreui/react';

const TaskHistoryStats = ({ taskStats, taskHistory }) => {
    return (
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
    );
};

export default TaskHistoryStats;