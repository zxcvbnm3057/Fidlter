import React from 'react';
import { CChart } from '@coreui/react-chartjs';
import {
    CCard,
    CCardBody,
    CCardTitle,
    CRow,
    CCol,
} from '@coreui/react';

const ChartSection = ({ chartData }) => {
    if (!chartData.statusData || !chartData.last7DaysData) {
        return null;
    }

    return (
        <CRow className="mb-4">
            <CCol md={6}>
                <CCard>
                    <CCardBody>
                        <CCardTitle component="h5">任务状态分布</CCardTitle>
                        <div style={{ height: '300px' }}>
                            <CChart
                                type="doughnut"
                                data={chartData.statusData}
                                options={{
                                    plugins: {
                                        legend: {
                                            position: 'bottom',
                                        }
                                    },
                                    maintainAspectRatio: false
                                }}
                            />
                        </div>
                    </CCardBody>
                </CCard>
            </CCol>
            <CCol md={6}>
                <CCard>
                    <CCardBody>
                        <CCardTitle component="h5">最近7天任务趋势</CCardTitle>
                        <div style={{ height: '300px' }}>
                            <CChart
                                type="bar"
                                data={chartData.last7DaysData}
                                options={{
                                    plugins: {
                                        legend: {
                                            position: 'bottom',
                                        }
                                    },
                                    scales: {
                                        x: {
                                            grid: {
                                                display: false
                                            }
                                        },
                                        y: {
                                            grid: {
                                                display: true
                                            },
                                            beginAtZero: true
                                        }
                                    },
                                    maintainAspectRatio: false
                                }}
                            />
                        </div>
                    </CCardBody>
                </CCard>
            </CCol>
        </CRow>
    );
};

export default ChartSection;