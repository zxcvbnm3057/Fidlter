import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navigation from '../components/Navigation';
import { CContainer, CSpinner } from '@coreui/react';
import { useSessionCheck } from '../hooks';

// 主应用布局组件
const MainLayout = () => {
    const { isAuthenticated, loading } = useSelector(state => state.auth);

    // 使用会话检查钩子
    useSessionCheck();

    // 如果正在检查认证状态，显示加载指示器
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <CSpinner color="primary" />
            </div>
        );
    }

    // 如果用户已认证，显示主布局，包含原始布局风格
    // 如果用户未认证，Outlet组件会渲染Login页面
    return isAuthenticated ? (
        <div className="c-app">
            <div className="c-wrapper">
                <div className="c-body">
                    <main className="c-main">
                        <CContainer className="mt-4">
                            <h1 className="mb-4">Fidlter 任务调度与环境管理系统</h1>
                            <Navigation />
                            <Outlet />
                        </CContainer>
                    </main>
                </div>
            </div>
        </div>
    ) : (
        <Outlet />
    );
};

export default MainLayout;