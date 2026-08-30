"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

type User = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role: string;
  uid?: string | null;
  balance?: number;
  bonusBalance?: number;
  kycStatus?: string;
  nickname?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  country?: string | null;
  currencyPref?: string;
  referralCode?: string | null;
};

type Session = {
  user: User;
  session: { token: string; expiresAt: string };
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isPlayer: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  isPlayer: false,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = async () => {
    try {
      const { data } = await authClient.getSession();
      if (data) {
        setSession(data as unknown as Session);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const refresh = async () => {
    await loadSession();
  };

  const signOut = async () => {
    await authClient.signOut();
    setSession(null);
    window.location.href = "/login";
  };

  const user = session?.user ?? null;
  const isAdmin = user?.role === "super_admin" || user?.role === "finance" || user?.role === "risk" || user?.role === "support";
  const isPlayer = user?.role === "player" || !user?.role;

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isPlayer, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
