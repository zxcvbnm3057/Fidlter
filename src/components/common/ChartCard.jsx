import React from 'react';
import {
    CCard,
    CCardBody,
    CCardTitle
} from '@coreui/react';
import { CChart } from '@coreui/react-chartjs';
import PropTypes from 'prop-types';
import WarningBadge from './WarningBadge';

/**
 * 图表卡片组件 - 用于展示各类图表数据
 */
const ChartCard = ({
    title,
    chartData,
    chartOptions,
    chartType = 'bar',
    height = '250px',
    emptyIcon = '⚠️',
    emptyText = '无数据',
    emptyNoDataIcon = '📊',
    emptyNoDataText = '当前没有数据',
    noData = false,
    warning = null,
    warningText = null,
    className = '',
    ...props
}) => {
    return (
        <CCard className={`mb-4 ${className}`} {...props}>
            <CCardBody>
                <CCardTitle component="h5">
                    {title}
                    {warning && warningText && (
                        <WarningBadge
                            text={warning}
                            tooltipText={warningText}
                        />
                    )}
                </CCardTitle>
                {chartData ? (
                    <CChart
                        type={chartType}
                        data={chartData}
                        options={{
                            maintainAspectRatio: false,
                            ...chartOptions
                        }}
                        style={{ height: height }}
                    />
                ) : (
                    <div className="text-center py-5 text-muted">
                        <span className="h4">{noData ? emptyNoDataIcon : emptyIcon}</span>
                        <p>{noData ? emptyNoDataText : emptyText}</p>
                    </div>
                )}
            </CCardBody>
        </CCard>
    );
};

ChartCard.propTypes = {
    title: PropTypes.string.isRequired,
    chartData: PropTypes.object,
    chartOptions: PropTypes.object,
    chartType: PropTypes.string,
    height: PropTypes.string,
    emptyIcon: PropTypes.string,
    emptyText: PropTypes.string,
    emptyNoDataIcon: PropTypes.string,
    emptyNoDataText: PropTypes.string,
    noData: PropTypes.bool,
    warning: PropTypes.string,
    warningText: PropTypes.string,
    className: PropTypes.string
};

export default ChartCard;