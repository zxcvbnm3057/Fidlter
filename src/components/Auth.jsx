import React, { useState } from 'react';
import axios from '../utils/axios';
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
import { useNavigate } from 'react-router-dom';

const Auth = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 修改为后端API文档中定义的路径
            const response = await axios.post('/login', { username, password });

            // 不再存储token，使用Cookie认证 (Cookie由后端设置)
            if (response.data.message === "Login successful") {
                // 重定向到首页
                navigate('/');
            } else {
                setError('登录失败，请检查用户名和密码');
            }
        } catch (err) {
            setError('登录失败，请检查用户名和密码');
        } finally {
            setLoading(false);
        }
    };

    return (
        <CContainer>
            <CRow className="justify-content-center mt-5">
                <CCol md={6} lg={4}>
                    <CCard>
                        <CCardBody className="p-4">
                            <CCardTitle component="h2" className="text-center mb-4">登录系统</CCardTitle>
                            {error && <CAlert color="danger">{error}</CAlert>}
                            <CForm onSubmit={handleSubmit}>
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

export default Auth;