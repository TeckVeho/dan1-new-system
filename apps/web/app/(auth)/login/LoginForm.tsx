"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { login } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { LoginType } from "@/lib/types";

const TABS: { value: LoginType; label: string; placeholder: string; hint: string }[] = [
  { value: "employee", label: "社員番号", placeholder: "例: 100002", hint: "6桁の社員番号でログインします" },
  { value: "haccp", label: "HACCP番号", placeholder: "例: 00020", hint: "5桁のHACCP番号でログインします" },
  { value: "facility", label: "施設", placeholder: "例: 10234", hint: "施設コードまたはメールアドレスでログインします" },
];

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [loginType, setLoginType] = useState<LoginType>("employee");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeTab = TABS.find((t) => t.value === loginType) ?? TABS[0];

  function handleTabChange(value: LoginType) {
    setLoginType(value);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!loginId.trim()) {
      setError(`${activeTab.label}を入力してください`);
      return;
    }
    if (!password) {
      setError("パスワードを入力してください");
      return;
    }

    setLoading(true);
    const result = await login({ loginId: loginId.trim(), password, loginType });
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(nextPath.startsWith("/") ? nextPath : "/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="w-full max-w-[380px] animate-fade-in-up">
        <div className="rounded-lg border border-border bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">
              D
            </div>
            <h1 className="text-base font-semibold text-text">談 業務システム</h1>
            <p className="mt-1 text-[13px] text-muted">アカウント情報を入力してログイン</p>
          </div>

          <div className="mb-5 grid grid-cols-3 gap-1 rounded-md bg-bg p-1">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleTabChange(tab.value)}
                className={cn(
                  "rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors",
                  loginType === tab.value
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted hover:text-text",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error ? (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-md border border-danger/20 bg-danger/5 px-3 py-2.5 text-[13px] text-danger"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Input
              label={activeTab.label}
              name="loginId"
              type="text"
              autoComplete="username"
              placeholder={activeTab.placeholder}
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
            />
            <p className="!-mt-3 text-xs text-muted">{activeTab.hint}</p>

            <div className="w-full">
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-muted">
                パスワード
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-border bg-white px-3 py-2 pr-10 text-sm text-text placeholder:text-muted/50 outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted transition-colors hover:text-text"
                  aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="group w-full gap-1.5" loading={loading}>
              ログイン
              {!loading ? (
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              ) : null}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted">&copy; {new Date().getFullYear()} 談 業務システム</p>
      </div>
    </div>
  );
}
