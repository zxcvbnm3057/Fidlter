import React from 'react';
import { NavLink } from 'react-router-dom';
import { CNav, CNavItem } from '@coreui/react';
import { ROUTES } from '../constants';

const Navigation = () => {
    return (
        <CNav variant="pills" className="mb-4">
            <CNavItem>
                <NavLink
                    to={ROUTES.DASHBOARD}
                    className={({ isActive }) =>
                        `nav-link ${isActive ? 'active' : ''}`
                    }
                >
                    仪表盘
                </NavLink>
            </CNavItem>
            <CNavItem>
                <NavLink
                    to={ROUTES.TASK_SCHEDULER}
                    className={({ isActive }) =>
                        `nav-link ${isActive ? 'active' : ''}`
                    }
                >
                    任务调度
                </NavLink>
            </CNavItem>
            <CNavItem>
                <NavLink
                    to={ROUTES.TASK_HISTORY}
                    className={({ isActive }) =>
                        `nav-link ${isActive ? 'active' : ''}`
                    }
                >
                    历史记录
                </NavLink>
            </CNavItem>
            <CNavItem>
                <NavLink
                    to={ROUTES.CONDA_MANAGER}
                    className={({ isActive }) =>
                        `nav-link ${isActive ? 'active' : ''}`
                    }
                >
                    Conda环境管理
                </NavLink>
            </CNavItem>
        </CNav>
    );
};

export default Navigation;