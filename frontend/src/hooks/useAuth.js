import { useState, useEffect } from 'react';
import { handleLogin as apiHandleLogin } from '../utils/api';

export default function useAuth() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [user, setUser] = useState(null);
  const [loginData, setLoginData] = useState({ userId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ✅ Restore login state on app load
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setCurrentScreen('dashboard');
      } catch (err) {
        console.error('Invalid user data in localStorage');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await apiHandleLogin(loginData);

    if (result.success) {
      setUser(result.data.user);
      localStorage.setItem('token', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));
      setCurrentScreen('dashboard');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentScreen('login');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setLoginData({ userId: '', password: '' });
  };

  return {
    currentScreen,
    setCurrentScreen,
    user,
    setUser,
    loginData,
    setLoginData,
    handleLogin,
    handleLogout,
    loading,
    error,
    setError
  };
}
