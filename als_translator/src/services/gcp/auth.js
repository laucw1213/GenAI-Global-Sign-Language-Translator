import { useState, useEffect } from 'react';

const AUTH_URL = process.env.REACT_APP_AUTH_URL;

const useAuth = () => {
  const [token, setToken] = useState(null);
  const [lastTokenRefresh, setLastTokenRefresh] = useState(0);
  const [error, setError] = useState(null);

  const refreshToken = async () => {
    try {
      const response = await fetch(AUTH_URL, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.token) {
        setToken(data.token);
        setLastTokenRefresh(Date.now());
        setError(null);
      } else {
        throw new Error('Token not received');
      }
    } catch (err) {
      console.error("Authentication error:", err);
      setError("Authentication failed: " + err.message);
      setToken(null);
    }
  };

  useEffect(() => {
    refreshToken();
    const tokenRefreshInterval = setInterval(refreshToken, 50 * 60 * 1000); // 每50分钟刷新一次
    return () => clearInterval(tokenRefreshInterval);
  }, []);

  return {
    token,
    error,
    refreshToken,
    isAuthenticated: !!token
  };
};

export default useAuth;
