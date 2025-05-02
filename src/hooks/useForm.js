import { useState } from 'react';

// 通用表单处理钩子
export const useForm = (initialValues = {}) => {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    // 处理输入字段变化
    const handleChange = (e) => {
        const { name, value } = e.target;
        setValues({
            ...values,
            [name]: value
        });

        // 如果有错误，在用户输入时清除
        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: null
            });
        }
    };

    // 处理字段触摸事件
    const handleBlur = (e) => {
        const { name } = e.target;
        setTouched({
            ...touched,
            [name]: true
        });
    };

    // 设置表单字段值
    const setFieldValue = (name, value) => {
        setValues({
            ...values,
            [name]: value
        });
    };

    // 设置多个表单字段值
    const setMultipleFields = (newValues) => {
        setValues({
            ...values,
            ...newValues
        });
    };

    // 设置表单字段错误
    const setFieldError = (name, error) => {
        setErrors({
            ...errors,
            [name]: error
        });
    };

    // 重置表单
    const resetForm = (newValues = initialValues) => {
        setValues(newValues);
        setErrors({});
        setTouched({});
    };

    return {
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        setFieldValue,
        setMultipleFields,
        setFieldError,
        resetForm
    };
};