import React, { useState, useEffect, useRef } from 'react';
import {
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
    CButton,
    CAlert,
    CSpinner
} from '@coreui/react';
import { FormGroup } from '../common';

const CreateEnvModal = ({
    visible,
    onClose,
    envName,
    onEnvNameChange,
    pythonVersion,
    onPythonVersionChange,
    initialPackages,
    onInitialPackagesChange,
    onCreate,
    pythonVersionOptions = [],
    pythonVersionsLoading = false,
    pythonVersionSource = null,
    onFetchPythonVersions
}) => {
    // 验证状态
    const [packageErrors, setPackageErrors] = useState([]);
    const [isValid, setIsValid] = useState(true);
    const [touchedFields, setTouchedFields] = useState({
        envName: false,
        packages: false
    });

    // 用于跟踪Python版本是否已经加载的引用
    const versionsLoadedRef = useRef(false);

    // 默认Python版本选项（当API获取失败时使用）
    const defaultPythonVersionOptions = [
        { value: '3.6', label: 'Python 3.6' },
        { value: '3.7', label: 'Python 3.7' },
        { value: '3.8', label: 'Python 3.8' },
        { value: '3.9', label: 'Python 3.9' },
        { value: '3.10', label: 'Python 3.10' },
        { value: '3.11', label: 'Python 3.11' },
        { value: '3.12', label: 'Python 3.12' },
    ];

    // 获取Python版本列表，使用useRef跟踪加载状态，避免重复请求
    useEffect(() => {
        if (visible && onFetchPythonVersions && !versionsLoadedRef.current) {
            onFetchPythonVersions();
            versionsLoadedRef.current = true;
        }

        // 当模态框关闭时重置加载状态，这样下次打开会重新获取最新数据
        if (!visible) {
            versionsLoadedRef.current = false;
        }
    }, [visible, onFetchPythonVersions]);

    // 实际使用的Python版本选项
    const actualPythonVersionOptions = pythonVersionOptions.length > 0
        ? pythonVersionOptions.map(version => ({ value: version, label: `Python ${version}` }))
        : defaultPythonVersionOptions;

    // 包名格式验证正则表达式
    // 格式：包名[操作符版本号][;额外参数]
    // 包名：必须以字母或下划线开头，可包含字母、数字、下划线、点和连字符
    // 操作符：==, >=, <=, >, <, ~=, !=, ===
    // 版本号：数字、点、星号等组成的版本字符串
    const packageRegex = /^([A-Za-z_][A-Za-z0-9_.-]*)\s*(==|>=|<=|>|<|~=|!=|===)?\s*([A-Za-z0-9_.+*-]+)?(;\s*.*)?$/;

    // 在包列表变化时进行验证
    useEffect(() => {
        if (!initialPackages.trim()) {
            setPackageErrors([]);
            setIsValid(true);
            return;
        }

        // 解析包列表（仅按行分隔，不再支持逗号分隔）
        const packagesList = initialPackages
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
                    message: `格式不正确: "${pkg}"`,
                });
            }
        });

        setPackageErrors(errors);
        setIsValid(errors.length === 0);
    }, [initialPackages]);

    // 创建环境的处理函数
    const handleCreate = () => {
        // 设置所有字段为已触碰，以显示验证消息
        setTouchedFields({
            envName: true,
            packages: true
        });

        // 只有在无错误且环境名不为空时才允许创建
        if (isValid && envName.trim()) {
            onCreate();
        }
    };

    // 环境名验证
    const getEnvNameError = () => {
        if (!envName.trim()) {
            return '环境名称不能为空';
        }
        return null;
    };

    // 渲染包错误信息
    const renderPackageErrors = () => {
        if (packageErrors.length === 0 || !touchedFields.packages) return null;

        return (
            <CAlert color="danger" className="mt-2">
                {packageErrors.map((error, idx) => (
                    <div key={idx}>
                        <strong>{error.package}</strong>: {error.message}
                    </div>
                ))}
            </CAlert>
        );
    };

    // 渲染Python版本源信息
    const renderPythonVersionSourceInfo = () => {
        if (!pythonVersionSource) return null;

        return (
            <div className="mt-1">
                <small className={`text-${pythonVersionSource === 'conda' ? 'success' : pythonVersionSource === 'fallback' ? 'warning' : 'muted'}`}>
                    {pythonVersionSource === 'conda' && '✓ 已从Conda官网获取最新版本列表'}
                    {pythonVersionSource === 'fallback' && '⚠️ 使用预定义版本列表（无法连接Conda官网）'}
                    {pythonVersionSource === 'client-fallback' && '⚠️ 使用预定义版本列表（服务器连接失败）'}
                </small>
            </div>
        );
    };

    return (
        <CModal visible={visible} onClose={onClose}>
            <CModalHeader onClose={onClose}>
                <CModalTitle>创建新Conda环境</CModalTitle>
            </CModalHeader>
            <CModalBody>
                <FormGroup
                    label="环境名称"
                    type="text"
                    value={envName}
                    onChange={(e) => onEnvNameChange(e.target.value)}
                    onBlur={() => setTouchedFields({ ...touchedFields, envName: true })}
                    error={getEnvNameError()}
                    touched={touchedFields.envName}
                    placeholder="输入环境名称"
                    required={true}
                    wrapperCols={12}
                />

                {pythonVersionsLoading ? (
                    <div className="mb-3">
                        <div className="d-flex align-items-center">
                            <CSpinner size="sm" className="me-2" />
                            <span className="text-muted">正在获取可用版本...</span>
                        </div>
                    </div>
                ) : (
                    <FormGroup
                        label="Python版本"
                        type="select"
                        value={pythonVersion}
                        onChange={(e) => onPythonVersionChange(e.target.value)}
                        options={actualPythonVersionOptions}
                        wrapperCols={12}
                        helpText={renderPythonVersionSourceInfo()}
                    />
                )}

                <FormGroup
                    label="初始包列表 (每行一个包)"
                    type="textarea"
                    value={initialPackages}
                    onChange={(e) => onInitialPackagesChange(e.target.value)}
                    onBlur={() => setTouchedFields({ ...touchedFields, packages: true })}
                    error={packageErrors.length > 0 ? '包格式有误，请查看下方详细信息' : null}
                    touched={touchedFields.packages}
                    placeholder="numpy&#10;pandas==1.5.0&#10;tensorflow>=2.0"
                    rows={5}
                    helpText="每行只能输入一个包，可以指定版本，例如 numpy==1.22.3 或 pandas>=1.3.0"
                    wrapperCols={12}
                />

                {renderPackageErrors()}
            </CModalBody>
            <CModalFooter>
                <CButton color="secondary" onClick={onClose}>
                    取消
                </CButton>
                <CButton color="primary" onClick={handleCreate} disabled={!isValid || !envName.trim()}>
                    创建
                </CButton>
            </CModalFooter>
        </CModal>
    );
};

export default CreateEnvModal;