"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchCurrentUser, logout as logoutRequest } from "@/lib/auth";
import type { AuthUser } from "@/lib/types";

type AuthContextValue = {
  user: AuthUser;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 認証済みであることを確認し、ユーザー情報をコンテキストで配布する。
 * 未認証の場合は /login にリダイレクトする（misaki-reports の AuthGuard 相当）。
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const u = await fetchCurrentUser();
    setUser(u);
    if (!u) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await fetchCurrentUser();
      if (cancelled) return;
      if (!u) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      setUser(u);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // 初回マウント時のみチェックする。ページ遷移ごとの再チェックは行わない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await logoutRequest();
    setUser(null);
    router.push("/login");
  }

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-[13px] text-muted">
        読み込み中…
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, refresh, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth は AuthProvider の内側で使用してください");
  }
  return ctx;
}
