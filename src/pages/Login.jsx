import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginRequest } from '../redux/auth/reducer';
import {
    CForm,
    CFormLabel,
    CFormInput,
    CButton,
    CCard,
    CCardBody,
    CCardTitle,
    CAlert,
    CSpinner,
    CContainer,
    CRow,
    CCol
} from '@coreui/react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // 从Redux store中获取认证状态
    const { loading, error, isAuthenticated } = useSelector(state => state.auth);

    // 如果用户已认证，则重定向到首页
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const handleLogin = (e) => {
        e.preventDefault();
        // 分发登录请求action，由saga处理API调用
        dispatch(loginRequest({ username, password }));
    };

    return (
        <CContainer>
            <CRow className="justify-content-center mt-5">
                <CCol md={6} lg={4}>
                    <CCard>
                        <CCardBody className="p-4">
                            <CCardTitle component="h2" className="text-center mb-4">登录系统</CCardTitle>
                            {error && <CAlert color="danger">{error}</CAlert>}
                            <CForm onSubmit={handleLogin}>
                                <div className="mb-3">
                                    <CFormLabel htmlFor="username">用户名</CFormLabel>
                                    <CFormInput
                                        type="text"
                                        id="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <CFormLabel htmlFor="password">密码</CFormLabel>
                                    <CFormInput
                                        type="password"
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <CButton
                                    type="submit"
                                    color="primary"
                                    className="w-100 mt-3"
                                    disabled={loading}
                                >
                                    {loading ? <CSpinner size="sm" /> : '登录'}
                                </CButton>
                            </CForm>
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>
        </CContainer>
    );
};

export default Login;