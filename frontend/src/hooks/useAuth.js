import { useState, useEffect } from 'react';
import { handleLogin as apiHandleLogin } from '../utils/api';

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loginData, setLoginData] = useState({ userId: '', password: '', loginType: 'admin_or_agent' });
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
        // setCurrentScreen('dashboard'); // This is a problem, will address in App.js
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
      // setCurrentScreen('dashboard'); // This is a problem, will address in App.js
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  const handleLogout = () => {
    setUser(null);
    // setCurrentScreen('login');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setLoginData({ userId: '', password: '' });
  };

  return {
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
