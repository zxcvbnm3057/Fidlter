import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { authService } from '../services';
import { loginSuccess, logoutSuccess } from '../redux/auth/reducer';

// 会话检查间隔时间（毫秒）
const SESSION_CHECK_INTERVAL = 60000; // 1分钟

/**
 * 自定义钩子，用于验证用户会话状态
 * 会在以下情况检查会话：
 * 1. 组件挂载时
 * 2. 路由变更时
 * 3. 定期检查（可选）
 */
const useSessionCheck = (options = { periodic: true }) => {
    const dispatch = useDispatch();
    const location = useLocation();
    const { isAuthenticated, user } = useSelector(state => state.auth);

    // 检查会话状态的函数
    const checkSession = async () => {
        try {
            // 只有当用户被认为已登录时才进行检查
            if (isAuthenticated) {
                const isValid = await authService.checkSession();

                // 如果会话无效但Redux状态表明用户已登录，则登出用户
                if (!isValid) {
                    dispatch(logoutSuccess());
                    console.log('会话已过期，用户被登出');
                }
            } else if (localStorage.getItem('isAuthenticated')) {
                // 如果localStorage有登录标记但Redux状态未同步，尝试恢复会话
                const isValid = await authService.checkSession();

                if (isValid) {
                    // 获取当前用户信息
                    const userData = await authService.getCurrentUser();
                    if (userData) {
                        dispatch(loginSuccess({ user: userData.user }));
                        console.log('会话已恢复');
                    }
                } else {
                    // 会话无效，清除localStorage中的标记
                    localStorage.removeItem('isAuthenticated');
                    localStorage.removeItem('user');
                }
            }
        } catch (error) {
            console.error('检查会话时出错:', error);
            // 遇到错误时保守处理，登出用户
            if (isAuthenticated) {
                dispatch(logoutSuccess());
            }
        }
    };

    // 组件挂载和路由变更时检查会话
    useEffect(() => {
        checkSession();
    }, [location.pathname]);

    // 定期检查会话（如果启用）
    useEffect(() => {
        if (options.periodic) {
            const intervalId = setInterval(checkSession, SESSION_CHECK_INTERVAL);
            return () => clearInterval(intervalId);
        }
    }, [isAuthenticated]);

    return { checkSession };
};

export default useSessionCheck;