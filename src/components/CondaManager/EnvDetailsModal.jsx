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
    CRow,
    CCol,
    CTable,
    CSpinner
} from '@coreui/react';

const EnvDetailsModal = ({
    visible,
    onClose,
    env,
    envDetails,
    onShowInstallPackages,
    onShowRemovePackages
}) => {
    return (
        <CModal visible={visible} onClose={onClose} size="lg">
            <CModalHeader onClose={onClose}>
                <CModalTitle>环境详情: {env?.name}</CModalTitle>
            </CModalHeader>
            <CModalBody>
                {env && envDetails && (
                    <CCard>
                        <CCardBody>
                            <CRow>
                                <CCol md={6}>
                                    <h6>基本信息</h6>
                                    <p><strong>环境名称:</strong> {envDetails.name}</p>
                                    <p><strong>Python版本:</strong> {envDetails.python_version || '未知'}</p>
                                    <p><strong>创建日期:</strong> {envDetails.created_at || '未知'}</p>
                                </CCol>
                                <CCol md={6}>
                                    <h6>使用统计</h6>
                                    <p><strong>总任务数:</strong> {envDetails.usage_stats?.total_tasks || 0}</p>
                                    <p><strong>成功率:</strong> {envDetails.usage_stats?.success_rate || 0}%</p>
                                    <p><strong>平均执行时间:</strong> {envDetails.usage_stats?.avg_execution_time || 0}秒</p>
                                    <p><strong>磁盘占用:</strong> {envDetails.usage_stats?.disk_usage || 0} GB</p>
                                </CCol>
                            </CRow>
                            <h6 className="mt-4">已安装的主要包</h6>
                            <CTable small bordered>
                                <thead>
                                    <tr>
                                        <th>包名</th>
                                        <th>版本</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {envDetails.packages && envDetails.packages.length > 0 ? (
                                        envDetails.packages.map((pkg, index) => (
                                            <tr key={index}>
                                                <td>{pkg.name}</td>
                                                <td>{pkg.version}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="2" className="text-center">暂无包信息</td>
                                        </tr>
                                    )}
                                </tbody>
                            </CTable>
                        </CCardBody>
                    </CCard>
                )}
                {env && !envDetails && (
                    <div className="text-center mt-3 mb-3">
                        <CSpinner color="primary" />
                        <p className="mt-2">正在加载环境详情...</p>
                    </div>
                )}
            </CModalBody>
            <CModalFooter>
                <CButton color="primary" onClick={() => onShowInstallPackages(env)}>
                    安装包
                </CButton>
                <CButton
                    color="warning"
                    onClick={() => onShowRemovePackages({
                        env: env,
                        packages: envDetails?.packages?.map(pkg => pkg.name) || []
                    })}
                >
                    删除包
                </CButton>
                <CButton color="secondary" onClick={onClose}>
                    关闭
                </CButton>
            </CModalFooter>
        </CModal>
    );
};

export default EnvDetailsModal;