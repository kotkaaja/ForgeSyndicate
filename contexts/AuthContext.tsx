import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────
export interface DiscordUser {
  discordId:     string;
  username:      string;
  avatarUrl:     string | null;
  guildRoles:    string[];        // semua role di server: ["VIP", "Member", ...]
  tier:          'VIP' | 'BASIC' | 'GUEST';
  expiry:        string | null;   // ISO timestamp dari claims.json
  guildJoinedAt: string | null;
  lastLogin:     string | null;
}

interface AuthContextType {
  user:      DiscordUser | null;
  loading:   boolean;
  login:     () => void;
  logout:    () => Promise<void>;
  isVIP:     boolean;
  isBasic:   boolean;
  canDownloadPremium: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user:    null,
  loading: true,
  login:   () => {},
  logout:  async () => {},
  isVIP:   false,
  isBasic: false,
  canDownloadPremium: false,
});

const SESSION_KEY = 'ds_session_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<DiscordUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session dari localStorage saat mount ──────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      fetchSession(stored);
    } else {
      setLoading(false);
    }
  }, []);

  // ── Handle redirect balik dari Discord OAuth ──────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');

    if (window.location.pathname === '/auth/success' && sessionId) {
      localStorage.setItem(SESSION_KEY, sessionId);
      fetchSession(sessionId).then(() => {
        // Bersihkan URL
        window.history.replaceState({}, '', '/');
      });
    }
  }, []);

  const fetchSession = async (sessionId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/session?id=${sessionId}`);
      if (!res.ok) {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
        return;
      }
      const data = await res.json();
      setUser({
        discordId:     data.discord_id,
        username:      data.username,
        avatarUrl:     data.avatar_url,
        guildRoles:    data.guild_roles || [],
        tier:          data.tier || 'GUEST',
        expiry:        data.expiry,
        guildJoinedAt: data.guild_joined_at,
        lastLogin:     data.last_login,
      });
    } catch {
      localStorage.removeItem(SESSION_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(() => {
    window.location.href = '/api/auth/login';
  }, []);

  const logout = useCallback(async () => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (sessionId) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
      } catch {}
    }
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  // Helper flags
  const isVIP   = user?.tier === 'VIP';
  const isBasic = user?.tier === 'BASIC' || user?.tier === 'VIP';
  const canDownloadPremium = isVIP;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isVIP, isBasic, canDownloadPremium }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);