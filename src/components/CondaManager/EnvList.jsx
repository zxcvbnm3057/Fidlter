import React, { useEffect } from 'react';
import {
    CButton,
    CBadge,
    CProgress,
    CSpinner,
    CTooltip
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilTrash, cilPencil, cilInfo, cilPlus, cilReload } from '@coreui/icons';
import { useSelector, useDispatch } from 'react-redux';
import { fetchEnvExtendedInfoRequest } from '../../redux/conda/reducer';
import { DataTable, CardContainer, EmptyState, LoadingSpinner } from '../common';

const EnvList = ({ environments, envStats, loading, onShowDetails, onShowEdit, onDelete, onShowCreateModal }) => {
    const { streamLoading, extendedInfoLoading, extendedInfo } = useSelector(state => state.conda);
    const dispatch = useDispatch();

    // 当环境列表加载完成后，对每个环境异步加载扩展信息
    useEffect(() => {
        if (environments.length > 0) {
            environments.forEach(env => {
                if (env.basic_info_only && !extendedInfo[env.name]) {
                    dispatch(fetchEnvExtendedInfoRequest(env.name));
                }
            });
        }
    }, [environments, dispatch, extendedInfo]);

    // 格式化磁盘使用量显示
    const formatDiskUsage = (usage) => {
        if (usage === null || usage === undefined) return '未知';
        return `${usage.toFixed(2)} GB`;
    };

    // 为特定环境加载扩展信息
    const loadExtendedInfo = (envName) => {
        dispatch(fetchEnvExtendedInfoRequest(envName));
    };

    // 渲染磁盘使用情况单元格
    const renderDiskUsageCell = (env) => {
        if (env.basic_info_only) {
            if (extendedInfoLoading[env.name]) {
                return (
                    <span>
                        <CSpinner size="sm" className="me-1" />
                        加载中...
                    </span>
                );
            } else if (extendedInfo[env.name]) {
                return (
                    <>
                        {formatDiskUsage(extendedInfo[env.name].disk_usage)}
                        {extendedInfo[env.name].is_size_accurate === false && (
                            <CTooltip content="磁盘使用数据可能不准确">
                                <span className="ms-1 text-warning">⚠️</span>
                            </CTooltip>
                        )}
                    </>
                );
            } else {
                return (
                    <div className="d-flex align-items-center">
                        <span className="me-2">未加载</span>
                        <CButton
                            color="light"
                            size="sm"
                            onClick={() => loadExtendedInfo(env.name)}
                            title="加载空间占用信息"
                        >
                            <CIcon icon={cilReload} size="sm" />
                        </CButton>
                    </div>
                );
            }
        } else {
            return (
                <>
                    {formatDiskUsage(env.disk_usage)}
                    {env.is_size_accurate === false && (
                        <CTooltip content="磁盘使用数据可能不准确">
                            <span className="ms-1 text-warning">⚠️</span>
                        </CTooltip>
                    )}
                </>
            );
        }
    };

    // 渲染包数量单元格
    const renderPackageCountCell = (env) => {
        if (env.basic_info_only) {
            if (extendedInfoLoading[env.name]) {
                return <CSpinner size="sm" />;
            } else if (extendedInfo[env.name]) {
                return extendedInfo[env.name].package_count || 0;
            } else {
                return <span>未加载</span>;
            }
        } else {
            return env.package_count || 0;
        }
    };

    // 渲染使用率单元格
    const renderUsageCell = (env) => {
        // 查找环境在统计数据中的使用率
        const usageData = envStats?.environment_usage?.find(item => item.name === env.name);
        const usagePercent = usageData ? usageData.usage_percent : 0;

        return (
            <div className="d-flex align-items-center">
                <div className="me-2" style={{ width: '60%' }}>
                    <CProgress
                        value={usagePercent}
                        color="info"
                        height={8}
                    />
                </div>
                <small>{usagePercent}%</small>
            </div>
        );
    };

    // 渲染操作按钮
    const renderActionButtons = (env) => (
        <>
            <CButton color="info" size="sm" className="me-2" onClick={() => onShowDetails(env)}>
                <CIcon icon={cilInfo} />
            </CButton>
            <CButton color="warning" size="sm" className="me-2" onClick={() => onShowEdit(env)}>
                <CIcon icon={cilPencil} />
            </CButton>
            <CButton color="danger" size="sm" onClick={() => onDelete(env.name)}>
                <CIcon icon={cilTrash} />
            </CButton>
        </>
    );

    // 表格列定义
    const columns = [
        {
            key: 'id',
            title: 'ID',
            dataIndex: 'name',
            render: (_, record, index) => index + 1
        },
        {
            key: 'name',
            title: '环境名称',
            dataIndex: 'name'
        },
        {
            key: 'status',
            title: '状态',
            dataIndex: 'status',
            render: () => <CBadge color="success">活跃</CBadge>
        },
        {
            key: 'python_version',
            title: 'Python版本',
            dataIndex: 'python_version',
            render: (version) => version || '未知'
        },
        {
            key: 'disk_usage',
            title: '磁盘使用',
            dataIndex: 'disk_usage',
            render: (_, record) => renderDiskUsageCell(record)
        },
        {
            key: 'package_count',
            title: '包数量',
            dataIndex: 'package_count',
            render: (_, record) => renderPackageCountCell(record)
        },
        {
            key: 'usage',
            title: '使用率',
            dataIndex: 'name',
            render: (_, record) => renderUsageCell(record)
        },
        {
            key: 'actions',
            title: '操作',
            dataIndex: 'name',
            render: (_, record) => renderActionButtons(record)
        }
    ];

    // 创建按钮
    const createButton = (
        <CButton color="primary" onClick={onShowCreateModal}>
            <CIcon icon={cilPlus} className="me-2" />
            创建新环境
        </CButton>
    );

    // 获取标题区域
    const getHeaderTitle = () => (
        <h5 className="mb-0">
            环境列表
            {streamLoading && (
                <CBadge color="info" className="ms-2">
                    <CSpinner size="sm" className="me-1" />
                    正在加载环境数据...
                </CBadge>
            )}
        </h5>
    );

    return (
        <CardContainer
            title={getHeaderTitle()}
            headerActions={createButton}
        >
            <DataTable
                columns={columns}
                data={environments}
                loading={loading}
                emptyText={
                    <EmptyState
                        icon="🌎"
                        title="暂无环境数据"
                        description="当前没有可用的Conda环境"
                    />
                }
                rowKey="name"
            />
        </CardContainer>
    );
};

export default EnvList;