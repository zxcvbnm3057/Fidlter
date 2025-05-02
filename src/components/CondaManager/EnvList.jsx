import React from 'react';
import {
    CTable,
    CCard,
    CCardBody,
    CCardHeader,
    CButton,
    CBadge,
    CProgress,
    CSpinner
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilTrash, cilPencil, cilInfo, cilPlus } from '@coreui/icons';

const EnvList = ({ environments, envStats, loading, onShowDetails, onShowEdit, onDelete, onShowCreateModal }) => {
    return (
        <CCard>
            <CCardHeader className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">环境列表</h5>
                <CButton color="primary" onClick={onShowCreateModal}>
                    <CIcon icon={cilPlus} className="me-2" />
                    创建新环境
                </CButton>
            </CCardHeader>
            <CCardBody>
                <CTable striped hover responsive>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>环境名称</th>
                            <th>状态</th>
                            <th>Python版本</th>
                            <th>使用率</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {environments.length > 0 ? (
                            environments.map((env) => {
                                // 查找环境在统计数据中的使用率
                                const usageData = envStats?.environment_usage?.find(item => item.name === env.name);
                                const usagePercent = usageData ? usageData.usage_percent : 0;

                                return (
                                    <tr key={env.name}>
                                        <td>{environments.indexOf(env) + 1}</td>
                                        <td>{env.name}</td>
                                        <td>
                                            <CBadge color="success">活跃</CBadge>
                                        </td>
                                        <td>{env.python_version || '未知'}</td>
                                        <td>
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
                                        </td>
                                        <td>
                                            <CButton color="info" size="sm" className="me-2" onClick={() => onShowDetails(env)}>
                                                <CIcon icon={cilInfo} />
                                            </CButton>
                                            <CButton color="warning" size="sm" className="me-2" onClick={() => onShowEdit(env)}>
                                                <CIcon icon={cilPencil} />
                                            </CButton>
                                            <CButton color="danger" size="sm" onClick={() => onDelete(env.name)}>
                                                <CIcon icon={cilTrash} />
                                            </CButton>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center">
                                    {loading ? <CSpinner size="sm" /> : '暂无环境数据'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </CTable>
            </CCardBody>
        </CCard>
    );
};

export default EnvList;