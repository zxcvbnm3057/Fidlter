import React from 'react';
import { CSpinner } from '@coreui/react';
import PropTypes from 'prop-types';

/**
 * 通用加载状态组件
 */
const LoadingSpinner = ({
    text = '加载中...',
    color = 'primary',
    size = 'md',
    centered = true,
    fullHeight = false,
    className = '',
    ...props
}) => {
    const containerStyle = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        ...(fullHeight ? { height: '100%', minHeight: '200px' } : {}),
        ...(centered ? { width: '100%', textAlign: 'center' } : {})
    };

    return (
        <div style={containerStyle} className={className} {...props}>
            <CSpinner color={color} size={size} className="mb-3" />
            {text && <div className="text-muted">{text}</div>}
        </div>
    );
};

LoadingSpinner.propTypes = {
    text: PropTypes.string,
    color: PropTypes.string,
    size: PropTypes.string,
    centered: PropTypes.bool,
    fullHeight: PropTypes.bool,
    className: PropTypes.string
};

export default LoadingSpinner;