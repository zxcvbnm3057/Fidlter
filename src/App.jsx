import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { CContainer } from '@coreui/react';
import '@coreui/coreui/dist/css/coreui.min.css';
import Dashboard from './pages/Dashboard';
import TaskHistory from './pages/TaskHistory';
import Login from './pages/Login';
import CondaManager from './components/CondaManager';
import TaskScheduler from './components/TaskScheduler';
import Auth from './components/Auth';
import Navigation from './components/Navigation';

const App = () => {
    return (
        <CContainer className="mt-4">
            <h1 className="mb-4">Fidlter 任务调度与环境管理系统</h1>
            <Navigation />
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/task-history" element={<TaskHistory />} />
                <Route path="/login" element={<Login />} />
                <Route path="/conda-manager" element={<CondaManager />} />
                <Route path="/task-scheduler" element={<TaskScheduler />} />
                <Route path="/auth" element={<Auth />} />
            </Routes>
        </CContainer>
    );
};

export default App;