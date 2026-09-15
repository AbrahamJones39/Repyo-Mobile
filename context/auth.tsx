import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError, getToken, setApiUrl, setToken } from "@/lib/api";
import type { SessionUser } from "@/lib/types";

type AuthContextValue = {
  user: SessionUser | null;
  ready: boolean;
  login: (email: string, password: string, serverUrl?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  async function refresh() {
    const token = await getToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const data = await api<{ user: SessionUser }>("/api/mobile/auth/me");
      if (data.user.role !== "REP") {
        await setToken(null);
        setUser(null);
        return;
      }
      setUser(data.user);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await setToken(null);
      }
      setUser(null);
    }
  }

  useEffect(() => {
    refresh().finally(() => setReady(true));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      async login(email, password, serverUrl) {
        if (serverUrl) {
          await setApiUrl(serverUrl);
        }
        const data = await api<{ token: string; user: SessionUser }>(
          "/api/mobile/auth/login",
          {
            method: "POST",
            body: JSON.stringify({ email, password }),
          }
        );
        if (data.user.role !== "REP") {
          throw new Error("This app is for device representatives only");
        }
        await setToken(data.token);
        setUser(data.user);
      },
      async logout() {
        await setToken(null);
        setUser(null);
      },
      refresh,
    }),
    [user, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
