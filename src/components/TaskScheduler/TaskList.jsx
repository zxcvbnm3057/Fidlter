import React from 'react';
import {
    CTable,
    CCard,
    CCardBody,
    CCardHeader,
    CCardFooter,
    CDropdown,
    CDropdownToggle,
    CDropdownMenu,
    CDropdownItem,
    CButton,
    CTooltip,
    CBadge
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilMediaStop, cilList, cilCalendar } from '@coreui/icons';

const TaskList = ({ taskList, onViewDetails, onStopTask }) => {
    return (
        <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">当前任务</h5>
                <CDropdown>
                    <CDropdownToggle color="secondary">排序</CDropdownToggle>
                    <CDropdownMenu>
                        <CDropdownItem>按任务名称</CDropdownItem>
                        <CDropdownItem>按状态</CDropdownItem>
                        <CDropdownItem>按创建时间</CDropdownItem>
                    </CDropdownMenu>
                </CDropdown>
            </CCardHeader>
            <CCardBody>
                <CTable striped responsive hover>
                    <thead>
                        <tr>
                            <th>任务ID</th>
                            <th>任务名称</th>
                            <th>Conda环境</th>
                            <th>创建时间</th>
                            <th>状态</th>
                            <th>调度类型</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {taskList.length > 0 ? (
                            taskList.map((task) => (
                                <tr key={task.task_id}>
                                    <td>{task.task_id}</td>
                                    <td>
                                        <span className="text-primary cursor-pointer" onClick={() => onViewDetails(task)}>
                                            {task.task_name}
                                        </span>
                                    </td>
                                    <td>{task.conda_env}</td>
                                    <td>{new Date(task.created_at || Date.now()).toLocaleString()}</td>
                                    <td>
                                        {task.status === 'running' ?
                                            <CBadge color="primary">运行中</CBadge> :
                                            task.status === 'scheduled' ?
                                                <CBadge color="warning">已调度</CBadge> :
                                                <CBadge color="secondary">{task.status}</CBadge>
                                        }
                                    </td>
                                    <td>
                                        {task.schedule?.type === 'once' ?
                                            <span><CIcon icon={cilCalendar} /> 一次性</span> :
                                            task.schedule?.type === 'daily' ?
                                                <span><CIcon icon={cilCalendar} /> 每日</span> :
                                                task.schedule?.type === 'weekly' ?
                                                    <span><CIcon icon={cilCalendar} /> 每周</span> :
                                                    task.schedule?.type === 'monthly' ?
                                                        <span><CIcon icon={cilCalendar} /> 每月</span> :
                                                        <span>-</span>
                                        }
                                    </td>
                                    <td>
                                        <CTooltip content="停止任务">
                                            <CButton color="danger" size="sm" className="me-1" onClick={() => onStopTask(task.task_id)}>
                                                <CIcon icon={cilMediaStop} />
                                            </CButton>
                                        </CTooltip>
                                        <CTooltip content="查看详情">
                                            <CButton color="info" size="sm" onClick={() => onViewDetails(task)}>
                                                <CIcon icon={cilList} />
                                            </CButton>
                                        </CTooltip>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="text-center">暂无任务</td>
                            </tr>
                        )}
                    </tbody>
                </CTable>
            </CCardBody>
            <CCardFooter>
                <small className="text-muted">总计: {taskList.length} 个任务</small>
            </CCardFooter>
        </CCard>
    );
};

export default TaskList;