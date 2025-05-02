import React from 'react';
import {
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
    CButton,
    CCard,
    CCardBody,
    CListGroup,
    CListGroupItem,
    CRow,
    CCol,
    CBadge
} from '@coreui/react';

const TaskDetails = ({ task, visible, onClose, onStopTask }) => {
    if (!task) return null;

    return (
        <CModal visible={visible} onClose={onClose} size="lg">
            <CModalHeader>
                <CModalTitle>任务详情: {task.task_name}</CModalTitle>
            </CModalHeader>
            <CModalBody>
                <CRow>
                    <CCol md={6}>
                        <CCard>
                            <CCardBody>
                                <h6>基本信息</h6>
                                <CListGroup flush>
                                    <CListGroupItem>
                                        <div className="d-flex justify-content-between">
                                            <span>任务ID:</span>
                                            <span>{task.task_id}</span>
                                        </div>
                                    </CListGroupItem>
                                    <CListGroupItem>
                                        <div className="d-flex justify-content-between">
                                            <span>状态:</span>
                                            <CBadge color={
                                                task.status === 'running' ? 'primary' :
                                                    task.status === 'success' ? 'success' :
                                                        task.status === 'failed' ? 'danger' :
                                                            'secondary'
                                            }>
                                                {task.status}
                                            </CBadge>
                                        </div>
                                    </CListGroupItem>
                                    <CListGroupItem>
                                        <div className="d-flex justify-content-between">
                                            <span>Conda环境:</span>
                                            <span>{task.conda_env}</span>
                                        </div>
                                    </CListGroupItem>
                                    <CListGroupItem>
                                        <div className="d-flex justify-content-between">
                                            <span>创建时间:</span>
                                            <span>{new Date(task.created_at || Date.now()).toLocaleString()}</span>
                                        </div>
                                    </CListGroupItem>
                                </CListGroup>
                            </CCardBody>
                        </CCard>
                    </CCol>
                    <CCol md={6}>
                        <CCard>
                            <CCardBody>
                                <h6>脚本信息</h6>
                                <CListGroup flush>
                                    <CListGroupItem>
                                        <div className="d-flex justify-content-between">
                                            <span>脚本路径:</span>
                                            <span className="text-break">{task.script}</span>
                                        </div>
                                    </CListGroupItem>
                                    <CListGroupItem>
                                        <div className="d-flex justify-content-between">
                                            <span>任务类型:</span>
                                            <span>
                                                {task.schedule?.type ?
                                                    `${task.schedule.type} 调度` :
                                                    '立即执行'
                                                }
                                            </span>
                                        </div>
                                    </CListGroupItem>
                                    {task.schedule?.datetime && (
                                        <CListGroupItem>
                                            <div className="d-flex justify-content-between">
                                                <span>计划执行时间:</span>
                                                <span>{new Date(task.schedule.datetime).toLocaleString()}</span>
                                            </div>
                                        </CListGroupItem>
                                    )}
                                    <CListGroupItem>
                                        <div className="d-flex justify-content-between">
                                            <span>进程ID:</span>
                                            <span>{task.pid || '-'}</span>
                                        </div>
                                    </CListGroupItem>
                                </CListGroup>
                            </CCardBody>
                        </CCard>
                    </CCol>
                </CRow>

                {task.status === 'running' && (
                    <CCard className="mt-3">
                        <CCardBody>
                            <h6>实时日志输出</h6>
                            <div className="bg-dark text-white p-3 mt-2" style={{ height: '200px', overflowY: 'auto', fontFamily: 'monospace' }}>
                                <p>Starting task {task.task_name}...</p>
                                <p>Activating conda environment: {task.conda_env}</p>
                                <p>Running script: {task.script}</p>
                                <p>...</p>
                            </div>
                        </CCardBody>
                    </CCard>
                )}
            </CModalBody>
            <CModalFooter>
                {task.status === 'running' && (
                    <CButton color="danger" onClick={() => {
                        onStopTask(task.task_id);
                        onClose();
                    }}>
                        停止任务
                    </CButton>
                )}
                <CButton color="secondary" onClick={onClose}>
                    关闭
                </CButton>
            </CModalFooter>
        </CModal>
    );
};

export default TaskDetails;