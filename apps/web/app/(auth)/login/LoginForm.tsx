"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/brand-logo";
import { login } from "@/lib/auth";

const FIELD_CLASS =
  "h-11 rounded-lg py-0 text-[14px] focus:border-primary focus:ring-2 focus:ring-primary/15";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!loginId.trim()) {
      setError("ログインIDを入力してください");
      return;
    }
    if (!password) {
      setError("パスワードを入力してください");
      return;
    }

    setLoading(true);
    const result = await login({ loginId: loginId.trim(), password });
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(nextPath.startsWith("/") ? nextPath : "/dashboard");
  }

  return (
    <div className="auth-backdrop flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px] animate-auth-rise">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo priority className="mb-4 h-12" />
          <h1 className="text-[19px] font-semibold tracking-tight text-text">業務システム</h1>
          <p className="mt-1.5 text-[13px] text-muted">アカウント情報を入力してログイン</p>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/80 p-6 shadow-[0_1px_2px_rgba(112,78,48,0.05),0_16px_40px_-16px_rgba(112,78,48,0.22)] backdrop-blur-xl sm:p-7">
          {error ? (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2.5 text-[13px] text-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Input
              label="ログインID"
              hint="社員番号・HACCP番号・施設コードまたはメールアドレス"
              name="loginId"
              type="text"
              autoComplete="username"
              autoFocus
              placeholder="例: 100002"
              leadingIcon={<UserRound className="h-4 w-4" />}
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              disabled={loading}
              className={FIELD_CLASS}
            />

            <Input
              label="パスワード"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="パスワードを入力"
              leadingIcon={<Lock className="h-4 w-4" />}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="rounded-md p-1.5 text-muted transition-colors hover:bg-bg hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className={FIELD_CLASS}
            />

            <Button
              type="submit"
              loading={loading}
              className="group mt-1 h-11 w-full gap-2 rounded-lg text-[14px] shadow-sm shadow-primary/20 transition-shadow hover:shadow-md hover:shadow-primary/25"
            >
              ログイン
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-[13px]">
          <Link href="/password-reset" className="text-primary hover:underline">
            パスワードをお忘れの方
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-muted">
          ログインできない場合は管理者にお問い合わせください
        </p>
        <p className="mt-2 text-center text-xs text-muted/70">
          &copy; {new Date().getFullYear()} 談 業務システム
        </p>
      </div>
    </div>
  );
}
