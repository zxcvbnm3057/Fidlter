import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
    CBadge,
    CSpinner
} from '@coreui/react';
import { fetchTaskLogsRequest, clearTaskLogs } from '../../redux/tasks/reducer';

const TaskDetails = ({ task, visible, onClose, onStopTask }) => {
    const dispatch = useDispatch();
    const [activeExecutionId, setActiveExecutionId] = useState(null);
    const logContainerRef = useRef(null);
    const taskLogs = useSelector(state => state.tasks.taskLogs);

    // 当模态框打开/关闭或任务变更时处理日志获取
    useEffect(() => {
        if (visible && task && task.status === 'running' && task.last_execution_id) {
            // 设置当前活动的执行ID
            setActiveExecutionId(task.last_execution_id);

            // 启动日志轮询
            startLogPolling(task.task_id, task.last_execution_id);
        }

        // 当模态框关闭时清理
        return () => {
            if (activeExecutionId) {
                // 清除当前任务日志数据
                dispatch(clearTaskLogs({ taskId: task?.task_id, executionId: activeExecutionId }));
                setActiveExecutionId(null);
            }
        };
    }, [visible, task, dispatch]);

    // 自动滚动日志到底部
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [taskLogs]);

    // 启动日志轮询
    const startLogPolling = (taskId, executionId) => {
        // 获取日志，设置轮询间隔为3秒
        dispatch(fetchTaskLogsRequest({
            taskId,
            executionId,
            realTime: true,
            pollInterval: 3000
        }));
    };

    // 获取当前任务的日志
    const getCurrentLogs = () => {
        if (!task || !activeExecutionId || !taskLogs[task.task_id]) {
            return { logs: "等待日志数据...", isComplete: false };
        }

        const executionLogs = taskLogs[task.task_id][activeExecutionId];
        if (!executionLogs) {
            return { logs: "获取日志中...", isComplete: false };
        }

        return executionLogs;
    };

    if (!task) return null;

    const { logs, isComplete } = getCurrentLogs();

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
                                            <span className="text-break">{task.script_path || task.script}</span>
                                        </div>
                                    </CListGroupItem>
                                    <CListGroupItem>
                                        <div className="d-flex justify-content-between">
                                            <span>任务类型:</span>
                                            <span>
                                                {task.cron_expression ?
                                                    '定时调度' :
                                                    (task.schedule?.type ?
                                                        `${task.schedule.type} 调度` :
                                                        '立即执行')
                                                }
                                            </span>
                                        </div>
                                    </CListGroupItem>
                                    {task.cron_expression && (
                                        <CListGroupItem>
                                            <div className="d-flex justify-content-between">
                                                <span>Cron 表达式:</span>
                                                <span>{task.cron_expression}</span>
                                            </div>
                                        </CListGroupItem>
                                    )}
                                    {task.next_run_time_formatted && (
                                        <CListGroupItem>
                                            <div className="d-flex justify-content-between">
                                                <span>下次执行时间:</span>
                                                <span>{task.next_run_time_formatted}</span>
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

                {(task.status === 'running' || activeExecutionId) && (
                    <CCard className="mt-3">
                        <CCardBody>
                            <div className="d-flex justify-content-between align-items-center">
                                <h6 className="mb-0">实时日志输出</h6>
                                {!isComplete && task.status === 'running' && (
                                    <div className="d-flex align-items-center">
                                        <small className="text-muted me-2">实时更新中</small>
                                        <CSpinner size="sm" />
                                    </div>
                                )}
                                {isComplete && (
                                    <small className="text-success">任务已完成</small>
                                )}
                            </div>
                            <div
                                ref={logContainerRef}
                                className="bg-dark text-white p-3 mt-2"
                                style={{
                                    height: '300px',
                                    overflowY: 'auto',
                                    fontFamily: 'monospace',
                                    whiteSpace: 'pre-wrap',
                                    fontSize: '12px'
                                }}
                            >
                                {logs || "等待日志数据..."}
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