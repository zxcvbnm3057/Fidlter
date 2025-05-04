import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    CCard,
    CCardHeader,
    CCardBody,
    CForm,
    CFormLabel,
    CFormInput,
    CFormSelect,
    CFormCheck,
    CButton,
    CSpinner,
    CAlert,
    CRow,
    CCol
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCloudDownload } from '@coreui/icons';
import { createGitTaskRequest, clearGitTaskResults } from '../../redux/git/reducer';

const GitTaskForm = () => {
    const dispatch = useDispatch();
    const { loading, error, gitTaskCreated } = useSelector(state => state.git);

    // 表单状态
    const [formData, setFormData] = useState({
        repo_url: '',
        branch: 'main',
        task_name: '',
        env_option: 'create',
        env_name: '',
        command: ''
    });

    // 获取conda环境列表
    const { environments } = useSelector(state => state.conda);
    const [environmentWarning, setEnvironmentWarning] = useState('');

    // 检查环境名称是否已存在
    const checkEnvironmentExists = (name) => {
        return environments.some(env => env.name === name);
    };

    // 处理输入变化
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    // 处理环境选项变化，可能需要清空警告
    const handleEnvOptionChange = (e) => {
        const { value } = e.target;
        setFormData({
            ...formData,
            env_option: value
        });
        setEnvironmentWarning('');
    };

    // 处理环境名称变化
    const handleEnvNameChange = (e) => {
        const { value } = e.target;
        setFormData({
            ...formData,
            env_name: value
        });

        // 当选择创建环境且输入的环境名称已存在时显示警告
        if (formData.env_option === 'create' && value && checkEnvironmentExists(value)) {
            setEnvironmentWarning(`环境 '${value}' 已存在，将会更新现有环境而不是创建新环境`);
        } else {
            setEnvironmentWarning('');
        }
    };

    // 处理表单提交
    const handleSubmit = (e) => {
        e.preventDefault();
        dispatch(createGitTaskRequest(formData));
    };

    // 清空结果并重置表单
    const handleReset = () => {
        dispatch(clearGitTaskResults());
        setFormData({
            repo_url: '',
            branch: 'main',
            task_name: '',
            env_option: 'create',
            env_name: '',
            command: ''
        });
        setEnvironmentWarning('');
    };

    return (
        <CCard className="mb-4">
            <CCardHeader>
                <h5 className="mb-0">从Git仓库创建任务</h5>
            </CCardHeader>
            <CCardBody>
                {error && (
                    <CAlert color="danger" className="mb-3">
                        {error}
                    </CAlert>
                )}

                {gitTaskCreated && (
                    <CAlert color="success" className="mb-3">
                        任务创建成功！任务ID: {gitTaskCreated.task?.task_id}
                        <div className="mt-2">
                            <CButton size="sm" color="secondary" onClick={handleReset}>
                                创建新任务
                            </CButton>
                        </div>
                    </CAlert>
                )}

                {!gitTaskCreated && (
                    <CForm onSubmit={handleSubmit}>
                        <CRow>
                            <CCol md={8}>
                                <div className="mb-3">
                                    <CFormLabel htmlFor="repo_url">Git仓库URL</CFormLabel>
                                    <CFormInput
                                        type="text"
                                        id="repo_url"
                                        name="repo_url"
                                        value={formData.repo_url}
                                        onChange={handleInputChange}
                                        placeholder="例如: https://github.com/username/repo.git"
                                        required
                                    />
                                    <div className="form-text">
                                        提供Git仓库的URL，系统将自动拉取仓库并创建任务
                                    </div>
                                </div>
                            </CCol>
                            <CCol md={4}>
                                <div className="mb-3">
                                    <CFormLabel htmlFor="branch">分支名称</CFormLabel>
                                    <CFormInput
                                        type="text"
                                        id="branch"
                                        name="branch"
                                        value={formData.branch}
                                        onChange={handleInputChange}
                                        placeholder="main"
                                    />
                                </div>
                            </CCol>
                        </CRow>

                        <div className="mb-3">
                            <CFormLabel htmlFor="task_name">任务名称 (可选)</CFormLabel>
                            <CFormInput
                                type="text"
                                id="task_name"
                                name="task_name"
                                value={formData.task_name}
                                onChange={handleInputChange}
                                placeholder="留空将使用仓库名称作为任务名称"
                            />
                        </div>

                        <div className="mb-3">
                            <CFormLabel htmlFor="env_option">环境选项</CFormLabel>
                            <CFormSelect
                                id="env_option"
                                name="env_option"
                                value={formData.env_option}
                                onChange={handleEnvOptionChange}
                                required
                            >
                                <option value="create">创建新环境或更新现有环境</option>
                                <option value="existing">使用现有环境</option>
                            </CFormSelect>
                            <div className="form-text">
                                选择环境选项以决定任务的运行环境
                            </div>
                        </div>

                        {formData.env_option === 'existing' && (
                            <div className="mb-3">
                                <CFormLabel htmlFor="env_name">环境名称</CFormLabel>
                                <CFormSelect
                                    id="env_name"
                                    name="env_name"
                                    value={formData.env_name}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">选择环境</option>
                                    {environments.map((env, index) => (
                                        <option key={index} value={env.name}>
                                            {env.name}
                                        </option>
                                    ))}
                                </CFormSelect>
                                <div className="form-text">
                                    选择要用于运行任务的现有环境
                                </div>
                            </div>
                        )}

                        {formData.env_option === 'create' && (
                            <div className="mb-3">
                                <CFormLabel htmlFor="env_name">环境名称</CFormLabel>
                                <CFormInput
                                    type="text"
                                    id="env_name"
                                    name="env_name"
                                    value={formData.env_name}
                                    onChange={handleEnvNameChange}
                                    placeholder="输入新环境名称"
                                />
                                {environmentWarning && (
                                    <div className="form-text text-danger">
                                        {environmentWarning}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mb-3">
                            <CFormLabel htmlFor="command">启动命令</CFormLabel>
                            <CFormInput
                                type="text"
                                id="command"
                                name="command"
                                value={formData.command}
                                onChange={handleInputChange}
                                placeholder="例如: python main.py --arg value"
                                required
                            />
                            <div className="form-text">
                                指定运行任务的启动命令，系统不会自动检测主脚本文件
                            </div>
                        </div>

                        <div className="mt-3">
                            <CButton color="primary" type="submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <CSpinner size="sm" className="me-2" />
                                        正在创建...
                                    </>
                                ) : (
                                    <>
                                        <CIcon icon={cilCloudDownload} className="me-2" />
                                        从Git仓库创建任务
                                    </>
                                )}
                            </CButton>
                        </div>
                    </CForm>
                )}

                {gitTaskCreated && (
                    <div className="mt-4">
                        <h6>任务详情</h6>
                        <div className="p-3 bg-light rounded">
                            <dl className="row mb-0">
                                <dt className="col-sm-3">任务ID:</dt>
                                <dd className="col-sm-9">{gitTaskCreated.task?.task_id}</dd>

                                <dt className="col-sm-3">任务名称:</dt>
                                <dd className="col-sm-9">{gitTaskCreated.task?.task_name}</dd>

                                <dt className="col-sm-3">仓库URL:</dt>
                                <dd className="col-sm-9">{gitTaskCreated.task?.repo_url || formData.repo_url}</dd>

                                <dt className="col-sm-3">脚本路径:</dt>
                                <dd className="col-sm-9">{gitTaskCreated.task?.script_path}</dd>

                                <dt className="col-sm-3">环境:</dt>
                                <dd className="col-sm-9">{gitTaskCreated.task?.conda_env}</dd>

                                {gitTaskCreated.task?.command && (
                                    <>
                                        <dt className="col-sm-3">启动命令:</dt>
                                        <dd className="col-sm-9">{gitTaskCreated.task?.command}</dd>
                                    </>
                                )}

                                {gitTaskCreated.environment_message && (
                                    <>
                                        <dt className="col-sm-3">环境信息:</dt>
                                        <dd className="col-sm-9">{gitTaskCreated.environment_message}</dd>
                                    </>
                                )}

                                {gitTaskCreated.environment_warning && (
                                    <>
                                        <dt className="col-sm-3">环境警告:</dt>
                                        <dd className="col-sm-9 text-warning">{gitTaskCreated.environment_warning}</dd>
                                    </>
                                )}
                            </dl>
                        </div>
                    </div>
                )}
            </CCardBody>
        </CCard>
    );
};

export default GitTaskForm;