import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchTasksRequest,
    fetchTaskHistoryRequest,
    createTaskRequest,
    stopTaskRequest
} from '../redux/tasks/reducer';
import { fetchEnvironmentsRequest } from '../redux/conda/reducer';
import {
    CButton,
    CForm,
    CFormLabel,
    CFormInput,
    CFormSelect,
    CTable,
    CAlert,
    CSpinner,
    CCard,
    CCardBody,
    CCardTitle,
    CRow,
    CCol,
    CBadge,
    CCardHeader,
    CCardFooter,
    CDropdown,
    CDropdownToggle,
    CDropdownMenu,
    CDropdownItem,
    CTooltip,
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
    CListGroup,
    CListGroupItem
} from '@coreui/react';
import { CChart } from '@coreui/react-chartjs';
import { cilMediaPlay, cilMediaStop, cilTrash, cilCalendar, cilClock, cilList, cilOptions } from '@coreui/icons';
import CIcon from '@coreui/icons-react';

const TaskScheduler = () => {
    const dispatch = useDispatch();
    const [taskName, setTaskName] = useState('');
    const [condaEnv, setCondaEnv] = useState('');
    const [scriptPath, setScriptPath] = useState('');
    const [repeat, setRepeat] = useState('none');
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [advancedVisible, setAdvancedVisible] = useState(false);
    const [taskDetailsVisible, setTaskDetailsVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    // 从Redux store获取状态
    const { taskList, taskHistory, loading: tasksLoading, error: tasksError } = useSelector(state => state.tasks);
    const { environments } = useSelector(state => state.conda);

    useEffect(() => {
        // 分发获取任务列表请求action
        dispatch(fetchTasksRequest());
        // 分发获取任务历史记录请求action
        dispatch(fetchTaskHistoryRequest());
        // 分发获取环境列表请求action
        dispatch(fetchEnvironmentsRequest());
    }, [dispatch]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!taskName || !condaEnv || !scriptPath) {
            return;
        }

        const taskData = {
            task_name: taskName,
            conda_env: condaEnv,
            script: scriptPath
        };

        // 如果设置了调度时间
        if (repeat !== 'none') {
            taskData.schedule = {
                type: repeat,
                datetime: scheduledDate && scheduledTime ?
                    `${scheduledDate}T${scheduledTime}` :
                    null
            };
        }

        // 分发创建任务请求action
        dispatch(createTaskRequest(taskData));

        // 重置表单
        setTaskName('');
        setCondaEnv('');
        setScriptPath('');
        setRepeat('none');
        setScheduledDate('');
        setScheduledTime('');
    };

    const handleStopTask = async (taskId) => {
        if (!window.confirm('确定要停止这个任务吗？')) return;

        // 分发停止任务请求action
        dispatch(stopTaskRequest({ taskId }));
    };

    const openTaskDetails = (task) => {
        setSelectedTask(task);
        setTaskDetailsVisible(true);
    };

    // 准备任务状态饼图数据
    const prepareTaskStatusChart = () => {
        if (!taskList.length && !taskHistory.length) return null;

        const statusCounts = {
            running: 0,
            success: 0,
            failed: 0,
            scheduled: 0,
            other: 0
        };

        // 统计当前任务
        taskList.forEach(task => {
            if (task.status === 'running') statusCounts.running++;
            else if (task.status === 'scheduled') statusCounts.scheduled++;
            else statusCounts.other++;
        });

        // 统计最近的历史任务（限制为最近10条）
        const recentHistory = taskHistory.slice(0, 10);
        recentHistory.forEach(task => {
            if (task.status === 'success') statusCounts.success++;
            else if (task.status === 'failed') statusCounts.failed++;
            else statusCounts.other++;
        });

        return {
            labels: ['运行中', '已完成', '失败', '已调度', '其他'],
            datasets: [
                {
                    data: [
                        statusCounts.running,
                        statusCounts.success,
                        statusCounts.failed,
                        statusCounts.scheduled,
                        statusCounts.other
                    ],
                    backgroundColor: [
                        '#3399ff', // 运行中 - 蓝色
                        '#2eb85c', // 已完成 - 绿色
                        '#e55353', // 失败 - 红色
                        '#f9b115', // 已调度 - 黄色
                        '#ababab'  // 其他 - 灰色
                    ],
                }
            ]
        };
    };

    // 准备环境使用情况图表数据
    const prepareEnvUsageChart = () => {
        if (!taskHistory.length) return null;

        const envUsage = {};

        // 计算每个环境的使用次数
        taskHistory.forEach(task => {
            const env = task.conda_env;
            if (env) {
                envUsage[env] = (envUsage[env] || 0) + 1;
            }
        });

        // 转换为图表所需格式
        const labels = Object.keys(envUsage);
        const data = labels.map(label => envUsage[label]);

        return {
            labels,
            datasets: [
                {
                    label: '使用次数',
                    backgroundColor: 'rgba(51, 153, 255, 0.5)',
                    borderColor: '#3399ff',
                    borderWidth: 1,
                    data
                }
            ]
        };
    };

    if (tasksLoading && taskList.length === 0 && environments.length === 0) {
        return <div className="text-center mt-5"><CSpinner color="primary" /></div>;
    }

    return (
        <div>
            <h2>任务调度器</h2>
            {tasksError && <CAlert color="danger">{tasksError}</CAlert>}

            <CRow className="mb-4">
                <CCol sm={6} lg={3}>
                    <CCard className="mb-4 text-center">
                        <CCardBody>
                            <CCardTitle component="h5">总任务数</CCardTitle>
                            <div className="h1 mt-3 mb-2">{taskList.length + taskHistory.length}</div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol sm={6} lg={3}>
                    <CCard className="mb-4 text-center">
                        <CCardBody>
                            <CCardTitle component="h5">运行中任务</CCardTitle>
                            <div className="h1 mt-3 mb-2 text-primary">
                                {taskList.filter(task => task.status === 'running').length}
                            </div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol sm={6} lg={3}>
                    <CCard className="mb-4 text-center">
                        <CCardBody>
                            <CCardTitle component="h5">已完成任务</CCardTitle>
                            <div className="h1 mt-3 mb-2 text-success">
                                {taskHistory.filter(task => task.status === 'success').length}
                            </div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol sm={6} lg={3}>
                    <CCard className="mb-4 text-center">
                        <CCardBody>
                            <CCardTitle component="h5">失败任务</CCardTitle>
                            <div className="h1 mt-3 mb-2 text-danger">
                                {taskHistory.filter(task => task.status === 'failed').length}
                            </div>
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>

            <CRow className="mb-4">
                <CCol md={6}>
                    <CCard className="mb-4">
                        <CCardBody>
                            <CCardTitle component="h5">任务状态分布</CCardTitle>
                            {prepareTaskStatusChart() && (
                                <CChart
                                    type="doughnut"
                                    data={prepareTaskStatusChart()}
                                    options={{
                                        plugins: {
                                            legend: {
                                                position: 'bottom',
                                            }
                                        },
                                        maintainAspectRatio: false,
                                    }}
                                    style={{ height: '250px' }}
                                />
                            )}
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol md={6}>
                    <CCard className="mb-4">
                        <CCardBody>
                            <CCardTitle component="h5">环境使用情况</CCardTitle>
                            {prepareEnvUsageChart() ? (
                                <CChart
                                    type="bar"
                                    data={prepareEnvUsageChart()}
                                    options={{
                                        plugins: {
                                            legend: {
                                                display: false,
                                            }
                                        },
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                                title: {
                                                    display: true,
                                                    text: '使用次数'
                                                }
                                            }
                                        },
                                        maintainAspectRatio: false,
                                    }}
                                    style={{ height: '250px' }}
                                />
                            ) : (
                                <div className="text-center my-5">暂无环境使用数据</div>
                            )}
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>

            <CCard className="mb-4">
                <CCardHeader>
                    <h5 className="mb-0">创建新任务</h5>
                </CCardHeader>
                <CCardBody>
                    <CForm onSubmit={handleSubmit}>
                        <CRow>
                            <CCol md={6}>
                                <div className="mb-3">
                                    <CFormLabel htmlFor="taskName">任务名称</CFormLabel>
                                    <CFormInput
                                        type="text"
                                        id="taskName"
                                        value={taskName}
                                        onChange={(e) => setTaskName(e.target.value)}
                                        required
                                    />
                                </div>
                            </CCol>
                            <CCol md={6}>
                                <div className="mb-3">
                                    <CFormLabel htmlFor="condaEnv">Conda环境</CFormLabel>
                                    <CFormSelect
                                        id="condaEnv"
                                        value={condaEnv}
                                        onChange={(e) => setCondaEnv(e.target.value)}
                                        required
                                    >
                                        <option value="">选择环境</option>
                                        {environments.map(env => (
                                            <option key={env.env_id} value={env.name}>{env.name}</option>
                                        ))}
                                    </CFormSelect>
                                </div>
                            </CCol>
                        </CRow>
                        <div className="mb-3">
                            <CFormLabel htmlFor="scriptPath">脚本路径</CFormLabel>
                            <CFormInput
                                type="text"
                                id="scriptPath"
                                value={scriptPath}
                                onChange={(e) => setScriptPath(e.target.value)}
                                placeholder="例如: /path/to/script.py"
                                required
                            />
                        </div>

                        <div className="mb-3">
                            <CFormLabel htmlFor="repeat">执行方式</CFormLabel>
                            <CFormSelect
                                id="repeat"
                                value={repeat}
                                onChange={(e) => setRepeat(e.target.value)}
                            >
                                <option value="none">立即执行</option>
                                <option value="once">定时执行（一次）</option>
                                <option value="daily">每日执行</option>
                                <option value="weekly">每周执行</option>
                                <option value="monthly">每月执行</option>
                            </CFormSelect>
                        </div>

                        {repeat !== 'none' && (
                            <CRow>
                                <CCol md={6}>
                                    <div className="mb-3">
                                        <CFormLabel htmlFor="scheduledDate">执行日期</CFormLabel>
                                        <CFormInput
                                            type="date"
                                            id="scheduledDate"
                                            value={scheduledDate}
                                            onChange={(e) => setScheduledDate(e.target.value)}
                                            required={repeat !== 'none'}
                                        />
                                    </div>
                                </CCol>
                                <CCol md={6}>
                                    <div className="mb-3">
                                        <CFormLabel htmlFor="scheduledTime">执行时间</CFormLabel>
                                        <CFormInput
                                            type="time"
                                            id="scheduledTime"
                                            value={scheduledTime}
                                            onChange={(e) => setScheduledTime(e.target.value)}
                                            required={repeat !== 'none'}
                                        />
                                    </div>
                                </CCol>
                            </CRow>
                        )}

                        <div className="mt-3 mb-3">
                            <CButton color="secondary" type="button" onClick={() => setAdvancedVisible(true)} className="me-2">
                                高级选项
                            </CButton>
                            <CButton color="primary" type="submit" disabled={tasksLoading}>
                                {tasksLoading ? <CSpinner size="sm" /> : (
                                    <>
                                        <CIcon icon={cilMediaPlay} className="me-2" />
                                        创建任务
                                    </>
                                )}
                            </CButton>
                        </div>
                    </CForm>
                </CCardBody>
            </CCard>

            <CCard className="mb-4">
                <CCardHeader className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">当前任务</h5>
                    <CDropdown>
                        <CDropdownToggle color="secondary">排序</CDropdownToggle>
                        <CDropdownMenu>
                            <CDropdownItem>按任务名称</CDropdownItem>
                            <CDropdownItem>按状态</CDropdownItem>
                            <CDropdownItem>按创建时间</CDropdownItem>
                        </CDropdownMenu>
                    </CDropdown>
                </CCardHeader>
                <CCardBody>
                    <CTable striped responsive hover>
                        <thead>
                            <tr>
                                <th>任务ID</th>
                                <th>任务名称</th>
                                <th>Conda环境</th>
                                <th>创建时间</th>
                                <th>状态</th>
                                <th>调度类型</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {taskList.length > 0 ? (
                                taskList.map((task) => (
                                    <tr key={task.task_id}>
                                        <td>{task.task_id}</td>
                                        <td>
                                            <span className="text-primary cursor-pointer" onClick={() => openTaskDetails(task)}>
                                                {task.task_name}
                                            </span>
                                        </td>
                                        <td>{task.conda_env}</td>
                                        <td>{new Date(task.created_at || Date.now()).toLocaleString()}</td>
                                        <td>
                                            {task.status === 'running' ?
                                                <CBadge color="primary">运行中</CBadge> :
                                                task.status === 'scheduled' ?
                                                    <CBadge color="warning">已调度</CBadge> :
                                                    <CBadge color="secondary">{task.status}</CBadge>
                                            }
                                        </td>
                                        <td>
                                            {task.schedule?.type === 'once' ?
                                                <span><CIcon icon={cilCalendar} /> 一次性</span> :
                                                task.schedule?.type === 'daily' ?
                                                    <span><CIcon icon={cilCalendar} /> 每日</span> :
                                                    task.schedule?.type === 'weekly' ?
                                                        <span><CIcon icon={cilCalendar} /> 每周</span> :
                                                        task.schedule?.type === 'monthly' ?
                                                            <span><CIcon icon={cilCalendar} /> 每月</span> :
                                                            <span>-</span>
                                            }
                                        </td>
                                        <td>
                                            <CTooltip content="停止任务">
                                                <CButton color="danger" size="sm" className="me-1" onClick={() => handleStopTask(task.task_id)}>
                                                    <CIcon icon={cilMediaStop} />
                                                </CButton>
                                            </CTooltip>
                                            <CTooltip content="查看详情">
                                                <CButton color="info" size="sm" onClick={() => openTaskDetails(task)}>
                                                    <CIcon icon={cilList} />
                                                </CButton>
                                            </CTooltip>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="text-center">暂无任务</td>
                                </tr>
                            )}
                        </tbody>
                    </CTable>
                </CCardBody>
                <CCardFooter>
                    <small className="text-muted">总计: {taskList.length} 个任务</small>
                </CCardFooter>
            </CCard>

            <CCard>
                <CCardHeader className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">最近任务历史</h5>
                    <CButton color="link" href="/task-history">查看完整历史</CButton>
                </CCardHeader>
                <CCardBody>
                    <CTable striped responsive hover>
                        <thead>
                            <tr>
                                <th>任务名称</th>
                                <th>环境</th>
                                <th>开始时间</th>
                                <th>状态</th>
                                <th>持续时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {taskHistory.length > 0 ? (
                                taskHistory.slice(0, 5).map((task, index) => (
                                    <tr key={index}>
                                        <td>{task.task_name}</td>
                                        <td>{task.conda_env}</td>
                                        <td>{task.start_time}</td>
                                        <td>
                                            {task.status === 'success' ?
                                                <CBadge color="success">成功</CBadge> :
                                                task.status === 'failed' ?
                                                    <CBadge color="danger">失败</CBadge> :
                                                    <CBadge color="secondary">{task.status}</CBadge>
                                            }
                                        </td>
                                        <td>
                                            <CIcon icon={cilClock} className="me-1" />
                                            {task.duration}
                                        </td>
                                        <td>
                                            <CDropdown>
                                                <CDropdownToggle color="light" size="sm">
                                                    <CIcon icon={cilOptions} />
                                                </CDropdownToggle>
                                                <CDropdownMenu>
                                                    <CDropdownItem>查看详情</CDropdownItem>
                                                    <CDropdownItem>重新运行</CDropdownItem>
                                                    <CDropdownItem>导出日志</CDropdownItem>
                                                </CDropdownMenu>
                                            </CDropdown>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center">暂无历史记录</td>
                                </tr>
                            )}
                        </tbody>
                    </CTable>
                </CCardBody>
                <CCardFooter>
                    <small className="text-muted">仅显示最近 5 条记录</small>
                </CCardFooter>
            </CCard>

            {/* 高级选项模态框 */}
            <CModal visible={advancedVisible} onClose={() => setAdvancedVisible(false)}>
                <CModalHeader>
                    <CModalTitle>任务高级选项</CModalTitle>
                </CModalHeader>
                <CModalBody>
                    <div className="mb-3">
                        <CFormLabel>任务优先级</CFormLabel>
                        <CFormSelect>
                            <option value="normal">正常</option>
                            <option value="high">高</option>
                            <option value="low">低</option>
                        </CFormSelect>
                    </div>
                    <div className="mb-3">
                        <CFormLabel>内存限制 (MB)</CFormLabel>
                        <CFormInput type="number" placeholder="不限制请留空" />
                    </div>
                    <div className="mb-3">
                        <CFormLabel>失败重试次数</CFormLabel>
                        <CFormInput type="number" min="0" max="3" defaultValue="0" />
                    </div>
                    <div className="mb-3">
                        <CFormLabel>超时时间 (分钟)</CFormLabel>
                        <CFormInput type="number" min="0" placeholder="0 表示不限制" defaultValue="0" />
                    </div>
                    <div className="mb-3">
                        <CFormLabel>环境变量</CFormLabel>
                        <CFormInput type="text" placeholder="KEY=VALUE,KEY2=VALUE2" />
                    </div>
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" onClick={() => setAdvancedVisible(false)}>
                        取消
                    </CButton>
                    <CButton color="primary" onClick={() => setAdvancedVisible(false)}>
                        确定
                    </CButton>
                </CModalFooter>
            </CModal>

            {/* 任务详情模态框 */}
            <CModal visible={taskDetailsVisible} onClose={() => setTaskDetailsVisible(false)} size="lg">
                <CModalHeader>
                    <CModalTitle>任务详情: {selectedTask?.task_name}</CModalTitle>
                </CModalHeader>
                <CModalBody>
                    {selectedTask && (
                        <>
                            <CRow>
                                <CCol md={6}>
                                    <CCard>
                                        <CCardBody>
                                            <h6>基本信息</h6>
                                            <CListGroup flush>
                                                <CListGroupItem>
                                                    <div className="d-flex justify-content-between">
                                                        <span>任务ID:</span>
                                                        <span>{selectedTask.task_id}</span>
                                                    </div>
                                                </CListGroupItem>
                                                <CListGroupItem>
                                                    <div className="d-flex justify-content-between">
                                                        <span>状态:</span>
                                                        <CBadge color={
                                                            selectedTask.status === 'running' ? 'primary' :
                                                                selectedTask.status === 'success' ? 'success' :
                                                                    selectedTask.status === 'failed' ? 'danger' :
                                                                        'secondary'
                                                        }>
                                                            {selectedTask.status}
                                                        </CBadge>
                                                    </div>
                                                </CListGroupItem>
                                                <CListGroupItem>
                                                    <div className="d-flex justify-content-between">
                                                        <span>Conda环境:</span>
                                                        <span>{selectedTask.conda_env}</span>
                                                    </div>
                                                </CListGroupItem>
                                                <CListGroupItem>
                                                    <div className="d-flex justify-content-between">
                                                        <span>创建时间:</span>
                                                        <span>{new Date(selectedTask.created_at || Date.now()).toLocaleString()}</span>
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
                                                        <span className="text-break">{selectedTask.script}</span>
                                                    </div>
                                                </CListGroupItem>
                                                <CListGroupItem>
                                                    <div className="d-flex justify-content-between">
                                                        <span>任务类型:</span>
                                                        <span>
                                                            {selectedTask.schedule?.type ?
                                                                `${selectedTask.schedule.type} 调度` :
                                                                '立即执行'
                                                            }
                                                        </span>
                                                    </div>
                                                </CListGroupItem>
                                                {selectedTask.schedule?.datetime && (
                                                    <CListGroupItem>
                                                        <div className="d-flex justify-content-between">
                                                            <span>计划执行时间:</span>
                                                            <span>{new Date(selectedTask.schedule.datetime).toLocaleString()}</span>
                                                        </div>
                                                    </CListGroupItem>
                                                )}
                                                <CListGroupItem>
                                                    <div className="d-flex justify-content-between">
                                                        <span>进程ID:</span>
                                                        <span>{selectedTask.pid || '-'}</span>
                                                    </div>
                                                </CListGroupItem>
                                            </CListGroup>
                                        </CCardBody>
                                    </CCard>
                                </CCol>
                            </CRow>

                            {selectedTask.status === 'running' && (
                                <CCard className="mt-3">
                                    <CCardBody>
                                        <h6>实时日志输出</h6>
                                        <div className="bg-dark text-white p-3 mt-2" style={{ height: '200px', overflowY: 'auto', fontFamily: 'monospace' }}>
                                            <p>Starting task {selectedTask.task_name}...</p>
                                            <p>Activating conda environment: {selectedTask.conda_env}</p>
                                            <p>Running script: {selectedTask.script}</p>
                                            <p>...</p>
                                        </div>
                                    </CCardBody>
                                </CCard>
                            )}
                        </>
                    )}
                </CModalBody>
                <CModalFooter>
                    {selectedTask?.status === 'running' && (
                        <CButton color="danger" onClick={() => {
                            handleStopTask(selectedTask.task_id);
                            setTaskDetailsVisible(false);
                        }}>
                            停止任务
                        </CButton>
                    )}
                    <CButton color="secondary" onClick={() => setTaskDetailsVisible(false)}>
                        关闭
                    </CButton>
                </CModalFooter>
            </CModal>
        </div>
    );
};

export default TaskScheduler;