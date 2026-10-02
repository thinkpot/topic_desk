"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

export interface UserPlan {
  id: string;
  slug: string;
  name: string;
  priceINR: number;
  priceYearlyINR: number;
  maxChatbots: number;
  maxMonthlyUsers: number;
  isPaid: boolean;
  maxLiveVisitors: number;
  supportsDashboardChat: boolean;
}

export interface Me {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  isSuspended: boolean;
  planExpiresAt: string | null;
  trialStartedAt: string | null;
  emailVerifiedAt: string | null;
  companyName: string | null;
  websiteUrl: string | null;
  plan: UserPlan;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  companyName?: string;
  websiteUrl?: string;
}

export interface Usage {
  chatbots: number;
  monthlyConversations: number;
}

export interface PendingUpgrade {
  id: string;
  planId: string;
  planName: string;
  billingCycle: "MONTHLY" | "YEARLY";
  createdAt: string;
}

interface AuthContextValue {
  user: Me | null;
  usage: Usage | null;
  blockReason: string | null;
  pendingUpgrade: PendingUpgrade | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [pendingUpgrade, setPendingUpgrade] = useState<PendingUpgrade | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user);
      setUsage(res.data.usage);
      setBlockReason(res.data.blockReason);
      setPendingUpgrade(res.data.pendingUpgrade);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function login(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    await refresh();
    router.push(res.data.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  async function register(input: RegisterInput) {
    const res = await api.post("/auth/register", input);
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    await refresh();
    // ?welcome=1 opens the dashboard on the onboarding checklist's intro.
    router.push("/dashboard?welcome=1");
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    setUsage(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, usage, blockReason, pendingUpgrade, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
