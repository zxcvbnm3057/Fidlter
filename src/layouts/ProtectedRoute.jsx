import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ROUTES } from '../constants';
import { CSpinner } from '@coreui/react';

// 受保护的路由组件
// 如果用户已认证，则渲染子组件
// 如果用户未认证，则重定向到登录页面
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useSelector(state => state.auth);
    const location = useLocation();

    // 如果正在检查认证状态，显示加载指示器
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <CSpinner color="primary" />
            </div>
        );
    }

    // 如果用户未认证，重定向到登录页面
    if (!isAuthenticated) {
        // 将用户当前试图访问的路径保存在重定向状态中，以便在登录后返回
        return (
            <Navigate
                to={ROUTES.LOGIN}
                state={{ from: location }}
                replace
            />
        );
    }

    // 如果用户已认证，渲染子组件
    return children;
};

export default ProtectedRoute;