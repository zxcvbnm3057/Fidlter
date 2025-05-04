import React, { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import {
    CCard,
    CCardHeader,
    CCardBody,
    CForm,
    CFormLabel,
    CFormInput,
    CFormText,
    CFormCheck,
    CButton,
    CSpinner,
    CAlert,
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCloudUpload, cilWarning } from '@coreui/icons';
import { taskService } from '../../services/taskService';

const TaskScriptUpdater = ({ taskId, taskName, status, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isZipFile, setIsZipFile] = useState(false);
    const [command, setCommand] = useState('');
    const fileInputRef = useRef(null);

    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [formData, setFormData] = useState(null);
    const [forceUpdate, setForceUpdate] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            const isZip = file.name.toLowerCase().endsWith('.zip');
            setIsZipFile(isZip);
            if (isZip && !command) {
                setCommand('python main.py');
            }
        } else {
            setSelectedFile(null);
            setIsZipFile(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            setError('请选择要上传的脚本文件');
            return;
        }

        const formData = new FormData();
        formData.append('script_file', selectedFile);

        if (isZipFile && command) {
            formData.append('command', command);
        }

        if (status === 'running' || status === 'scheduled') {
            setFormData(formData);
            setConfirmModalVisible(true);
            return;
        }

        await submitUpdateScript(formData);
    };

    const submitUpdateScript = async (formData, force = false) => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(null);

            if (force) {
                formData.append('force', 'true');
            }

            const result = await taskService.updateTaskScript(taskId, formData);

            const message = result.force_applied
                ? `脚本更新成功！任务已自动停止。${result.updated_files?.length || 0} 个文件已更新。`
                : `脚本更新成功！${result.updated_files?.length || 0} 个文件已更新。`;

            setSuccess(message);

            if (onSuccess && typeof onSuccess === 'function') {
                onSuccess(result);
            }

            setSelectedFile(null);
            setIsZipFile(false);
            setCommand('');
            setFormData(null);
            setForceUpdate(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (err) {
            const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || '更新脚本时出错';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmCancel = () => {
        setConfirmModalVisible(false);
        setFormData(null);
        setForceUpdate(false);
    };

    const handleConfirmForce = () => {
        setConfirmModalVisible(false);
        if (formData) {
            submitUpdateScript(formData, true);
        }
    };

    return (
        <CCard className="mb-4">
            <CCardHeader>
                <h5 className="mb-0">更新任务脚本</h5>
            </CCardHeader>
            <CCardBody>
                {error && (
                    <CAlert color="danger" className="mb-3">
                        {error}
                    </CAlert>
                )}

                {success && (
                    <CAlert color="success" className="mb-3">
                        {success}
                    </CAlert>
                )}

                <CForm onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <CFormLabel htmlFor="taskInfo">任务信息</CFormLabel>
                        <div className="p-2 bg-light rounded">
                            <p className="mb-0"><strong>任务ID:</strong> {taskId}</p>
                            <p className="mb-0"><strong>任务名称:</strong> {taskName}</p>
                            <p className="mb-0"><strong>当前状态:</strong> {status}</p>
                        </div>
                    </div>

                    <div className="mb-3">
                        <CFormLabel htmlFor="scriptFile">选择脚本文件</CFormLabel>
                        <CFormInput
                            type="file"
                            id="scriptFile"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".py,.zip"
                        />
                        {selectedFile && (
                            <CFormText>
                                已选择文件: {selectedFile.name}
                            </CFormText>
                        )}
                    </div>

                    {isZipFile && (
                        <>
                            <div className="mb-3">
                                <CFormLabel htmlFor="command">自定义启动命令</CFormLabel>
                                <CFormInput
                                    type="text"
                                    id="command"
                                    value={command}
                                    onChange={(e) => setCommand(e.target.value)}
                                    placeholder="例如: python main.py --args"
                                    required={isZipFile}
                                />
                                <CFormText>
                                    指定ZIP包解压后要执行的命令，工作目录为解压后的根目录
                                </CFormText>
                            </div>

                            <CAlert color="info" className="mb-3">
                                <strong>ZIP文件提示：</strong>
                                <ul className="mb-0 ps-3 mt-1">
                                    <li>请不要在ZIP中包含额外的顶层目录，直接将所有文件放在ZIP的根目录中</li>
                                    <li>命令将在解压后的根目录 (/var/fidlter/scripts/{taskId}/) 下执行</li>
                                    <li>ZIP包中的所有文件将替换任务目录中的现有文件</li>
                                </ul>
                            </CAlert>
                        </>
                    )}

                    <CButton
                        type="submit"
                        color="primary"
                        disabled={loading || !selectedFile}
                    >
                        {loading ? (
                            <>
                                <CSpinner size="sm" className="me-2" />
                                更新中...
                            </>
                        ) : (
                            <>
                                <CIcon icon={cilCloudUpload} className="me-2" />
                                更新脚本
                            </>
                        )}
                    </CButton>
                </CForm>
            </CCardBody>

            <CModal
                visible={confirmModalVisible}
                onClose={handleConfirmCancel}
                alignment="center"
            >
                <CModalHeader>
                    <CModalTitle>
                        <CIcon icon={cilWarning} className="text-warning me-2" />
                        确认更新脚本
                    </CModalTitle>
                </CModalHeader>
                <CModalBody>
                    <p>任务 <strong>{taskName}</strong> 当前状态为 <strong className="text-primary">{status}</strong>。</p>
                    <p>继续更新将会<strong className="text-danger">终止当前正在执行的任务</strong>，是否确认？</p>
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" onClick={handleConfirmCancel}>
                        取消
                    </CButton>
                    <CButton color="primary" onClick={handleConfirmForce}>
                        确认终止并更新
                    </CButton>
                </CModalFooter>
            </CModal>
        </CCard>
    );
};

export default TaskScriptUpdater;