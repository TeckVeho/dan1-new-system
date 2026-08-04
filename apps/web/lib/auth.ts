import type { AuthUser } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function getApiBase() {
  return API_BASE;
}

/**
 * セッションは HttpOnly Cookie で管理する（10_auth_roles.md §2.4）。
 * トークンをクライアント側に保持しないため、常に `credentials: "include"` で送る。
 */
export async function login(input: {
  loginId: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.success === false) {
      return {
        ok: false,
        message: body?.error?.message ?? "ログインIDまたはパスワードが正しくありません",
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "サーバーに接続できません。時間をおいて再度お試しください。" };
  }
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = await res.json().catch(() => ({}));
    return (body?.data as AuthUser | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function startImpersonation(
  customerId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/impersonate`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.success === false) {
      return { ok: false, message: body?.error?.message ?? "成り代わりに失敗しました" };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "サーバーに接続できません" };
  }
}

export async function endImpersonation(): Promise<void> {
  await fetch(`${API_BASE}/api/v1/auth/impersonate`, {
    method: "DELETE",
    credentials: "include",
  }).catch(() => undefined);
}
