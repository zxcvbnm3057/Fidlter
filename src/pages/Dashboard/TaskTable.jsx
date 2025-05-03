import React from 'react';
import {
    CTable,
    CCard,
    CCardBody,
    CCardTitle,
} from '@coreui/react';

const TaskTable = ({ recentTasks = [] }) => {
    return (
        <CCard>
            <CCardBody>
                <CCardTitle component="h5">最近任务执行情况</CCardTitle>
                {recentTasks && recentTasks.length > 0 ? (
                    <CTable striped responsive>
                        <thead>
                            <tr>
                                <th>任务名称</th>
                                <th>状态</th>
                                <th>开始时间</th>
                                <th>结束时间</th>
                                <th>执行时长</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTasks.map((task, index) => (
                                <tr key={index}>
                                    <td>{task.name}</td>
                                    <td>
                                        {task.status === 'success' ?
                                            <span className="text-success">成功</span> :
                                            task.status === 'failed' ?
                                                <span className="text-danger">失败</span> :
                                                task.status}
                                    </td>
                                    <td>{new Date(task.start_time).toLocaleString()}</td>
                                    <td>{task.end_time ? new Date(task.end_time).toLocaleString() : '-'}</td>
                                    <td>{task.duration || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </CTable>
                ) : (
                    <div className="text-center d-flex flex-column justify-content-center align-items-center" style={{ height: '150px' }}>
                        <div className="text-muted">
                            <i className="cil-history" style={{ fontSize: '3rem' }}></i>
                            <p className="mt-3">当前没有执行记录</p>
                        </div>
                    </div>
                )}
            </CCardBody>
        </CCard>
    );
};

export default TaskTable;