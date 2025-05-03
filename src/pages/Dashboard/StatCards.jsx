import React from 'react';
import {
    CCard,
    CCardBody,
    CRow,
    CCol,
} from '@coreui/react';

const StatCards = ({ taskStats }) => {
    return (
        <CRow className="mb-4">
            <CCol md={3}>
                <CCard className="mb-4 border-top-3" style={{ borderTop: '3px solid #321fdb' }}>
                    <CCardBody className="text-center">
                        <div className="h1 mt-2 mb-3" style={{ color: '#321fdb' }}>{taskStats.total || 0}</div>
                        <div className="h5 text-muted mb-0">总任务数</div>
                    </CCardBody>
                </CCard>
            </CCol>
            <CCol md={3}>
                <CCard className="mb-4 border-top-3" style={{ borderTop: '3px solid #2eb85c' }}>
                    <CCardBody className="text-center">
                        <div className="h1 mt-2 mb-3 text-success">{taskStats.running || 0}</div>
                        <div className="h5 text-muted mb-0">正在运行</div>
                    </CCardBody>
                </CCard>
            </CCol>
            <CCol md={3}>
                <CCard className="mb-4 border-top-3" style={{ borderTop: '3px solid #f9b115' }}>
                    <CCardBody className="text-center">
                        <div className="h1 mt-2 mb-3 text-warning">{taskStats.paused || 0}</div>
                        <div className="h5 text-muted mb-0">已暂停</div>
                    </CCardBody>
                </CCard>
            </CCol>
            <CCol md={3}>
                <CCard className="mb-4 border-top-3" style={{ borderTop: '3px solid #e55353' }}>
                    <CCardBody className="text-center">
                        <div className="h1 mt-2 mb-3 text-danger">{taskStats.failed || 0}</div>
                        <div className="h5 text-muted mb-0">失败</div>
                    </CCardBody>
                </CCard>
            </CCol>
        </CRow>
    );
};

export default StatCards;