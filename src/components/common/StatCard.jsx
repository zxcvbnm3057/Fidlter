import React from 'react';
import {
    CCard,
    CCardBody
} from '@coreui/react';
import PropTypes from 'prop-types';
import WarningBadge from './WarningBadge';

/**
 * 统计数据卡片组件 - 用于展示数字统计信息
 * 支持可点击和活跃状态
 */
const StatCard = ({
    value,
    label,
    color = 'primary',
    warning = null,
    warningText = null,
    className = '',
    onClick = null,
    isActive = false,
    clickable = false,
    ...props
}) => {
    // 颜色值映射
    const colorMap = {
        primary: '#321fdb',
        success: '#2eb85c',
        warning: '#f9b115',
        danger: '#e55353',
        info: '#3399ff',
        secondary: '#6c757d',
        dark: '#343a40',
        light: '#f8f9fa'
    };

    // 获取颜色代码
    const borderColor = colorMap[color] || color;
    const textColorClass = color !== 'primary' ? `text-${color}` : '';

    // 计算额外的类名
    const cardClasses = [
        'mb-4',
        'border-top-3',
        clickable ? 'stat-card clickable' : 'stat-card',
        isActive ? 'active' : '',
        className
    ].filter(Boolean).join(' ');

    // 处理点击事件
    const handleClick = () => {
        if (clickable && onClick) {
            onClick();
        }
    };

    return (
        <CCard
            className={cardClasses}
            style={{
                borderTop: `3px solid ${borderColor}`
            }}
            onClick={handleClick}
            {...props}
        >
            <CCardBody className="text-center">
                <div className={`h1 mt-2 mb-3 ${textColorClass}`} style={color === 'primary' ? { color: borderColor } : {}}>
                    {value}
                </div>
                <div className="h5 text-muted mb-0">
                    {label}
                    {warning && warningText && (
                        <WarningBadge
                            text={warning}
                            tooltipText={warningText}
                        />
                    )}
                </div>
            </CCardBody>
        </CCard>
    );
};

StatCard.propTypes = {
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    label: PropTypes.string.isRequired,
    color: PropTypes.string,
    warning: PropTypes.string,
    warningText: PropTypes.string,
    className: PropTypes.string,
    onClick: PropTypes.func,
    isActive: PropTypes.bool,
    clickable: PropTypes.bool
};

export default StatCard;