import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import '@coreui/coreui/dist/css/coreui.min.css';

// 导入布局组件
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './layouts/ProtectedRoute';

// 导入页面组件
import Dashboard from './pages/Dashboard';
import TaskHistory from './pages/TaskHistory';
import Login from './pages/Login';
import CondaManager from './components/CondaManager';
import TaskScheduler from './components/TaskScheduler';

// 导入路由常量
import { ROUTES } from './constants';

const App = () => {
    return (
        <Routes>
            {/* 定义应用的路由结构 */}
            <Route element={<MainLayout />}>
                {/* 公开路由 */}
                <Route path={ROUTES.LOGIN} element={<Login />} />

                {/* 受保护路由 */}
                <Route
                    path={ROUTES.DASHBOARD}
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={ROUTES.TASK_HISTORY}
                    element={
                        <ProtectedRoute>
                            <TaskHistory />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={ROUTES.CONDA_MANAGER}
                    element={
                        <ProtectedRoute>
                            <CondaManager />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={ROUTES.TASK_SCHEDULER}
                    element={
                        <ProtectedRoute>
                            <TaskScheduler />
                        </ProtectedRoute>
                    }
                />

                {/* 根路径重定向到仪表盘 */}
                <Route
                    path={ROUTES.HOME}
                    element={<Navigate to={ROUTES.DASHBOARD} replace />}
                />

                {/* 捕获所有其他路径并重定向到仪表盘 */}
                <Route
                    path="*"
                    element={<Navigate to={ROUTES.DASHBOARD} replace />}
                />
            </Route>
        </Routes>
    );
};

export default App;