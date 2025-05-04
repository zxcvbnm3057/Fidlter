import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    CButton,
    CCard,
    CCardBody,
    CCardHeader,
    CCol,
    CRow,
    CSpinner,
    CAlert,
    CListGroup,
    CListGroupItem,
    CBadge,
    CModal,
    CModalHeader,
    CModalBody,
    CModalFooter,
    CModalTitle,
    CNav,
    CNavItem,
    CNavLink,
    CTabContent,
    CTabPane
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
    cilMediaStop,
    cilArrowLeft,
    cilMenu,
    cilReload,
    cilPlaylistAdd,
    cilCloudUpload
} from '@coreui/icons';
import {
    fetchTaskDetailsRequest,
    stopTaskRequest,
    fetchTasksRequest,
    fetchTaskLogsRequest,
    fetchTaskLogsSuccess,
    fetchTaskLogsFailure,
    clearTaskLogs
} from '../redux/tasks/reducer';
import { taskService } from '../services';
import { CChart } from '@coreui/react-chartjs';
import GitTaskUpdate from '../components/TaskScheduler/GitTaskUpdate';
import TaskScriptUpdater from '../components/TaskScheduler/TaskScriptUpdater';

const TaskDetail = () => {
    const { taskId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const location = useLocation();
    const { currentTaskDetails, taskLogs, loading, error } = useSelector(state => state.tasks);

    const [logModalVisible, setLogModalVisible] = useState(false);
    const [activeExecutionId, setActiveExecutionId] = useState(null);
    const logContainerRef = useRef(null);
    const [activeTab, setActiveTab] = useState(1); // 添加标签页状态
    const [activeLogTab, setActiveLogTab] = useState('combined'); // 添加日志标签页切换状态
    const [logEventSource, setLogEventSource] = useState(null); // 存储日志流EventSource实例
    const [logAlreadyOpened, setLogAlreadyOpened] = useState(false); // 添加状态来追踪日志是否已打开

    // 检查URL参数是否要求显示日志
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const showLogs = searchParams.get('showLogs') === 'true';
        const executionId = searchParams.get('executionId');

        if (showLogs && currentTaskDetails && !logAlreadyOpened) {
            setLogAlreadyOpened(true);
            if (executionId) {
                // 如果URL提供了执行ID，则直接打开该执行ID的日志
                openLogModal(executionId);
            } else if (currentTaskDetails.task?.status === 'running' && currentTaskDetails.task?.last_execution_id) {
                // 否则，如果任务正在运行，则打开最近一次执行的日志
                openLogModal(currentTaskDetails.task.last_execution_id);
            }
        }
    }, [location.search, currentTaskDetails, logAlreadyOpened]);

    // 脚本更新成功后的回调
    const handleScriptUpdateSuccess = (result) => {
        // 刷新任务详情
        refreshTaskDetails();
    };

    // 获取任务详情
    useEffect(() => {
        if (taskId) {
            dispatch(fetchTaskDetailsRequest({ taskId: parseInt(taskId) }));
        }

        // 定期刷新任务详情，每30秒一次
        const intervalId = setInterval(() => {
            if (taskId) {
                dispatch(fetchTaskDetailsRequest({ taskId: parseInt(taskId) }));
            }
        }, 30000);

        return () => {
            clearInterval(intervalId);
            if (activeExecutionId) {
                dispatch(clearTaskLogs({ taskId: parseInt(taskId), executionId: activeExecutionId }));
            }
        };
    }, [dispatch, taskId]);

    // 手动刷新任务详情
    const refreshTaskDetails = () => {
        dispatch(fetchTaskDetailsRequest({ taskId: parseInt(taskId) }));
    };

    // 停止任务
    const handleStopTask = async () => {
        if (!window.confirm('确定要停止这个任务吗？停止后任务将不再自动执行。')) return;
        dispatch(stopTaskRequest({ taskId: parseInt(taskId) }));
    };

    // 返回任务列表页
    const handleBackToList = () => {
        navigate(-1);
    };

    // 打开日志模态框并获取日志
    const openLogModal = (executionId) => {
        setActiveExecutionId(executionId);
        setLogModalVisible(true);

        // 检查浏览器是否支持EventSource
        const supportsEventSource = 'EventSource' in window;

        if (supportsEventSource) {
            // 使用流式API创建EventSource实例
            const eventSource = taskService.createLogStream(
                parseInt(taskId),
                executionId,
                {
                    onMessage: (data) => {
                        // 接收到新日志数据时，分发action更新Redux状态
                        if (data.logs) {
                            dispatch(fetchTaskLogsSuccess({
                                taskId,
                                executionId,
                                logs: data.logs,
                                isComplete: data.isComplete || false
                            }));
                        }
                    },
                    onComplete: (data) => {
                        // 任务完成时，分发最终状态
                        dispatch(fetchTaskLogsSuccess({
                            taskId,
                            executionId,
                            logs: "",  // 完成事件不包含日志内容
                            isComplete: true
                        }));
                    },
                    onError: (error) => {
                        // 出错时，分发错误action
                        dispatch(fetchTaskLogsFailure(error.message || '流式日志连接失败'));
                    }
                }
            );

            // 存储EventSource实例以便后续关闭
            setLogEventSource(eventSource);
        } else {
            // 不支持EventSource时使用轮询
            dispatch(fetchTaskLogsRequest({
                taskId: parseInt(taskId),
                executionId,
                realTime: true,
                pollInterval: 3000
            }));
        }
    };

    // 关闭日志模态框并清理日志
    const closeLogModal = () => {
        // 关闭模态框
        setLogModalVisible(false);

        // 关闭EventSource连接
        if (logEventSource) {
            logEventSource.close();
            setLogEventSource(null);
        }

        // 清理日志数据
        if (activeExecutionId) {
            dispatch(clearTaskLogs({ taskId: parseInt(taskId), executionId: activeExecutionId }));
            setActiveExecutionId(null);
        }
    };

    // 获取当前任务的日志
    const getCurrentLogs = () => {
        if (!taskId || !activeExecutionId || !taskLogs[taskId]) {
            return {
                logs: "等待日志数据...",
                isComplete: false
            };
        }

        const executionLogs = taskLogs[taskId][activeExecutionId];
        if (!executionLogs) {
            return {
                logs: "获取日志中...",
                isComplete: false
            };
        }

        return executionLogs;
    };

    // 自动滚动日志到底部
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [taskLogs]);

    // 准备性能指标图表数据
    const preparePerformanceChartData = () => {
        if (!currentTaskDetails?.performance_metrics?.durations) return null;

        const { durations, timestamps } = currentTaskDetails.performance_metrics;

        if (durations.length === 0 || timestamps.length === 0) return null;

        return {
            labels: timestamps.map(ts => {
                const date = new Date(ts);
                return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            }),
            datasets: [
                {
                    label: '执行时长(秒)',
                    backgroundColor: 'rgba(51, 153, 255, 0.2)',
                    borderColor: '#3399ff',
                    pointBackgroundColor: '#3399ff',
                    pointBorderColor: '#fff',
                    data: durations
                }
            ]
        };
    };

    // 准备内存使用图表数据
    const prepareMemoryChartData = () => {
        if (!currentTaskDetails?.performance_metrics?.peak_memories) return null;

        const { peak_memories, avg_memories, timestamps } = currentTaskDetails.performance_metrics;

        if (peak_memories.length === 0 || avg_memories.length === 0) return null;

        return {
            labels: timestamps.map(ts => {
                const date = new Date(ts);
                return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            }),
            datasets: [
                {
                    label: '峰值内存 (MB)',
                    backgroundColor: 'rgba(77, 189, 116, 0.2)',
                    borderColor: '#4dbd74',
                    pointBackgroundColor: '#4dbd74',
                    pointBorderColor: '#fff',
                    data: peak_memories
                },
                {
                    label: '平均内存 (MB)',
                    backgroundColor: 'rgba(240, 173, 78, 0.2)',
                    borderColor: '#f0ad4e',
                    pointBackgroundColor: '#f0ad4e',
                    pointBorderColor: '#fff',
                    data: avg_memories
                }
            ]
        };
    };

    if (loading && !currentTaskDetails) {
        return <div className="text-center mt-5"><CSpinner color="primary" /></div>;
    }

    // 获取所有日志内容
    const task = currentTaskDetails?.task;
    const executionHistory = currentTaskDetails?.execution_history || [];
    const { logs, isComplete } = getCurrentLogs();
    const performanceChartData = preparePerformanceChartData();
    const memoryChartData = prepareMemoryChartData();

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <CButton color="secondary" variant="outline" onClick={handleBackToList} className="me-2">
                        <CIcon icon={cilArrowLeft} className="me-1" /> 返回任务列表
                    </CButton>
                    <h2 className="d-inline-block">{task?.task_name || `任务 #${taskId}`}</h2>
                </div>
                <div>
                    <CButton color="info" onClick={refreshTaskDetails} className="me-2">
                        <CIcon icon={cilReload} className="me-1" /> 刷新
                    </CButton>
                    {task?.status === 'running' && (
                        <CButton color="danger" onClick={handleStopTask}>
                            <CIcon icon={cilMediaStop} className="me-1" /> 停止任务
                        </CButton>
                    )}
                </div>
            </div>

            {error && <CAlert color="danger">{error}</CAlert>}

            {/* 如果是Git仓库任务，显示Git仓库同步组件 */}
            {task && task.is_git_task && (
                <GitTaskUpdate taskId={parseInt(taskId)} />
            )}

            {task && (
                <>
                    {/* 添加标签导航 */}
                    <CNav variant="tabs" className="mb-4">
                        <CNavItem>
                            <CNavLink
                                active={activeTab === 1}
                                onClick={() => setActiveTab(1)}
                                style={{ cursor: 'pointer' }}
                            >
                                任务详情
                            </CNavLink>
                        </CNavItem>
                        <CNavItem>
                            <CNavLink
                                active={activeTab === 2}
                                onClick={() => setActiveTab(2)}
                                style={{ cursor: 'pointer' }}
                            >
                                更新脚本
                            </CNavLink>
                        </CNavItem>
                    </CNav>

                    <CTabContent>
                        <CTabPane visible={activeTab === 1}>
                            <CRow className="mb-4">
                                <CCol md={6}>
                                    <CCard className="mb-4">
                                        <CCardHeader>
                                            <h5 className="mb-0">基本信息</h5>
                                        </CCardHeader>
                                        <CCardBody>
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
                                                                task.status === 'success' || task.status === 'completed' ? 'success' :
                                                                    task.status === 'failed' ? 'danger' :
                                                                        task.status === 'scheduled' ? 'warning' :
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
                                                <CListGroupItem>
                                                    <div className="d-flex justify-content-between">
                                                        <span>上次执行时间:</span>
                                                        <span>{task.last_run_time ? new Date(task.last_run_time).toLocaleString() : '-'}</span>
                                                    </div>
                                                </CListGroupItem>
                                                <CListGroupItem>
                                                    <div className="d-flex justify-content-between">
                                                        <span>执行时长:</span>
                                                        <span>{task.last_run_duration ? `${task.last_run_duration}秒` : '-'}</span>
                                                    </div>
                                                </CListGroupItem>

                                                {/* 如果是Git仓库任务，显示Git相关信息 */}
                                                {task.is_git_task && (
                                                    <CListGroupItem>
                                                        <div className="d-flex justify-content-between">
                                                            <span>仓库类型:</span>
                                                            <CBadge color="info">Git仓库任务</CBadge>
                                                        </div>
                                                    </CListGroupItem>
                                                )}
                                                {task.repo_url && (
                                                    <CListGroupItem>
                                                        <div className="d-flex justify-content-between">
                                                            <span>仓库URL:</span>
                                                            <span className="text-break">{task.repo_url}</span>
                                                        </div>
                                                    </CListGroupItem>
                                                )}
                                                {task.repo_branch && (
                                                    <CListGroupItem>
                                                        <div className="d-flex justify-content-between">
                                                            <span>仓库分支:</span>
                                                            <span>{task.repo_branch}</span>
                                                        </div>
                                                    </CListGroupItem>
                                                )}
                                                {task.last_synced && (
                                                    <CListGroupItem>
                                                        <div className="d-flex justify-content-between">
                                                            <span>最后同步时间:</span>
                                                            <span>{new Date(task.last_synced).toLocaleString()}</span>
                                                        </div>
                                                    </CListGroupItem>
                                                )}
                                            </CListGroup>
                                        </CCardBody>
                                    </CCard>

                                    <CCard className="mb-4">
                                        <CCardHeader>
                                            <h5 className="mb-0">脚本信息</h5>
                                        </CCardHeader>
                                        <CCardBody>
                                            <CListGroup flush>
                                                <CListGroupItem>
                                                    <div className="d-flex justify-content-between">
                                                        <span>脚本路径:</span>
                                                        <span className="text-break">{task.script_path}</span>
                                                    </div>
                                                </CListGroupItem>
                                                <CListGroupItem>
                                                    <div className="d-flex justify-content-between">
                                                        <span>任务类型:</span>
                                                        <span>
                                                            {task.cron_expression ?
                                                                '定时调度' : '立即执行'
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
                                                {task.next_run_time && (
                                                    <CListGroupItem>
                                                        <div className="d-flex justify-content-between">
                                                            <span>下次执行时间:</span>
                                                            <span>{new Date(task.next_run_time).toLocaleString()}</span>
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

                                <CCol md={6}>
                                    <CCard className="mb-4">
                                        <CCardHeader>
                                            <h5 className="mb-0">执行历史</h5>
                                        </CCardHeader>
                                        <CCardBody>
                                            {executionHistory.length > 0 ? (
                                                <CListGroup>
                                                    {executionHistory.map((execution, index) => (
                                                        <CListGroupItem key={index} className="d-flex justify-content-between align-items-center">
                                                            <div>
                                                                <div>
                                                                    <span className="fw-bold me-2">执行ID:</span>
                                                                    <span className="text-muted">{execution.execution_id?.substring(0, 8)}...</span>
                                                                </div>
                                                                <div>
                                                                    <small>
                                                                        <span className="text-muted">{new Date(execution.start_time).toLocaleString()}</span>
                                                                        {execution.duration && (
                                                                            <span className="ms-2">
                                                                                耗时: {execution.duration}秒
                                                                            </span>
                                                                        )}
                                                                    </small>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <CBadge color={
                                                                    execution.status === 'running' ? 'primary' :
                                                                        execution.status === 'completed' ? 'success' :
                                                                            execution.status === 'failed' ? 'danger' : 'secondary'
                                                                } className="me-2">
                                                                    {execution.status}
                                                                </CBadge>
                                                                <CButton
                                                                    color="info"
                                                                    size="sm"
                                                                    onClick={() => openLogModal(execution.execution_id)}
                                                                >
                                                                    查看日志
                                                                </CButton>
                                                            </div>
                                                        </CListGroupItem>
                                                    ))}
                                                </CListGroup>
                                            ) : (
                                                <div className="text-center py-4 text-muted">
                                                    <span className="h4">🕓</span>
                                                    <p>暂无执行历史记录</p>
                                                </div>
                                            )}
                                        </CCardBody>
                                    </CCard>

                                    {performanceChartData && (
                                        <CCard className="mb-4">
                                            <CCardHeader>
                                                <h5 className="mb-0">性能指标</h5>
                                            </CCardHeader>
                                            <CCardBody>
                                                <h6>执行时长历史</h6>
                                                <CChart
                                                    type="line"
                                                    data={performanceChartData}
                                                    options={{
                                                        plugins: {
                                                            legend: {
                                                                position: 'top',
                                                            }
                                                        },
                                                        scales: {
                                                            y: {
                                                                beginAtZero: true,
                                                                title: {
                                                                    display: true,
                                                                    text: '耗时(秒)'
                                                                }
                                                            }
                                                        },
                                                        maintainAspectRatio: false,
                                                    }}
                                                    style={{ height: '200px' }}
                                                />

                                                {memoryChartData && (
                                                    <>
                                                        <h6 className="mt-4">内存使用历史</h6>
                                                        <CChart
                                                            type="line"
                                                            data={memoryChartData}
                                                            options={{
                                                                plugins: {
                                                                    legend: {
                                                                        position: 'top',
                                                                    }
                                                                },
                                                                scales: {
                                                                    y: {
                                                                        beginAtZero: true,
                                                                        title: {
                                                                            display: true,
                                                                            text: '内存 (MB)'
                                                                        }
                                                                    }
                                                                },
                                                                maintainAspectRatio: false,
                                                            }}
                                                            style={{ height: '200px' }}
                                                        />
                                                    </>
                                                )}
                                            </CCardBody>
                                        </CCard>
                                    )}
                                </CCol>
                            </CRow>
                        </CTabPane>

                        {/* 脚本更新标签页 */}
                        <CTabPane visible={activeTab === 2}>
                            <TaskScriptUpdater
                                taskId={parseInt(taskId)}
                                taskName={task.task_name}
                                status={task.status}
                                onSuccess={handleScriptUpdateSuccess}
                            />
                        </CTabPane>
                    </CTabContent>
                </>
            )}

            {/* 日志查看模态框 */}
            <CModal visible={logModalVisible} onClose={closeLogModal} size="lg" scrollable>
                <CModalHeader>
                    <CModalTitle>任务日志</CModalTitle>
                </CModalHeader>
                <CModalBody>
                    <div className="mb-2 d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">执行ID: {activeExecutionId?.substring(0, 8)}...</h6>
                        {!isComplete && task?.status === 'running' && (
                            <div className="d-flex align-items-center">
                                <small className="text-muted me-2">实时更新中</small>
                                <CSpinner size="sm" />
                            </div>
                        )}
                        {isComplete && (
                            <small className="text-success">任务已完成</small>
                        )}
                    </div>

                    {/* 日志内容展示 - 移除标签页，直接显示综合日志 */}
                    <div
                        ref={logContainerRef}
                        className="bg-dark text-white p-3 mt-2"
                        style={{
                            height: '500px',
                            overflowY: 'auto',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            fontSize: '12px'
                        }}
                    >
                        {logs || "等待日志数据..."}
                    </div>
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" onClick={closeLogModal}>
                        关闭
                    </CButton>
                </CModalFooter>
            </CModal>
        </div>
    );
};

export default TaskDetail;