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
    CSpinner,
    CNav,
    CNavItem,
    CNavLink,
    CTabContent,
    CTabPane
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPencil, cilTrash } from '@coreui/icons';
import { fetchTaskLogsRequest, clearTaskLogs } from '../../redux/tasks/reducer';
import TaskForm from './TaskForm';
import GitTaskForm from './GitTaskForm';

const TaskDetails = ({ task, visible, onClose, onStopTask, onUpdateTask, onDeleteTask }) => {
    const dispatch = useDispatch();
    const [activeExecutionId, setActiveExecutionId] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [activeLogTab, setActiveLogTab] = useState('combined');
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
            // 关闭时重置编辑模式
            setEditMode(false);
            setActiveTab('details');
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
            pollInterval: 3000,
            includeStdout: true,
            includeStderr: true
        }));
    };

    // 获取当前任务的日志
    const getCurrentLogs = () => {
        if (!task || !activeExecutionId || !taskLogs[task.task_id]) {
            return {
                logs: "等待日志数据...",
                stdout: "",
                stderr: "",
                isComplete: false
            };
        }

        const executionLogs = taskLogs[task.task_id][activeExecutionId];
        if (!executionLogs) {
            return {
                logs: "获取日志中...",
                stdout: "",
                stderr: "",
                isComplete: false
            };
        }

        return executionLogs;
    };

    // 处理任务更新提交
    const handleUpdateSubmit = (updatedData) => {
        if (onUpdateTask && task) {
            onUpdateTask({
                taskId: task.task_id,
                ...updatedData
            });
            setEditMode(false);
            setActiveTab('details');
        }
    };

    // 处理任务删除确认
    const handleDeleteConfirm = () => {
        if (onDeleteTask && task) {
            onDeleteTask(task.task_id);
            onClose();
        }
    };

    if (!task) return null;

    // 获取所有日志内容
    const { logs, stdout, stderr, isComplete } = getCurrentLogs();
    const isRunning = task.status === 'running';
    const canEdit = !isRunning && task.status !== 'completed' && task.status !== 'failed';
    const isGitTask = task.is_git_task;

    // 渲染表单（编辑模式）
    const renderEditForm = () => {
        if (isGitTask) {
            return (
                <GitTaskForm
                    initialValues={{
                        taskName: task.task_name,
                        gitRepo: task.git_repo,
                        gitBranch: task.git_branch,
                        condaEnv: task.conda_env,
                        cronExpression: task.cron_expression,
                        scheduleType: task.cron_expression ? 'cron' : 'once'
                    }}
                    isUpdate={true}
                    onSubmit={handleUpdateSubmit}
                    onCancel={() => {
                        setEditMode(false);
                        setActiveTab('details');
                    }}
                />
            );
        } else {
            return (
                <TaskForm
                    initialValues={{
                        taskName: task.task_name,
                        scriptPath: task.script_path || task.script,
                        condaEnv: task.conda_env,
                        cronExpression: task.cron_expression,
                        scheduleType: task.cron_expression ? 'cron' : 'once'
                    }}
                    isUpdate={true}
                    onSubmit={handleUpdateSubmit}
                    onCancel={() => {
                        setEditMode(false);
                        setActiveTab('details');
                    }}
                />
            );
        }
    };

    // 渲染详情页
    const renderDetailsTab = () => (
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
                                            task.status === 'success' || task.status === 'completed' ? 'success' :
                                                task.status === 'failed' ? 'danger' :
                                                    task.status === 'stopped' ? 'dark' :
                                                        task.status === 'paused' ? 'info' : 'secondary'
                                    }>
                                        {task.status === 'running' ? '运行中' :
                                            task.status === 'success' || task.status === 'completed' ? '已完成' :
                                                task.status === 'failed' ? '失败' :
                                                    task.status === 'scheduled' ? '已调度' :
                                                        task.status === 'stopped' ? '已停止' :
                                                            task.status === 'paused' ? '已暂停' : task.status}
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
                        <h6>{isGitTask ? 'Git信息' : '脚本信息'}</h6>
                        <CListGroup flush>
                            {isGitTask ? (
                                <>
                                    <CListGroupItem>
                                        <div className="d-flex justify-content-between">
                                            <span>Git仓库:</span>
                                            <span className="text-break">{task.git_repo}</span>
                                        </div>
                                    </CListGroupItem>
                                    <CListGroupItem>
                                        <div className="d-flex justify-content-between">
                                            <span>Git分支:</span>
                                            <span>{task.git_branch}</span>
                                        </div>
                                    </CListGroupItem>
                                </>
                            ) : (
                                <CListGroupItem>
                                    <div className="d-flex justify-content-between">
                                        <span>脚本路径:</span>
                                        <span className="text-break">{task.script_path || task.script}</span>
                                    </div>
                                </CListGroupItem>
                            )}
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
    );

    // 渲染日志页
    const renderLogsTab = () => (
        <CCard className="mt-3">
            <CCardBody>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">任务日志输出</h6>
                    {!isComplete && isRunning && (
                        <div className="d-flex align-items-center">
                            <small className="text-muted me-2">实时更新中</small>
                            <CSpinner size="sm" />
                        </div>
                    )}
                    {isComplete && (
                        <small className="text-success">任务已完成</small>
                    )}
                </div>

                {/* 日志类型切换标签 */}
                <CNav variant="tabs" className="mb-2">
                    <CNavItem>
                        <CNavLink
                            active={activeLogTab === 'combined'}
                            onClick={() => setActiveLogTab('combined')}
                            style={{ cursor: 'pointer' }}
                        >
                            综合日志
                        </CNavLink>
                    </CNavItem>
                    <CNavItem>
                        <CNavLink
                            active={activeLogTab === 'stdout'}
                            onClick={() => setActiveLogTab('stdout')}
                            style={{ cursor: 'pointer' }}
                        >
                            标准输出
                        </CNavLink>
                    </CNavItem>
                    <CNavItem>
                        <CNavLink
                            active={activeLogTab === 'stderr'}
                            onClick={() => setActiveLogTab('stderr')}
                            style={{ cursor: 'pointer' }}
                        >
                            标准错误
                        </CNavLink>
                    </CNavItem>
                </CNav>

                {/* 日志内容展示 */}
                <CTabContent>
                    <CTabPane visible={activeLogTab === 'combined'}>
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
                    </CTabPane>
                    <CTabPane visible={activeLogTab === 'stdout'}>
                        <div
                            className="bg-dark text-white p-3 mt-2"
                            style={{
                                height: '300px',
                                overflowY: 'auto',
                                fontFamily: 'monospace',
                                whiteSpace: 'pre-wrap',
                                fontSize: '12px'
                            }}
                        >
                            {stdout || "暂无标准输出..."}
                        </div>
                    </CTabPane>
                    <CTabPane visible={activeLogTab === 'stderr'}>
                        <div
                            className="bg-dark text-white p-3 mt-2"
                            style={{
                                height: '300px',
                                overflowY: 'auto',
                                fontFamily: 'monospace',
                                whiteSpace: 'pre-wrap',
                                fontSize: '12px',
                                color: '#ff8080' /* 标准错误用红色调显示 */
                            }}
                        >
                            {stderr || "暂无标准错误..."}
                        </div>
                    </CTabPane>
                </CTabContent>
            </CCardBody>
        </CCard>
    );

    return (
        <CModal visible={visible} onClose={onClose} size="lg">
            <CModalHeader>
                <CModalTitle>
                    任务详情: {task.task_name}
                    {canEdit && (
                        <>
                            <CButton
                                color="link"
                                className="ms-2 p-0"
                                onClick={() => {
                                    setEditMode(true);
                                    setActiveTab('edit');
                                }}
                            >
                                <CIcon icon={cilPencil} />
                            </CButton>
                            <CButton
                                color="link"
                                className="ms-2 p-0 text-danger"
                                onClick={handleDeleteConfirm}
                            >
                                <CIcon icon={cilTrash} />
                            </CButton>
                        </>
                    )}
                </CModalTitle>
            </CModalHeader>
            <CModalBody>
                {editMode ? (
                    renderEditForm()
                ) : (
                    <>
                        <CNav variant="tabs" className="mb-3">
                            <CNavItem>
                                <CNavLink
                                    active={activeTab === 'details'}
                                    onClick={() => setActiveTab('details')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    详情
                                </CNavLink>
                            </CNavItem>
                            <CNavItem>
                                <CNavLink
                                    active={activeTab === 'logs'}
                                    onClick={() => setActiveTab('logs')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    日志
                                </CNavLink>
                            </CNavItem>
                        </CNav>
                        <CTabContent>
                            <CTabPane visible={activeTab === 'details'}>
                                {renderDetailsTab()}
                            </CTabPane>
                            <CTabPane visible={activeTab === 'logs'}>
                                {renderLogsTab()}
                            </CTabPane>
                        </CTabContent>
                    </>
                )}
            </CModalBody>
            <CModalFooter>
                {isRunning && !editMode && (
                    <CButton color="danger" onClick={() => {
                        onStopTask(task.task_id);
                        onClose();
                    }}>
                        停止任务
                    </CButton>
                )}
                {editMode ? (
                    <CButton color="secondary" onClick={() => {
                        setEditMode(false);
                        setActiveTab('details');
                    }}>
                        取消
                    </CButton>
                ) : (
                    <CButton color="secondary" onClick={onClose}>
                        关闭
                    </CButton>
                )}
            </CModalFooter>
        </CModal>
    );
};

export default TaskDetails;