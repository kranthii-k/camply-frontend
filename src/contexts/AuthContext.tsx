import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { User, getMe, logout as logoutService, refreshToken } from '@/services/auth';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(localStorage.getItem('accessToken'));
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Load user on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      loadUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadUser = async (isRetry = false) => {
    try {
      const data = await getMe();
      setUser(data.user);
    } catch (error) {
      console.error('Failed to load user:', error);
      if (localStorage.getItem('accessToken') && !isRetry) {
        try {
          const { accessToken } = await refreshToken();
          setAccessToken(accessToken);
          await loadUser(true);
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          setUser(null);
        }
      } else {
        localStorage.removeItem('accessToken');
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const setAccessToken = useCallback((token: string | null) => {
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
    setAccessTokenState(token);
  }, []);

  const refreshUser = useCallback(async () => {
    if (localStorage.getItem('accessToken')) {
      await loadUser();
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutService();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      setAccessTokenState(null);
      setUser(null);
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const handleLogoutEvent = () => {
      logout();
    };
    window.addEventListener("auth:logout", handleLogoutEvent);
    return () => {
      window.removeEventListener("auth:logout", handleLogoutEvent);
    };
  }, [logout]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (user) {
      intervalId = setInterval(async () => {
        try {
          const { accessToken } = await refreshToken();
          setAccessToken(accessToken);
        } catch (error) {
          console.error("Interval refresh failed", error);
          logout();
        }
      }, 13 * 60 * 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, logout, setAccessToken]);

  const value = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!user,
    setUser,
    setAccessToken,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
