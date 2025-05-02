import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import { authService } from '../services';

// 权限检查钩子
export const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // 检查用户是否已登录
        const checkAuth = async () => {
            setLoading(true);
            try {
                const isAuth = authService.isAuthenticated();
                setIsAuthenticated(isAuth);

                if (isAuth) {
                    const userInfo = authService.getUserInfo();
                    if (userInfo) {
                        setUser(userInfo);
                    } else {
                        // 如果本地没有用户信息，则从服务器获取
                        const currentUser = await authService.getCurrentUser();
                        setUser(currentUser);
                    }
                }
            } catch (error) {
                console.error('认证检查失败:', error);
                // 如果获取用户信息失败，清除身份验证状态
                authService.logout();
                setIsAuthenticated(false);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    // 登录函数
    const login = async (credentials) => {
        try {
            const response = await authService.login(credentials);
            setIsAuthenticated(true);
            setUser(response.user);
            navigate(ROUTES.DASHBOARD);
            return { success: true };
        } catch (error) {
            console.error('登录失败:', error);
            return {
                success: false,
                error: error.response?.data?.message || '登录失败，请检查您的凭据'
            };
        }
    };

    // 注销函数
    const logout = () => {
        authService.logout();
        setIsAuthenticated(false);
        setUser(null);
        navigate(ROUTES.LOGIN);
    };

    return { isAuthenticated, user, loading, login, logout };
};