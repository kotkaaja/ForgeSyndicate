import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────
export interface DiscordUser {
  discordId:     string;
  username:      string;
  avatarUrl:     string | null;
  guildRoles:    string[];
  tier:          'VIP' | 'BASIC' | 'GUEST';
  expiry:        string | null;
  guildJoinedAt: string | null;
  lastLogin:     string | null;
}

interface AuthContextType {
  user:               DiscordUser | null;
  loading:            boolean;
  login:              () => void;
  logout:             () => Promise<void>;
  isVIP:              boolean;
  isBasic:            boolean;
  canDownloadPremium: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user:               null,
  loading:            false,   // ← default FALSE biar tidak spinner kalau tidak ada session
  login:              () => {},
  logout:             async () => {},
  isVIP:              false,
  isBasic:            false,
  canDownloadPremium: false,
});

const SESSION_KEY = 'ds_session_id';

// ── Helper: ambil session ID dari URL (support HashRouter & BrowserRouter) ──
const getSessionFromUrl = (): string | null => {
  // HashRouter:    https://domain.com/#/auth/success?session=xxx
  //                hash = "#/auth/success?session=xxx"
  const hash = window.location.hash;
  if (hash.includes('/auth/success')) {
    const queryPart = hash.split('?')[1] || '';
    return new URLSearchParams(queryPart).get('session');
  }

  // BrowserRouter: https://domain.com/auth/success?session=xxx
  if (window.location.pathname.includes('/auth/success')) {
    return new URLSearchParams(window.location.search).get('session');
  }

  return null;
};

// ── Helper: bersihkan URL setelah OAuth callback ──────────────────────────
const clearAuthUrl = () => {
  // HashRouter → redirect ke /#/
  if (window.location.hash.includes('/auth/success')) {
    window.location.replace(window.location.origin + '/#/');
    return;
  }
  // BrowserRouter → replace state
  window.history.replaceState({}, '', '/');
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<DiscordUser | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSession = useCallback(async (sessionId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await fetch(`/api/auth?action=session&id=${sessionId}`);
      if (!res.ok) {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
        return false;
      }
      const data = await res.json();
      if (data.error) {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
        return false;
      }
      setUser({
        discordId:     data.discord_id,
        username:      data.username,
        avatarUrl:     data.avatar_url,
        guildRoles:    data.guild_roles || [],
        tier:          data.tier        || 'GUEST',
        expiry:        data.expiry      || null,
        guildJoinedAt: data.guild_joined_at || null,
        lastLogin:     data.last_login  || null,
      });
      return true;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Cek apakah ini redirect balik dari Discord OAuth
    const sessionFromUrl = getSessionFromUrl();
    if (sessionFromUrl) {
      localStorage.setItem(SESSION_KEY, sessionFromUrl);
      fetchSession(sessionFromUrl).then(() => {
        clearAuthUrl();
      });
      return;
    }

    // 2. Cek kalau ada session tersimpan di localStorage
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      fetchSession(stored);
      return;
    }

    // 3. Tidak ada session → langsung set loading false
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(() => {
    // Simpan halaman asal untuk redirect setelah login
    const currentHash = window.location.hash;
    if (currentHash && currentHash !== '#/' && !currentHash.includes('/login')) {
      sessionStorage.setItem('login_redirect', currentHash);
    }
    window.location.href = '/api/auth?action=login';
  }, []);

  const logout = useCallback(async () => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (sessionId) {
      try {
        await fetch('/api/auth?action=logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
      } catch {}
    }
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const isVIP              = user?.tier === 'VIP';
  const isBasic            = user?.tier === 'BASIC' || user?.tier === 'VIP';
  const canDownloadPremium = isVIP;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isVIP, isBasic, canDownloadPremium }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);