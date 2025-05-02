import React from 'react';
import {
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
    CButton,
    CFormInput
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
    return (
        <CModal visible={visible} onClose={onClose}>
            <CModalHeader onClose={onClose}>
                <CModalTitle>安装包: {env?.name}</CModalTitle>
            </CModalHeader>
            <CModalBody>
                <div className="mb-3">
                    <label className="form-label">要安装的包列表</label>
                    <CFormInput
                        as="textarea"
                        rows={5}
                        value={newPackages}
                        onChange={(e) => onNewPackagesChange(e.target.value)}
                        placeholder="输入要安装的包名，每行一个或用逗号分隔，例如：numpy,pandas,matplotlib>=3.4.0"
                    />
                    <small className="text-muted">提示：可以指定版本，例如 numpy==1.20.0，也可以使用 {'>='} 指定最低版本</small>
                </div>
            </CModalBody>
            <CModalFooter>
                <CButton color="secondary" onClick={onClose}>
                    取消
                </CButton>
                <CButton color="primary" onClick={onInstall}>
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