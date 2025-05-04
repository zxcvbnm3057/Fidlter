import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    CCard,
    CCardHeader,
    CCardBody,
    CButton,
    CSpinner,
    CAlert,
    CListGroup,
    CListGroupItem,
    CBadge,
    CFormCheck
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCloudDownload, cilSync } from '@coreui/icons';
import {
    updateGitTaskRequest,
    fetchGitTaskStatusRequest,
    clearGitTaskResults
} from '../../redux/git/reducer';

const GitTaskUpdate = ({ taskId }) => {
    const dispatch = useDispatch();
    const { loading, error, gitTaskStatus, gitTaskUpdated } = useSelector(state => state.git);

    const [updateEnv, setUpdateEnv] = useState(true);

    // 加载Git任务状态
    useEffect(() => {
        if (taskId) {
            dispatch(fetchGitTaskStatusRequest({ taskId }));
        }
    }, [dispatch, taskId]);

    // 处理任务更新
    const handleUpdate = () => {
        dispatch(updateGitTaskRequest({ taskId, update_env: updateEnv }));
    };

    // 清除结果
    const handleClear = () => {
        dispatch(clearGitTaskResults());
    };

    // 如果没有任务ID则不显示
    if (!taskId) {
        return null;
    }

    return (
        <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Git仓库任务同步</h5>
                <CButton
                    color="primary"
                    size="sm"
                    onClick={() => dispatch(fetchGitTaskStatusRequest({ taskId }))}
                    disabled={loading}
                >
                    <CIcon icon={cilSync} className="me-1" />
                    刷新状态
                </CButton>
            </CCardHeader>
            <CCardBody>
                {error && (
                    <CAlert color="danger" className="mb-3">
                        {error}
                    </CAlert>
                )}

                {gitTaskUpdated && (
                    <CAlert color="success" className="mb-3">
                        Git仓库任务已成功更新！
                        <div className="mt-2">
                            <CButton size="sm" color="secondary" onClick={handleClear}>
                                清除信息
                            </CButton>
                        </div>
                    </CAlert>
                )}

                {gitTaskStatus && gitTaskStatus.task && (
                    <>
                        <div className="mb-3">
                            <h6>仓库信息</h6>
                            <CListGroup className="mb-3">
                                <CListGroupItem className="d-flex justify-content-between align-items-center">
                                    <span>仓库URL</span>
                                    <span className="text-truncate" style={{ maxWidth: '60%' }}>
                                        {gitTaskStatus.task.repo_url}
                                    </span>
                                </CListGroupItem>
                                <CListGroupItem className="d-flex justify-content-between align-items-center">
                                    <span>分支</span>
                                    <span>{gitTaskStatus.task.branch || 'main'}</span>
                                </CListGroupItem>
                                <CListGroupItem className="d-flex justify-content-between align-items-center">
                                    <span>最后同步时间</span>
                                    <span>
                                        {gitTaskStatus.task.last_synced ?
                                            new Date(gitTaskStatus.task.last_synced).toLocaleString() :
                                            '未同步'}
                                    </span>
                                </CListGroupItem>
                                <CListGroupItem className="d-flex justify-content-between align-items-center">
                                    <span>本地修改</span>
                                    <CBadge color={gitTaskStatus.task.local_changes ? 'warning' : 'success'}>
                                        {gitTaskStatus.task.local_changes ? '有未提交的修改' : '无修改'}
                                    </CBadge>
                                </CListGroupItem>
                                <CListGroupItem className="d-flex justify-content-between align-items-center">
                                    <span>领先远程的提交</span>
                                    <span>{gitTaskStatus.task.ahead_commits || 0} 个提交</span>
                                </CListGroupItem>
                                <CListGroupItem className="d-flex justify-content-between align-items-center">
                                    <span>落后远程的提交</span>
                                    <CBadge color={gitTaskStatus.task.behind_commits > 0 ? 'warning' : 'success'}>
                                        {gitTaskStatus.task.behind_commits || 0} 个提交
                                    </CBadge>
                                </CListGroupItem>
                            </CListGroup>
                        </div>

                        <div className="mb-3">
                            <CFormCheck
                                id="update-env"
                                label="更新环境依赖（安装requirements.txt中的包）"
                                checked={updateEnv}
                                onChange={(e) => setUpdateEnv(e.target.checked)}
                            />
                        </div>

                        <CButton
                            color="primary"
                            onClick={handleUpdate}
                            disabled={loading}
                            className="me-2"
                        >
                            {loading ? (
                                <>
                                    <CSpinner size="sm" className="me-2" />
                                    正在更新...
                                </>
                            ) : (
                                <>
                                    <CIcon icon={cilCloudDownload} className="me-2" />
                                    更新Git仓库任务
                                </>
                            )}
                        </CButton>
                        <small className="text-muted">
                            将从远程仓库拉取最新代码，并根据仓库配置更新任务
                        </small>
                    </>
                )}

                {gitTaskUpdated && (
                    <div className="mt-4">
                        <h6>更新结果</h6>
                        <div className="p-3 bg-light rounded">
                            <dl className="row mb-0">
                                <dt className="col-sm-3">任务ID:</dt>
                                <dd className="col-sm-9">{gitTaskUpdated.task?.task_id}</dd>

                                <dt className="col-sm-3">任务名称:</dt>
                                <dd className="col-sm-9">{gitTaskUpdated.task?.task_name}</dd>

                                {gitTaskUpdated.new_files && gitTaskUpdated.new_files.length > 0 && (
                                    <>
                                        <dt className="col-sm-3">新增文件:</dt>
                                        <dd className="col-sm-9">
                                            {gitTaskUpdated.new_files.map((file, index) => (
                                                <div key={index}>{file}</div>
                                            ))}
                                        </dd>
                                    </>
                                )}

                                {gitTaskUpdated.changed_files && gitTaskUpdated.changed_files.length > 0 && (
                                    <>
                                        <dt className="col-sm-3">更新文件:</dt>
                                        <dd className="col-sm-9">
                                            {gitTaskUpdated.changed_files.map((file, index) => (
                                                <div key={index}>{file}</div>
                                            ))}
                                        </dd>
                                    </>
                                )}

                                {gitTaskUpdated.environment_message && (
                                    <>
                                        <dt className="col-sm-3">环境更新:</dt>
                                        <dd className="col-sm-9">{gitTaskUpdated.environment_message}</dd>
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

export default GitTaskUpdate;