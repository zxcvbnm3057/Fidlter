import React, { useState, useEffect } from 'react';
import {
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
    CButton,
    CFormInput,
    CAlert
} from '@coreui/react';

// 安装包模态框
export const InstallPackagesModal = ({
    visible,
    onClose,
    env,
    newPackages,
    onNewPackagesChange,
    onInstall
}) => {
    // 验证状态
    const [packageErrors, setPackageErrors] = useState([]);
    const [isValid, setIsValid] = useState(true);

    // 包名格式验证正则表达式
    // 格式：包名[操作符版本号][;额外参数]
    // 包名：必须以字母或下划线开头，可包含字母、数字、下划线、点和连字符
    // 操作符：==, >=, <=, >, <, ~=, !=, ===
    // 版本号：数字、点、星号等组成的版本字符串
    const packageRegex = /^([A-Za-z_][A-Za-z0-9_.-]*)\s*(==|>=|<=|>|<|~=|!=|===)?\s*([A-Za-z0-9_.+*-]+)?(;\s*.*)?$/;

    // 在包列表变化时进行验证
    useEffect(() => {
        if (!newPackages.trim()) {
            setPackageErrors([]);
            setIsValid(true);
            return;
        }

        // 解析包列表（仅按行分隔，不再支持逗号分隔）
        const packagesList = newPackages
            .split(/\n+/)
            .map(pkg => pkg.trim())
            .filter(pkg => pkg);

        const errors = [];

        // 检查是否存在多个包名在一行的情况（使用逗号分隔）
        const commaErrors = packagesList.filter(pkg => pkg.includes(','));
        if (commaErrors.length > 0) {
            commaErrors.forEach(pkg => {
                errors.push({
                    package: pkg,
                    message: '不允许在一行中包含多个包（使用逗号分隔），请每行只输入一个包',
                });
            });
        }

        // 验证每个包名的格式
        packagesList.forEach((pkg, index) => {
            // 跳过已经报告为逗号错误的行
            if (pkg.includes(',')) return;

            if (!packageRegex.test(pkg)) {
                errors.push({
                    index,
                    package: pkg,
                    message: `格式不正确: "${pkg}"`
                });
            }
        });

        setPackageErrors(errors);
        setIsValid(errors.length === 0);
    }, [newPackages]);

    // 安装包的处理函数
    const handleInstall = () => {
        // 只有在无错误且包列表不为空时才允许安装
        if (isValid && newPackages.trim()) {
            onInstall();
        }
    };

    return (
        <CModal visible={visible} onClose={onClose}>
            <CModalHeader onClose={onClose}>
                <CModalTitle>安装包: {env?.name}</CModalTitle>
            </CModalHeader>
            <CModalBody>
                <div className="mb-3">
                    <label className="form-label">要安装的包列表 (每行一个包)</label>
                    <CFormInput
                        as="textarea"
                        rows={5}
                        value={newPackages}
                        onChange={(e) => onNewPackagesChange(e.target.value)}
                        placeholder="numpy&#10;pandas==1.5.0&#10;tensorflow>=2.0"
                        className={packageErrors.length > 0 ? 'is-invalid' : ''}
                    />
                    <small className="text-muted">每行只能输入一个包，可以指定版本，例如 numpy==1.20.0 或 pandas>=1.3.0</small>

                    {packageErrors.length > 0 && (
                        <CAlert color="danger" className="mt-2">
                            <div><strong>格式错误:</strong></div>
                            {packageErrors.map((error, idx) => (
                                <div key={idx}>
                                    <strong>{error.package}</strong>: {error.message}
                                </div>
                            ))}
                        </CAlert>
                    )}
                </div>
            </CModalBody>
            <CModalFooter>
                <CButton color="secondary" onClick={onClose}>
                    取消
                </CButton>
                <CButton
                    color="primary"
                    onClick={handleInstall}
                    disabled={!isValid || !newPackages.trim()}
                >
                    安装
                </CButton>
            </CModalFooter>
        </CModal>
    );
};

// 删除包模态框
export const RemovePackagesModal = ({
    visible,
    onClose,
    env,
    envDetails,
    selectedPackages,
    onSelectedPackagesChange,
    onRemove
}) => {
    return (
        <CModal visible={visible} onClose={onClose}>
            <CModalHeader onClose={onClose}>
                <CModalTitle>删除包: {env?.name}</CModalTitle>
            </CModalHeader>
            <CModalBody>
                <div className="mb-3">
                    <label className="form-label">选择要删除的包</label>
                    <div className="border p-3 rounded" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {envDetails?.packages?.length > 0 ? (
                            envDetails.packages.map((pkg, index) => (
                                <div className="form-check" key={index}>
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id={`pkg-${index}`}
                                        value={pkg.name}
                                        checked={selectedPackages.includes(pkg.name)}
                                        onChange={(e) => {
                                            const name = pkg.name;
                                            if (e.target.checked) {
                                                onSelectedPackagesChange([...selectedPackages, name]);
                                            } else {
                                                onSelectedPackagesChange(selectedPackages.filter(p => p !== name));
                                            }
                                        }}
                                    />
                                    <label className="form-check-label" htmlFor={`pkg-${index}`}>
                                        {pkg.name} ({pkg.version})
                                    </label>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-muted">该环境中没有可删除的包</p>
                        )}
                    </div>
                    {selectedPackages.length > 0 && (
                        <div className="mt-2">
                            <small className="text-primary">已选择 {selectedPackages.length} 个包</small>
                        </div>
                    )}
                </div>
            </CModalBody>
            <CModalFooter>
                <CButton color="secondary" onClick={onClose}>
                    取消
                </CButton>
                <CButton
                    color="danger"
                    onClick={onRemove}
                    disabled={selectedPackages.length === 0}
                >
                    删除
                </CButton>
            </CModalFooter>
        </CModal>
    );
};