import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CCard,
    CCardBody,
    CCardTitle,
    CTable,
    CBadge,
    CButton,
    CDropdown,
    CDropdownToggle,
    CDropdownMenu,
    CDropdownItem
} from '@coreui/react';

const TaskList = ({ taskList }) => {
    const navigate = useNavigate();
    
    // 查看任务详情
    const viewTaskDetail = (taskId) => {
        navigate(`/task-detail/${taskId}`);
    };

    return (
        <CCard className="mb-4">
            <CCardBody>
                <div className="d-flex justify-content-between mb-3">
                    <CCardTitle component="h5">已定义任务列表</CCardTitle>
                    <CDropdown>
                        <CDropdownToggle color="secondary">筛选</CDropdownToggle>
                        <CDropdownMenu>
                            <CDropdownItem>全部任务</CDropdownItem>
                            <CDropdownItem>运行中</CDropdownItem>
                            <CDropdownItem>已完成</CDropdownItem>
                            <CDropdownItem>已失败</CDropdownItem>
                            <CDropdownItem>未执行</CDropdownItem>
                        </CDropdownMenu>
                    </CDropdown>
                </div>
                <CTable striped responsive hover>
                    <thead>
                        <tr>
                            <th>任务ID</th>
                            <th>任务名称</th>
                            <th>Conda环境</th>
                            <th>调度时间</th>
                            <th>执行状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {taskList.length > 0 ? (
                            taskList.map((task, index) => (
                                <tr key={index}>
                                    <td>{task.task_id}</td>
                                    <td>{task.task_name}</td>
                                    <td>{task.conda_env}</td>
                                    <td>{task.scheduled_time ? new Date(task.scheduled_time).toLocaleString() : '手动执行'}</td>
                                    <td>
                                        {task.status === 'success' ?
                                            <CBadge color="success">成功</CBadge> :
                                            task.status === 'failed' ?
                                                <CBadge color="danger">失败</CBadge> :
                                                task.status === 'running' ?
                                                    <CBadge color="primary">运行中</CBadge> :
                                                    task.status === 'pending' ?
                                                        <CBadge color="warning">等待中</CBadge> :
                                                        <CBadge color="secondary">未执行</CBadge>
                                        }
                                    </td>
                                    <td>
                                        <CButton 
                                            color="info" 
                                            size="sm"
                                            onClick={() => viewTaskDetail(task.task_id)}
                                            className="me-2"
                                        >
                                            详情
                                        </CButton>
                                        {(task.status === 'running' || task.status === 'pending') && (
                                            <CButton color="danger" size="sm">
                                                停止
                                            </CButton>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center">暂无任务</td>
                            </tr>
                        )}
                    </tbody>
                </CTable>
            </CCardBody>
        </CCard>
    );
};

export default TaskList;