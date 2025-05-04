import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CTooltip,
    CBadge,
    CButton,
    CCard,
    CCardHeader,
    CCardBody
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
    cilMediaStop,
    cilList,
    cilMediaPause,
    cilMediaPlay,
    cilFilter,
    cilFilterX
} from '@coreui/icons';
import { DataTable, EmptyState, TableFilterBar } from '../common';

// 定义状态优先级，用于排序
const STATUS_PRIORITY = {
    'running': 1,
    'scheduled': 2,
    'paused': 3,
    'stopped': 4,   // 将disabled改为stopped
    'completed': 5,
    'success': 5, // 和completed同优先级
    'failed': 6
};

// 状态过滤选项
const STATUS_OPTIONS = [
    { value: 'all', label: '所有状态' },
    { value: 'running', label: '运行中' },
    { value: 'scheduled', label: '已调度' },
    { value: 'completed', label: '已完成' },
    { value: 'failed', label: '失败' },
    { value: 'paused', label: '已暂停' },
    { value: 'stopped', label: '已停止' }
];

const TaskList = ({
    taskList,
    onStopTask,
    onPauseTask,
    onResumeTask,
    onTriggerTask,
    initialFilterStatus = 'all',
    onFilterChange
}) => {
    const navigate = useNavigate();
    const [sortField, setSortField] = useState('task_id');
    const [sortDirection, setSortDirection] = useState('desc'); // 默认降序排列，最新任务在前
    const [filterStatus, setFilterStatus] = useState(initialFilterStatus);
    const [searchText, setSearchText] = useState('');
    const [condaEnvFilter, setCondaEnvFilter] = useState('all');

    // 当外部传入的过滤条件变化时更新内部状态
    useEffect(() => {
        if (initialFilterStatus !== filterStatus) {
            setFilterStatus(initialFilterStatus);
        }
    }, [initialFilterStatus]);

    // 处理内部过滤状态变更，同时通知父组件
    const handleFilterStatusChange = (status) => {
        setFilterStatus(status);
        if (onFilterChange) {
            onFilterChange(status);
        }
    };

    // 跳转到任务详情页
    const goToTaskDetail = (taskId, showLogs = false) => {
        navigate(`/task-detail/${taskId}${showLogs ? '?showLogs=true' : ''}`);
    };

    // 处理排序
    const handleSort = (field, direction) => {
        setSortField(field);
        setSortDirection(direction);
    };

    // 处理表格行点击
    const handleRowClick = (record) => {
        goToTaskDetail(record.task_id);
    };

    // 获取唯一的Conda环境列表，用于过滤
    const condaEnvironments = useMemo(() => {
        if (!Array.isArray(taskList)) return [];
        const envs = new Set(taskList.map(task => task.conda_env).filter(Boolean));
        return ['all', ...Array.from(envs)];
    }, [taskList]);

    // 转换Conda环境列表为选项格式
    const condaEnvOptions = useMemo(() => {
        return condaEnvironments.map(env => ({
            value: env,
            label: env === 'all' ? '所有环境' : env
        }));
    }, [condaEnvironments]);

    // 获取任务状态显示徽章
    const getStatusBadge = (status) => {
        switch (status) {
            case 'running':
                return <CBadge color="primary">运行中</CBadge>;
            case 'completed':
            case 'success':
                return <CBadge color="success">已完成</CBadge>;
            case 'failed':
                return <CBadge color="danger">失败</CBadge>;
            case 'scheduled':
                return <CBadge color="warning">已调度</CBadge>;
            case 'paused':
                return <CBadge color="info">已暂停</CBadge>;
            case 'stopped':
                return <CBadge color="dark">已停止</CBadge>;
            default:
                return <CBadge color="light">{status}</CBadge>;
        }
    };

    // 获取状态文本（用于鼠标悬停提示）
    const getStatusText = (status) => {
        switch (status) {
            case 'running':
                return '运行中';
            case 'completed':
            case 'success':
                return '已完成';
            case 'failed':
                return '失败';
            case 'scheduled':
                return '已调度';
            case 'paused':
                return '已暂停';
            case 'stopped':
                return '已停止';
            default:
                return status;
        }
    };

    // 获取操作按钮
    const getActionButtons = (task) => (
        <div className="d-flex">
            {/* 手动触发按钮 - 对不可触发的任务禁用 */}
            <CTooltip content="手动触发任务">
                <span className="d-inline-block me-1">
                    <CButton
                        color="success"
                        size="sm"
                        disabled={task.status === 'running' || !onTriggerTask}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (typeof onTriggerTask === 'function') {
                                onTriggerTask(task.task_id);
                            } else {
                                console.error('onTriggerTask is not a function');
                                alert('触发任务功能暂时不可用，请刷新页面重试');
                            }
                        }}
                    >
                        <CIcon icon={cilMediaPlay} />
                    </CButton>
                </span>
            </CTooltip>

            {/* 暂停按钮 - 仅在任务运行时可用，其他状态显示但禁用 */}
            <CTooltip content="暂停任务">
                <span className="d-inline-block me-1">
                    <CButton
                        color="info"
                        size="sm"
                        disabled={task.status !== 'running'}
                        onClick={(e) => {
                            e.stopPropagation();
                            onPauseTask(task.task_id);
                        }}
                        style={{ display: task.status === 'paused' ? 'none' : 'inline-block' }}
                    >
                        <CIcon icon={cilMediaPause} />
                    </CButton>
                </span>
            </CTooltip>

            {/* 继续按钮 - 仅在任务暂停时可用，其他状态显示但禁用 */}
            <CTooltip content="继续任务">
                <span className="d-inline-block me-1">
                    <CButton
                        color="info"
                        size="sm"
                        disabled={task.status !== 'paused'}
                        onClick={(e) => {
                            e.stopPropagation();
                            onResumeTask(task.task_id);
                        }}
                        style={{ display: task.status !== 'paused' ? 'none' : 'inline-block' }}
                    >
                        <CIcon icon={cilMediaPlay} />
                    </CButton>
                </span>
            </CTooltip>

            {/* 停止按钮 - 对已停止的任务禁用 */}
            <CTooltip content="停止任务">
                <span className="d-inline-block me-1">
                    <CButton
                        color="danger"
                        size="sm"
                        disabled={task.status === 'stopped' || task.status === 'completed' || task.status === 'failed'}
                        onClick={(e) => {
                            e.stopPropagation();
                            onStopTask(task.task_id);
                        }}
                    >
                        <CIcon icon={cilMediaStop} />
                    </CButton>
                </span>
            </CTooltip>

            {/* 详情按钮 - 始终可用 */}
            <CTooltip content="查看详情">
                <CButton
                    color="secondary"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        goToTaskDetail(task.task_id);
                    }}
                >
                    <CIcon icon={cilList} />
                </CButton>
            </CTooltip>
        </div>
    );

    // 配置DataTable的列
    const columns = [
        {
            key: 'task_id',
            title: '任务ID',
            dataIndex: 'task_id',
            sortable: true,
            width: '80px'
        },
        {
            key: 'task_name',
            title: '任务名称',
            dataIndex: 'task_name',
            sortable: true,
            render: (text, record) => (
                <span
                    className="text-primary fw-bold"
                    style={{ cursor: 'pointer' }}
                >
                    {text}
                </span>
            )
        },
        {
            key: 'conda_env',
            title: 'Conda环境',
            dataIndex: 'conda_env',
            render: (text) => (
                <CBadge color="light" className="text-dark">{text}</CBadge>
            )
        },
        {
            key: 'created_at',
            title: '创建时间',
            dataIndex: 'created_at',
            sortable: true,
            render: (text) => new Date(text || Date.now()).toLocaleString()
        },
        {
            key: 'status',
            title: '状态',
            dataIndex: 'status',
            sortable: true, // 添加排序功能
            render: (status) => getStatusBadge(status),
            sorter: (a, b) => {
                // 按状态优先级排序
                const priorityA = STATUS_PRIORITY[a.status] || 999;
                const priorityB = STATUS_PRIORITY[b.status] || 999;
                return priorityA - priorityB;
            }
        },
        {
            key: 'schedule_type',
            title: '调度类型',
            dataIndex: 'cron_expression',
            render: (value) => value ? <span>定时调度</span> : <span>一次性</span>
        },
        {
            key: 'actions',
            title: '操作',
            dataIndex: 'task_id',
            render: (_, record) => getActionButtons(record),
            width: '150px'
        }
    ];

    // 处理数据过滤和排序
    const filteredData = useMemo(() => {
        if (!Array.isArray(taskList)) return [];

        // 先过滤数据
        let result = taskList.filter(task => {
            // 根据状态筛选
            if (filterStatus !== 'all' && task.status !== filterStatus) {
                return false;
            }

            // 根据环境筛选
            if (condaEnvFilter !== 'all' && task.conda_env !== condaEnvFilter) {
                return false;
            }

            // 根据搜索文本筛选
            if (searchText && !(
                task.task_name?.toLowerCase().includes(searchText.toLowerCase()) ||
                task.conda_env?.toLowerCase().includes(searchText.toLowerCase()) ||
                String(task.task_id).includes(searchText) ||
                getStatusText(task.status).includes(searchText.toLowerCase()) // 添加对状态文本的搜索
            )) {
                return false;
            }

            return true;
        });

        // 然后对数据进行排序
        if (sortField) {
            result = [...result].sort((a, b) => {
                let valueA = a[sortField];
                let valueB = b[sortField];

                // 特殊处理状态字段排序
                if (sortField === 'status') {
                    valueA = STATUS_PRIORITY[valueA] || 999;
                    valueB = STATUS_PRIORITY[valueB] || 999;
                }

                // 日期类型排序
                if (sortField === 'created_at') {
                    valueA = new Date(valueA || 0).getTime();
                    valueB = new Date(valueB || 0).getTime();
                }

                if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
                if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [taskList, filterStatus, searchText, condaEnvFilter, sortField, sortDirection]);

    // 清除所有过滤器
    const clearAllFilters = () => {
        setSearchText('');
        handleFilterStatusChange('all');
        setCondaEnvFilter('all');
    };

    // 是否有激活的过滤器
    const hasActiveFilters = filterStatus !== 'all' || searchText !== '' || condaEnvFilter !== 'all';

    return (
        <CCard className="mb-4 shadow-sm">
            <CCardHeader className="bg-light d-flex justify-content-between align-items-center">
                <h5 className="mb-0">任务列表</h5>
                <div className="d-flex align-items-center">
                    {hasActiveFilters && (
                        <CButton
                            color="link"
                            className="p-0 text-decoration-none me-3"
                            onClick={clearAllFilters}
                        >
                            <CIcon icon={cilFilterX} className="me-1" />
                            清除过滤器
                        </CButton>
                    )}
                </div>
            </CCardHeader>
            <CCardBody>
                {/* 使用公共表格筛选组件 */}
                <TableFilterBar
                    searchText={searchText}
                    onSearchChange={setSearchText}
                    currentStatusFilter={filterStatus}
                    onStatusFilterChange={handleFilterStatusChange}
                    statusOptions={STATUS_OPTIONS}
                    condaEnvFilter={condaEnvFilter}
                    onCondaEnvFilterChange={setCondaEnvFilter}
                    condaEnvOptions={condaEnvOptions}
                    onClearFilters={clearAllFilters}
                    hasActiveFilters={hasActiveFilters}
                />

                <DataTable
                    columns={columns}
                    data={filteredData}
                    sortable={true}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    onRowClick={handleRowClick}
                    rowClassName={() => "cursor-pointer hover-highlight"}
                    emptyText={
                        <EmptyState
                            icon="📋"
                            title="暂无任务"
                            description={hasActiveFilters ?
                                "没有符合筛选条件的任务，尝试调整筛选条件" :
                                "当前没有任务，可以通过上方表单创建新任务"}
                        />
                    }
                    rowKey="task_id"
                    className="border-top"
                />

                {/* 页脚统计信息 */}
                <div className="d-flex justify-content-between align-items-center mt-3">
                    <small className="text-muted">
                        显示 {filteredData.length} 个任务 {taskList && taskList.length > 0 ? `(共 ${taskList.length} 个)` : ''}
                    </small>
                    {hasActiveFilters && (
                        <small className="text-primary">
                            <CIcon icon={cilFilter} className="me-1" size="sm" />
                            过滤器已启用
                        </small>
                    )}
                </div>
            </CCardBody>
        </CCard>
    );
};

export default TaskList;