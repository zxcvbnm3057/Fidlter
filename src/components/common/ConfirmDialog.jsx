import React from 'react';
import {
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
    CButton,
    CSpinner
} from '@coreui/react';
import PropTypes from 'prop-types';

/**
 * 通用确认对话框组件
 */
const ConfirmDialog = ({
    visible,
    onClose,
    onConfirm,
    title = '确认操作',
    content = '您确定要执行此操作吗？',
    confirmText = '确认',
    cancelText = '取消',
    confirmColor = 'primary',
    cancelColor = 'secondary',
    loading = false,
    size = 'sm',
    closeOnBackdrop = true,
    className = '',
    ...props
}) => {
    // 处理点击确认按钮
    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        }
    };

    // 处理点击取消按钮
    const handleCancel = () => {
        if (onClose) {
            onClose();
        }
    };

    return (
        <CModal
            visible={visible}
            onClose={handleCancel}
            alignment="center"
            size={size}
            backdrop={closeOnBackdrop ? 'static' : true}
            className={className}
            {...props}
        >
            <CModalHeader closeButton>
                <CModalTitle>{title}</CModalTitle>
            </CModalHeader>
            <CModalBody>
                {typeof content === 'string' ? <p>{content}</p> : content}
            </CModalBody>
            <CModalFooter>
                <CButton
                    color={cancelColor}
                    onClick={handleCancel}
                    disabled={loading}
                >
                    {cancelText}
                </CButton>
                <CButton
                    color={confirmColor}
                    onClick={handleConfirm}
                    disabled={loading}
                >
                    {loading && <CSpinner size="sm" className="me-2" />}
                    {confirmText}
                </CButton>
            </CModalFooter>
        </CModal>
    );
};

ConfirmDialog.propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    title: PropTypes.string,
    content: PropTypes.node,
    confirmText: PropTypes.string,
    cancelText: PropTypes.string,
    confirmColor: PropTypes.string,
    cancelColor: PropTypes.string,
    loading: PropTypes.bool,
    size: PropTypes.string,
    closeOnBackdrop: PropTypes.bool,
    className: PropTypes.string
};

export default ConfirmDialog;