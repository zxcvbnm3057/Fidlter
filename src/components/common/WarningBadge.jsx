import React from 'react';
import {
    CBadge,
    CTooltip
} from '@coreui/react';
import PropTypes from 'prop-types';

/**
 * 警告标签组件 - 用于显示警告或提示信息
 */
const WarningBadge = ({
    text = '数据不完整',
    tooltipText,
    color = 'warning',
    icon = '⚠️',
    className = '',
    ...props
}) => {
    const badge = (
        <CBadge color={color} className={`ms-2 ${className}`} {...props}>
            <span className="me-1">{icon}</span> {text}
        </CBadge>
    );

    if (tooltipText) {
        return (
            <CTooltip content={tooltipText}>
                {badge}
            </CTooltip>
        );
    }

    return badge;
};

WarningBadge.propTypes = {
    text: PropTypes.string,
    tooltipText: PropTypes.string,
    color: PropTypes.string,
    icon: PropTypes.string,
    className: PropTypes.string
};

export default WarningBadge;