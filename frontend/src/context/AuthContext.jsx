import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { TOKEN_KEY } from '../config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  // Validate the stored token on load.
  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    api('/auth/me', { token })
      .then((d) => !cancelled && setUser(d.user))
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const finish = useCallback((data) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setToken(data.token);
  }, []);

  const login = useCallback(async (email, password) => finish(await api('/auth/login', { method: 'POST', body: { email, password } })), [finish]);
  const register = useCallback(async (name, email, password) => finish(await api('/auth/register', { method: 'POST', body: { name, email, password } })), [finish]);
  const loginWithGoogle = useCallback(async (credential) => finish(await api('/auth/google', { method: 'POST', body: { credential } })), [finish]);
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, loginWithGoogle, logout }),
    [user, token, loading, login, register, loginWithGoogle, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
