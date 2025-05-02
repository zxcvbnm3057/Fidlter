import React from 'react';
import {
    CTable,
    CCard,
    CCardBody,
    CCardTitle,
    CDropdown,
    CDropdownToggle,
    CDropdownMenu,
    CDropdownItem,
    CBadge
} from '@coreui/react';

const TaskHistoryList = ({ taskHistory, onFilter }) => {
    return (
        <CCard>
            <CCardBody>
                <div className="d-flex justify-content-between mb-3">
                    <CCardTitle component="h5">历史任务列表</CCardTitle>
                    <CDropdown>
                        <CDropdownToggle color="secondary">筛选</CDropdownToggle>
                        <CDropdownMenu>
                            <CDropdownItem onClick={() => onFilter('all')}>全部</CDropdownItem>
                            <CDropdownItem onClick={() => onFilter('success')}>成功任务</CDropdownItem>
                            <CDropdownItem onClick={() => onFilter('failed')}>失败任务</CDropdownItem>
                            <CDropdownItem onClick={() => onFilter('running')}>运行中</CDropdownItem>
                        </CDropdownMenu>
                    </CDropdown>
                </div>
                <CTable striped responsive>
                    <thead>
                        <tr>
                            <th>任务ID</th>
                            <th>任务名称</th>
                            <th>Conda环境</th>
                            <th>开始时间</th>
                            <th>结束时间</th>
                            <th>状态</th>
                            <th>执行时长</th>
                        </tr>
                    </thead>
                    <tbody>
                        {taskHistory.length > 0 ? (
                            taskHistory.map((task, index) => (
                                <tr key={index}>
                                    <td>{task.task_id}</td>
                                    <td>{task.task_name}</td>
                                    <td>{task.conda_env}</td>
                                    <td>{task.start_time}</td>
                                    <td>{task.end_time}</td>
                                    <td>
                                        {task.status === 'success' ?
                                            <CBadge color="success">成功</CBadge> :
                                            task.status === 'failed' ?
                                                <CBadge color="danger">失败</CBadge> :
                                                task.status === 'running' ?
                                                    <CBadge color="primary">运行中</CBadge> :
                                                    <CBadge color="warning">{task.status}</CBadge>
                                        }
                                    </td>
                                    <td>{task.duration}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="text-center">暂无历史记录</td>
                            </tr>
                        )}
                    </tbody>
                </CTable>
            </CCardBody>
        </CCard>
    );
};

export default TaskHistoryList;