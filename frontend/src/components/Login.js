import React, { useRef } from 'react';

const Login = ({ loginData, setLoginData, handleLogin, loading, error }) => {
  const secretClickCounter = useRef({ count: 0, timer: null });

  const isMasterMode = (loginData.loginType || 'admin_or_agent') === 'master';

  const handleTitleSecretToggle = () => {
    // 5 rapid clicks toggles master mode on/off
    const state = secretClickCounter.current;
    if (state.timer) {
      clearTimeout(state.timer);
    }
    state.count += 1;
    state.timer = setTimeout(() => {
      state.count = 0;
    }, 1000);
    if (state.count >= 5) {
      const nextType = isMasterMode ? 'admin_or_agent' : 'master';
      setLoginData({ ...loginData, loginType: nextType, userId: '' });
      state.count = 0;
    }
  };

  const handleUserIdChange = (e) => {
    const raw = e.target.value;
    const value = isMasterMode ? raw : raw.replace(/\D+/g, '');
    setLoginData({ ...loginData, userId: value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8 select-none">
          <h1
            className="text-3xl font-bold text-gray-800 mb-2 cursor-default"
            onClick={handleTitleSecretToggle}
            title=""
          >
            Voicesnap
          </h1>
          <p className="text-gray-600">Please sign in to continue</p>
          {isMasterMode && (
            <div className="mt-2 inline-block text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 border border-gray-200">
              Master mode
            </div>
          )}
        </div>
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isMasterMode ? 'Master Username' : 'User ID / Agent Number'}
            </label>
            <input
              type="text"
              inputMode={isMasterMode ? 'text' : 'numeric'}
              pattern={isMasterMode ? undefined : "\\d*"}
              value={loginData.userId}
              onChange={handleUserIdChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={isMasterMode ? 'Enter master username' : 'Numbers only'}
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={loginData.password}
              onChange={e => setLoginData({ ...loginData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;