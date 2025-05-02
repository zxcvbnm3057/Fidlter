import React from 'react';
import {
    CTable,
    CCard,
    CCardBody,
    CCardHeader,
    CCardFooter,
    CButton,
    CBadge,
    CDropdown,
    CDropdownToggle,
    CDropdownMenu,
    CDropdownItem
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilClock, cilOptions } from '@coreui/icons';

const TaskHistory = ({ taskHistory }) => {
    return (
        <CCard>
            <CCardHeader className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">最近任务历史</h5>
                <CButton color="link" href="/task-history">查看完整历史</CButton>
            </CCardHeader>
            <CCardBody>
                <CTable striped responsive hover>
                    <thead>
                        <tr>
                            <th>任务名称</th>
                            <th>环境</th>
                            <th>开始时间</th>
                            <th>状态</th>
                            <th>持续时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {taskHistory.length > 0 ? (
                            taskHistory.slice(0, 5).map((task, index) => (
                                <tr key={index}>
                                    <td>{task.task_name}</td>
                                    <td>{task.conda_env}</td>
                                    <td>{task.start_time}</td>
                                    <td>
                                        {task.status === 'success' ?
                                            <CBadge color="success">成功</CBadge> :
                                            task.status === 'failed' ?
                                                <CBadge color="danger">失败</CBadge> :
                                                <CBadge color="secondary">{task.status}</CBadge>
                                        }
                                    </td>
                                    <td>
                                        <CIcon icon={cilClock} className="me-1" />
                                        {task.duration}
                                    </td>
                                    <td>
                                        <CDropdown>
                                            <CDropdownToggle color="light" size="sm">
                                                <CIcon icon={cilOptions} />
                                            </CDropdownToggle>
                                            <CDropdownMenu>
                                                <CDropdownItem>查看详情</CDropdownItem>
                                                <CDropdownItem>重新运行</CDropdownItem>
                                                <CDropdownItem>导出日志</CDropdownItem>
                                            </CDropdownMenu>
                                        </CDropdown>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center">暂无历史记录</td>
                            </tr>
                        )}
                    </tbody>
                </CTable>
            </CCardBody>
            <CCardFooter>
                <small className="text-muted">仅显示最近 5 条记录</small>
            </CCardFooter>
        </CCard>
    );
};

export default TaskHistory;