import React from 'react';
import PropTypes from 'prop-types';

/**
 * 通用空状态组件
 * 用于显示没有数据或内容时的提示
 */
const EmptyState = ({
    icon = '📭',
    title = '暂无数据',
    description = '当前没有可显示的内容',
    actionButton = null,
    className = '',
    style = {},
    ...props
}) => {
    return (
        <div
            className={`text-center py-5 text-muted ${className}`}
            style={{ minHeight: '200px', ...style }}
            {...props}
        >
            {icon && <div className="h1 mb-3">{icon}</div>}
            {title && <h5 className="mb-2">{title}</h5>}
            {description && <p className="mb-3">{description}</p>}
            {actionButton && <div>{actionButton}</div>}
        </div>
    );
};

EmptyState.propTypes = {
    icon: PropTypes.node,
    title: PropTypes.node,
    description: PropTypes.node,
    actionButton: PropTypes.node,
    className: PropTypes.string,
    style: PropTypes.object
};

export default EmptyState;