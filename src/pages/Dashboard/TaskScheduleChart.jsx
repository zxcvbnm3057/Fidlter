import React from 'react';
import {
    CCard,
    CCardBody,
    CCardTitle,
} from '@coreui/react';
import { CChart } from '@coreui/react-chartjs';

const TaskScheduleChart = ({ taskList }) => {
    // 生成未来一周的日期范围
    const getNextWeekDates = () => {
        const dates = [];
        const today = new Date();
        
        for(let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dates.push({
                date: date,
                label: `${date.getMonth()+1}/${date.getDate()}`
            });
        }
        return dates;
    };

    // 计算未来一周内每天计划执行的任务数
    const prepareScheduleData = () => {
        const weekDates = getNextWeekDates();
        const taskCounts = Array(7).fill(0);
        
        // 过滤出计划任务并统计每天的任务数
        taskList.forEach(task => {
            if (task.scheduled_time) {
                const scheduledDate = new Date(task.scheduled_time);
                
                weekDates.forEach((dateObj, index) => {
                    if (scheduledDate.getDate() === dateObj.date.getDate() && 
                        scheduledDate.getMonth() === dateObj.date.getMonth() && 
                        scheduledDate.getFullYear() === dateObj.date.getFullYear()) {
                        taskCounts[index]++;
                    }
                });
            }
        });
        
        return {
            labels: weekDates.map(d => d.label),
            datasets: [
                {
                    label: '计划执行任务数',
                    backgroundColor: 'rgba(51, 153, 255, 0.2)',
                    borderColor: '#3399ff',
                    pointBackgroundColor: '#3399ff',
                    pointBorderColor: '#fff',
                    data: taskCounts
                }
            ]
        };
    };

    const scheduleData = prepareScheduleData();

    return (
        <CCard className="mb-4">
            <CCardBody>
                <CCardTitle component="h5">未来一周任务预期</CCardTitle>
                <CChart
                    type="bar"
                    data={scheduleData}
                    options={{
                        plugins: {
                            legend: {
                                position: 'top',
                            },
                            tooltip: {
                                callbacks: {
                                    title: (tooltipItems) => {
                                        const index = tooltipItems[0].dataIndex;
                                        const date = getNextWeekDates()[index].date;
                                        return date.toLocaleDateString('zh-CN', { 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric', 
                                            weekday: 'long' 
                                        });
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: '任务数量'
                                },
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        },
                        maintainAspectRatio: false,
                    }}
                    style={{ height: '250px' }}
                />
            </CCardBody>
        </CCard>
    );
};

export default TaskScheduleChart;