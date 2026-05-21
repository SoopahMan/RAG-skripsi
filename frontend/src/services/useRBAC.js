import { useState, useEffect } from 'react';

export function useRBAC() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');

    if (savedUser && token) {
      const parsed = JSON.parse(savedUser);
      // pastikan shape sesuai RequireAuth
      setUser({
        role: parsed.role,
        name: parsed.username || parsed.name,
        expired: false,
      });
    }

    setLoading(false);
  }, []);

  const login = (userData) => {
    // userData: { role, username }
    const formatUser = {
      role: userData.role,
      username: userData.username,
      expired: false,
    };

    // simpan agar refresh tetap bisa dibaca
    localStorage.setItem('user', JSON.stringify(formatUser));

    // token akan disimpan oleh backend/auth layer lain (optional)
    setUser({
      role: userData.role,
      name: userData.username,
      expired: false,
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
  };

  const hasPermission = (allowedRoles) => {
    return user && allowedRoles.includes(user.role);
  };

  return { user, loading, hasPermission, login, logout };
}

