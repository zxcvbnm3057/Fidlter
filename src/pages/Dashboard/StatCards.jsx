import React from 'react';
import {
    CCard,
    CCardBody,
    CCardTitle,
    CRow,
    CCol,
} from '@coreui/react';

const StatCards = ({ taskStats }) => {
    return (
        <CRow className="mb-4">
            <CCol md={3}>
                <CCard className="text-center">
                    <CCardBody>
                        <CCardTitle component="h5">总任务数</CCardTitle>
                        <div className="display-4">{taskStats.total || 0}</div>
                    </CCardBody>
                </CCard>
            </CCol>
            <CCol md={3}>
                <CCard className="text-center">
                    <CCardBody>
                        <CCardTitle component="h5">正在运行</CCardTitle>
                        <div className="display-4">{taskStats.running || 0}</div>
                    </CCardBody>
                </CCard>
            </CCol>
            <CCol md={3}>
                <CCard className="text-center">
                    <CCardBody>
                        <CCardTitle component="h5">已完成</CCardTitle>
                        <div className="display-4">{taskStats.completed || 0}</div>
                    </CCardBody>
                </CCard>
            </CCol>
            <CCol md={3}>
                <CCard className="text-center">
                    <CCardBody>
                        <CCardTitle component="h5">失败</CCardTitle>
                        <div className="display-4">{taskStats.failed || 0}</div>
                    </CCardBody>
                </CCard>
            </CCol>
        </CRow>
    );
};

export default StatCards;