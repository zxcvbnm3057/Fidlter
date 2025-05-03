import React from 'react';
import {
    CFormLabel,
    CFormInput,
    CFormSelect,
    CFormCheck,
    CFormTextarea,
    CFormFeedback,
    CRow,
    CCol,
    CInputGroup,
    CInputGroupText
} from '@coreui/react';
import PropTypes from 'prop-types';

/**
 * 通用表单组件
 * 支持各种类型的表单控件，并提供统一的布局和验证反馈
 */
const FormGroup = ({
    id,
    label,
    type = 'text',
    value,
    onChange,
    onBlur,
    error = null,
    touched = false,
    options = [],
    placeholder = '',
    disabled = false,
    readOnly = false,
    required = false,
    helpText = null,
    prefix = null,
    suffix = null,
    className = '',
    containerClassName = '',
    labelClassName = '',
    rows = 3,
    cols = 30,
    asFloatingLabel = false,
    wrapperCols = 12,
    labelCols = 12,
    inputCols = 12,
    inline = false,
    ...props
}) => {
    // 生成唯一ID
    const inputId = id || `form-input-${label?.replace(/\s+/g, '-').toLowerCase() || 'field'}-${Math.random().toString(36).substring(2, 9)}`;

    // 计算控件是否显示错误
    const isInvalid = touched && error;
    const invalidFeedback = isInvalid ? error : null;

    // 根据表单控件类型渲染不同的组件
    const renderInput = () => {
        switch (type) {
            case 'select':
                return (
                    <CFormSelect
                        id={inputId}
                        value={value}
                        onChange={onChange}
                        onBlur={onBlur}
                        invalid={!!isInvalid}
                        disabled={disabled}
                        required={required}
                        className={className}
                        {...props}
                    >
                        {placeholder && (
                            <option value="" disabled>
                                {placeholder}
                            </option>
                        )}
                        {options.map((option) => (
                            <option
                                key={option.value}
                                value={option.value}
                                disabled={option.disabled}
                            >
                                {option.label}
                            </option>
                        ))}
                    </CFormSelect>
                );

            case 'checkbox':
                if (Array.isArray(options) && options.length > 0) {
                    // 处理复选框组
                    return options.map((option) => (
                        <CFormCheck
                            key={option.value}
                            id={`${inputId}-${option.value}`}
                            label={option.label}
                            value={option.value}
                            checked={Array.isArray(value) ? value.includes(option.value) : value === option.value}
                            onChange={onChange}
                            onBlur={onBlur}
                            disabled={disabled || option.disabled}
                            invalid={!!isInvalid}
                            className={`${className} ${inline ? 'form-check-inline' : ''}`}
                            {...props}
                        />
                    ));
                }
                // 单个复选框
                return (
                    <CFormCheck
                        id={inputId}
                        label={placeholder || label}
                        checked={!!value}
                        onChange={onChange}
                        onBlur={onBlur}
                        disabled={disabled}
                        invalid={!!isInvalid}
                        className={className}
                        {...props}
                    />
                );

            case 'radio':
                return options.map((option) => (
                    <CFormCheck
                        key={option.value}
                        type="radio"
                        id={`${inputId}-${option.value}`}
                        label={option.label}
                        value={option.value}
                        checked={value === option.value}
                        onChange={onChange}
                        onBlur={onBlur}
                        disabled={disabled || option.disabled}
                        invalid={!!isInvalid}
                        className={`${className} ${inline ? 'form-check-inline' : ''}`}
                        {...props}
                    />
                ));

            case 'textarea':
                return (
                    <CFormTextarea
                        id={inputId}
                        value={value || ''}
                        onChange={onChange}
                        onBlur={onBlur}
                        placeholder={placeholder}
                        invalid={!!isInvalid}
                        disabled={disabled}
                        readOnly={readOnly}
                        required={required}
                        rows={rows}
                        className={className}
                        {...props}
                    />
                );

            default:
                // 默认使用文本输入框
                const baseInput = (
                    <CFormInput
                        type={type}
                        id={inputId}
                        value={value || ''}
                        onChange={onChange}
                        onBlur={onBlur}
                        placeholder={placeholder}
                        invalid={!!isInvalid}
                        disabled={disabled}
                        readOnly={readOnly}
                        required={required}
                        className={className}
                        {...props}
                    />
                );

                // 如果有前缀或后缀，使用InputGroup包装
                if (prefix || suffix) {
                    return (
                        <CInputGroup>
                            {prefix && <CInputGroupText>{prefix}</CInputGroupText>}
                            {baseInput}
                            {suffix && <CInputGroupText>{suffix}</CInputGroupText>}
                        </CInputGroup>
                    );
                }

                return baseInput;
        }
    };

    // 当使用checkbox或radio时不需要标签
    const shouldDisplayLabel = type !== 'checkbox' && type !== 'radio';

    return (
        <div className={`form-group ${containerClassName}`}>
            <CRow>
                {/* 只有在需要显示标签且不是浮动标签时才渲染标签列 */}
                {shouldDisplayLabel && label && !asFloatingLabel && (
                    <CCol xs={labelCols}>
                        <CFormLabel htmlFor={inputId} className={labelClassName}>
                            {label}
                            {required && <span className="text-danger">*</span>}
                        </CFormLabel>
                    </CCol>
                )}

                {/* 输入控件列 */}
                <CCol xs={shouldDisplayLabel && label && !asFloatingLabel ? inputCols : wrapperCols}>
                    {/* 浮动标签模式 */}
                    {asFloatingLabel && label && (type === 'text' || type === 'password' || type === 'email') ? (
                        <div className="form-floating mb-3">
                            {renderInput()}
                            <label htmlFor={inputId}>
                                {label}
                                {required && <span className="text-danger">*</span>}
                            </label>
                        </div>
                    ) : (
                        /* 非浮动标签模式 */
                        renderInput()
                    )}

                    {/* 错误反馈 */}
                    {invalidFeedback && (
                        <CFormFeedback invalid>{invalidFeedback}</CFormFeedback>
                    )}

                    {/* 帮助文本 */}
                    {helpText && !invalidFeedback && (
                        <div className="form-text text-muted small">{helpText}</div>
                    )}
                </CCol>
            </CRow>
        </div>
    );
};

FormGroup.propTypes = {
    id: PropTypes.string,
    label: PropTypes.string,
    type: PropTypes.string,
    value: PropTypes.any,
    onChange: PropTypes.func.isRequired,
    onBlur: PropTypes.func,
    error: PropTypes.string,
    touched: PropTypes.bool,
    options: PropTypes.arrayOf(
        PropTypes.shape({
            value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
            label: PropTypes.node.isRequired,
            disabled: PropTypes.bool
        })
    ),
    placeholder: PropTypes.string,
    disabled: PropTypes.bool,
    readOnly: PropTypes.bool,
    required: PropTypes.bool,
    helpText: PropTypes.node,
    prefix: PropTypes.node,
    suffix: PropTypes.node,
    className: PropTypes.string,
    containerClassName: PropTypes.string,
    labelClassName: PropTypes.string,
    rows: PropTypes.number,
    cols: PropTypes.number,
    asFloatingLabel: PropTypes.bool,
    wrapperCols: PropTypes.number,
    labelCols: PropTypes.number,
    inputCols: PropTypes.number,
    inline: PropTypes.bool
};

export default FormGroup;