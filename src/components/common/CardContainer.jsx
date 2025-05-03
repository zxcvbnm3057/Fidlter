import React from 'react';
import {
    CCard,
    CCardHeader,
    CCardBody,
    CCardFooter,
    CButton,
    CBadge
} from '@coreui/react';
import PropTypes from 'prop-types';

/**
 * 通用卡片容器组件
 * 支持标题、图标、徽章、页脚、操作按钮等功能
 */
const CardContainer = ({
    title,
    icon = null,
    badge = null,
    badgeColor = 'primary',
    headerActions = null,
    footer = null,
    footerActions = null,
    children,
    color = null,
    textColor = null,
    borderColor = null,
    className = '',
    headerClassName = '',
    bodyClassName = '',
    footerClassName = '',
    noPadding = false,
    ...props
}) => {
    // 渲染卡片头部
    const renderHeader = () => {
        if (!title && !headerActions && !icon && !badge) {
            return null;
        }

        return (
            <CCardHeader className={headerClassName}>
                <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                        {icon && <span className="me-2">{icon}</span>}
                        {title && <h5 className="mb-0">{title}</h5>}
                        {badge && (
                            <CBadge color={badgeColor} className="ms-2">
                                {badge}
                            </CBadge>
                        )}
                    </div>
                    {headerActions && <div>{headerActions}</div>}
                </div>
            </CCardHeader>
        );
    };

    // 渲染卡片页脚
    const renderFooter = () => {
        if (!footer && !footerActions) {
            return null;
        }

        return (
            <CCardFooter className={footerClassName}>
                <div className="d-flex justify-content-between align-items-center">
                    {footer && <div>{footer}</div>}
                    {footerActions && (
                        <div className="d-flex gap-2">
                            {Array.isArray(footerActions)
                                ? footerActions.map((action, index) => (
                                    <CButton
                                        key={index}
                                        color={action.color || 'primary'}
                                        size={action.size || 'sm'}
                                        onClick={action.onClick}
                                        disabled={action.disabled}
                                    >
                                        {action.icon && (
                                            <span className="me-1">{action.icon}</span>
                                        )}
                                        {action.label}
                                    </CButton>
                                ))
                                : footerActions}
                        </div>
                    )}
                </div>
            </CCardFooter>
        );
    };

    return (
        <CCard
            color={color}
            textColor={textColor}
            className={className}
            {...props}
            style={{
                ...(borderColor ? { borderColor } : {}),
                ...(props.style || {})
            }}
        >
            {renderHeader()}
            <CCardBody className={`${bodyClassName} ${noPadding ? 'p-0' : ''}`}>
                {children}
            </CCardBody>
            {renderFooter()}
        </CCard>
    );
};

CardContainer.propTypes = {
    title: PropTypes.node,
    icon: PropTypes.node,
    badge: PropTypes.node,
    badgeColor: PropTypes.string,
    headerActions: PropTypes.node,
    footer: PropTypes.node,
    footerActions: PropTypes.oneOfType([
        PropTypes.node,
        PropTypes.arrayOf(
            PropTypes.shape({
                label: PropTypes.node.isRequired,
                onClick: PropTypes.func.isRequired,
                color: PropTypes.string,
                size: PropTypes.string,
                icon: PropTypes.node,
                disabled: PropTypes.bool
            })
        )
    ]),
    children: PropTypes.node.isRequired,
    color: PropTypes.string,
    textColor: PropTypes.string,
    borderColor: PropTypes.string,
    className: PropTypes.string,
    headerClassName: PropTypes.string,
    bodyClassName: PropTypes.string,
    footerClassName: PropTypes.string,
    noPadding: PropTypes.bool
};

export default CardContainer;