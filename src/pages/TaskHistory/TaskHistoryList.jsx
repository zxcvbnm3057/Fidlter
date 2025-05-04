import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CCard,
    CCardBody,
    CCardHeader,
    CBadge,
    CButton,
    CTooltip
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilFilter, cilInfo, cilList } from '@coreui/icons';
import { DataTable, EmptyState, TableFilterBar } from '../../components/common';

// 定义状态优先级，用于排序，与任务列表保持一致
const STATUS_PRIORITY = {
    'running': 1,
    'scheduled': 2,
    'paused': 3,
    'stopped': 4,
    'success': 5,
    'completed': 5, // 和success同优先级
    'failed': 6
};

// 状态选项
const STATUS_OPTIONS = [
    { value: 'all', label: '所有状态' },
    { value: 'running', label: '运行中' },
    { value: 'scheduled', label: '已计划' },
    { value: 'success', label: '成功' },
    { value: 'failed', label: '失败' },
    { value: 'paused', label: '已暂停' },
    { value: 'stopped', label: '已停止' },
    { value: 'abnormal', label: '异常任务' }
];

const TaskHistoryList = ({ taskHistory, onFilter, currentFilter = 'all' }) => {
    const navigate = useNavigate();
    const [searchText, setSearchText] = useState('');
    const [condaEnvFilter, setCondaEnvFilter] = useState('all');
    const [sortField, setSortField] = useState('start_time');
    const [sortDirection, setSortDirection] = useState('desc');

    // 获取唯一的Conda环境列表
    const condaEnvironments = useMemo(() => {
        if (!Array.isArray(taskHistory)) return [];
        const envs = new Set(taskHistory.map(task => task.conda_env).filter(Boolean));
        return ['all', ...Array.from(envs)];
    }, [taskHistory]);

    // 转换Conda环境列表为选项格式
    const condaEnvOptions = useMemo(() => {
        return condaEnvironments.map(env => ({
            value: env,
            label: env === 'all' ? '所有环境' : env
        }));
    }, [condaEnvironments]);

    // 处理行点击事件，跳转到任务详情页
    const handleRowClick = (task) => {
        navigate(`/task-detail/${task.task_id}`);
    };

    // 处理排序
    const handleSort = (field, direction) => {
        setSortField(field);
        setSortDirection(direction);
    };

    // 清除所有筛选条件
    const clearAllFilters = () => {
        setSearchText('');
        setCondaEnvFilter('all');
        onFilter('all');
    };

    // 获取状态显示徽章，保持与任务列表一致的样式
    const getStatusBadge = (status) => {
        switch (status) {
            case 'running':
                return <CBadge color="primary">运行中</CBadge>;
            case 'success':
            case 'completed':
                return <CBadge color="success">成功</CBadge>;
            case 'failed':
                return <CBadge color="danger">失败</CBadge>;
            case 'scheduled':
                return <CBadge color="warning">已计划</CBadge>;
            case 'paused':
                return <CBadge color="info">已暂停</CBadge>;
            case 'stopped':
                return <CBadge color="dark">已停止</CBadge>;
            default:
                return <CBadge color="light" className="text-dark">{status}</CBadge>;
        }
    };

    // 格式化日期时间
    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString();
    };

    // 过滤和排序数据
    const filteredData = useMemo(() => {
        if (!Array.isArray(taskHistory)) return [];

        // 先过滤数据
        let result = taskHistory.filter(task => {
            // 根据状态筛选
            if (currentFilter !== 'all') {
                if (currentFilter === 'abnormal') {
                    // 异常任务：非成功、失败、运行中的任务
                    if (task.status === 'success' || task.status === 'failed' || task.status === 'running') {
                        return false;
                    }
                } else if (task.status !== currentFilter) {
                    return false;
                }
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
                (task.status && getStatusText(task.status).includes(searchText.toLowerCase()))
            )) {
                return false;
            }

            return true;
        });

        // 然后排序
        if (sortField) {
            result = [...result].sort((a, b) => {
                let valueA = a[sortField];
                let valueB = b[sortField];

                // 状态字段的特殊排序
                if (sortField === 'status') {
                    valueA = STATUS_PRIORITY[valueA] || 999;
                    valueB = STATUS_PRIORITY[valueB] || 999;
                }

                // 处理日期时间字段的排序
                if (sortField === 'start_time' || sortField === 'end_time' || sortField === 'created_at') {
                    valueA = valueA ? new Date(valueA).getTime() : 0;
                    valueB = valueB ? new Date(valueB).getTime() : 0;
                }

                // 数值比较
                if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
                if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [taskHistory, currentFilter, condaEnvFilter, searchText, sortField, sortDirection]);

    // 获取状态文本（用于搜索匹配）
    const getStatusText = (status) => {
        switch (status) {
            case 'running': return '运行中';
            case 'success':
            case 'completed': return '成功';
            case 'failed': return '失败';
            case 'scheduled': return '已计划';
            case 'paused': return '已暂停';
            case 'stopped': return '已停止';
            default: return status;
        }
    };

    // 表格列配置
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
            render: (text) => (
                <span className="text-primary fw-bold">
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
            key: 'start_time',
            title: '开始时间',
            dataIndex: 'start_time',
            sortable: true,
            render: (text) => formatDateTime(text)
        },
        {
            key: 'end_time',
            title: '结束时间',
            dataIndex: 'end_time',
            sortable: true,
            render: (text) => formatDateTime(text)
        },
        {
            key: 'status',
            title: '状态',
            dataIndex: 'status',
            sortable: true,
            render: (status) => getStatusBadge(status)
        },
        {
            key: 'duration',
            title: '执行时长',
            dataIndex: 'duration'
        },
        {
            key: 'actions',
            title: '操作',
            render: (_, record) => (
                <div className="d-flex">
                    <CTooltip content="查看详情">
                        <CButton
                            color="primary"
                            size="sm"
                            className="me-1"
                            onClick={() => navigate(`/task-detail/${record.task_id}`)}
                        >
                            <CIcon icon={cilInfo} />
                        </CButton>
                    </CTooltip>

                    <CTooltip content="查看日志">
                        <CButton
                            color="info"
                            size="sm"
                            onClick={() => navigate(`/task-detail/${record.task_id}?showLogs=true&executionId=${record.execution_id}`)}
                        >
                            <CIcon icon={cilList} />
                        </CButton>
                    </CTooltip>
                </div>
            ),
            width: '120px'
        }
    ];

    // 是否有激活的过滤器
    const hasActiveFilters = currentFilter !== 'all' || searchText !== '' || condaEnvFilter !== 'all';

    // 空数据显示
    const emptyContent = (
        <EmptyState
            icon="📋"
            title="暂无历史记录"
            description={hasActiveFilters
                ? "没有符合筛选条件的历史记录，尝试调整筛选条件"
                : "暂无任务执行历史记录"}
        />
    );

    return (
        <CCard className="shadow-sm">
            <CCardHeader className="bg-light d-flex justify-content-between align-items-center">
                <h5 className="mb-0">历史任务列表</h5>
                <div className="d-flex align-items-center">
                    {hasActiveFilters && (
                        <CButton
                            color="link"
                            className="p-0 text-decoration-none me-3"
                            onClick={clearAllFilters}
                        >
                            <CIcon icon={cilFilter} className="me-1" />
                            {filteredData.length} / {taskHistory.length}
                        </CButton>
                    )}
                </div>
            </CCardHeader>
            <CCardBody>
                {/* 使用公共表格筛选组件 */}
                <TableFilterBar
                    searchText={searchText}
                    onSearchChange={setSearchText}
                    currentStatusFilter={currentFilter}
                    onStatusFilterChange={onFilter}
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
                    emptyText={emptyContent}
                    rowKey="task_id"
                    className="border-top"
                />

                <div className="d-flex justify-content-between align-items-center mt-3">
                    <small className="text-muted">
                        显示 {filteredData.length} 条记录 {taskHistory && taskHistory.length > 0 ? `(共 ${taskHistory.length} 条)` : ''}
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

export default TaskHistoryList;