import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

interface AuthUser {
  id: string;
  email: string;
  staffId: number | null;
  roles: string[];
  isAdmin: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  staffId: number | null;
  isAdmin: boolean;
  isModerator: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithHust: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setAuthFromTokens: (accessToken: string, refreshToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchMe = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const data = await api.get<AuthUser>('/auth/me');
      return data;
    } catch {
      return null;
    }
  }, []);

  // Register session expired handler so ApiClient can trigger redirect via React
  useEffect(() => {
    api.setSessionExpiredHandler(() => {
      setUser(null);
      navigate('/auth', { replace: true });
    });
    return () => api.setSessionExpiredHandler(null);
  }, [navigate]);

  useEffect(() => {
    const init = async () => {
      if (api.hasTokens()) {
        const me = await fetchMe();
        setUser(me);
        if (!me) {
          api.clearTokens();
        }
      }
      setLoading(false);
    };
    init();
  }, [fetchMe]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const data = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
      }>('/auth/login', { email, password });

      api.setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signInWithHust = useCallback(async (email: string, password: string) => {
    try {
      const data = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
      }>('/auth/hust-login', { email, password });

      api.setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const data = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
      }>('/auth/register', { email, password });

      api.setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    api.clearTokens();
    setUser(null);
  }, []);

  const setAuthFromTokens = useCallback(async (accessToken: string, refreshToken: string) => {
    api.setTokens(accessToken, refreshToken);
    const me = await fetchMe();
    setUser(me);
  }, [fetchMe]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      staffId: user?.staffId ?? null,
      isAdmin: user?.isAdmin ?? false,
      isModerator: user?.roles?.includes('moderator') ?? false,
      signIn,
      signInWithHust,
      signUp,
      signOut,
      setAuthFromTokens,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
