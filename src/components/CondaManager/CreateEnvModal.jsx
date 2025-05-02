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

const CreateEnvModal = ({ visible, onClose, envName, onEnvNameChange, onCreate }) => {
    return (
        <CModal visible={visible} onClose={onClose}>
            <CModalHeader onClose={onClose}>
                <CModalTitle>创建新Conda环境</CModalTitle>
            </CModalHeader>
            <CModalBody>
                <div className="mb-3">
                    <label className="form-label">环境名称</label>
                    <CFormInput
                        type="text"
                        value={envName}
                        onChange={(e) => onEnvNameChange(e.target.value)}
                        placeholder="输入环境名称"
                    />
                </div>
            </CModalBody>
            <CModalFooter>
                <CButton color="secondary" onClick={onClose}>
                    取消
                </CButton>
                <CButton color="primary" onClick={onCreate}>
                    创建
                </CButton>
            </CModalFooter>
        </CModal>
    );
};

export default CreateEnvModal;