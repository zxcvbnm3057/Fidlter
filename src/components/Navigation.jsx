import React from 'react';
import { Link } from 'react-router-dom';
import { CNav, CNavItem, CNavLink } from '@coreui/react';

const Navigation = () => {
    return (
        <CNav variant="pills" className="mb-4">
            <CNavItem>
                <CNavLink href="/" component={Link}>
                    仪表盘
                </CNavLink>
            </CNavItem>
            <CNavItem>
                <CNavLink href="/task-scheduler" component={Link}>
                    任务调度
                </CNavLink>
            </CNavItem>
            <CNavItem>
                <CNavLink href="/task-history" component={Link}>
                    历史记录
                </CNavLink>
            </CNavItem>
            <CNavItem>
                <CNavLink href="/conda-manager" component={Link}>
                    Conda环境管理
                </CNavLink>
            </CNavItem>
        </CNav>
    );
};

export default Navigation;