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
                        {recentTasks && recentTasks.length > 0 ? (
                            recentTasks.map((task, index) => (
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
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="text-center">暂无任务数据</td>
                            </tr>
                        )}
                    </tbody>
                </CTable>
            </CCardBody>
        </CCard>
    );
};

export default TaskTable;