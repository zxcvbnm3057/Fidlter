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

const EditEnvModal = ({ visible, onClose, env, editEnvName, onEditEnvNameChange, onRename }) => {
    return (
        <CModal visible={visible} onClose={onClose}>
            <CModalHeader onClose={onClose}>
                <CModalTitle>编辑环境: {env?.name}</CModalTitle>
            </CModalHeader>
            <CModalBody>
                <div className="mb-3">
                    <label className="form-label">新环境名称</label>
                    <CFormInput
                        type="text"
                        value={editEnvName}
                        onChange={(e) => onEditEnvNameChange(e.target.value)}
                        placeholder="输入新环境名称"
                    />
                </div>
            </CModalBody>
            <CModalFooter>
                <CButton color="secondary" onClick={onClose}>
                    取消
                </CButton>
                <CButton color="primary" onClick={onRename}>
                    保存
                </CButton>
            </CModalFooter>
        </CModal>
    );
};

export default EditEnvModal;