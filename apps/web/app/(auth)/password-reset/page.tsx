"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, Lock, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/brand-logo";
import { requestPasswordReset } from "@/lib/api";

export default function PasswordResetRequestForm() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!loginId.trim()) {
      setError("ログインIDを入力してください");
      return;
    }
    setLoading(true);
    try {
      const msg = await requestPasswordReset(loginId.trim());
      setMessage(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-backdrop flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px] animate-auth-rise">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo priority className="mb-4 h-12" />
          <h1 className="text-[19px] font-semibold tracking-tight text-text">パスワードの再設定</h1>
          <p className="mt-1.5 text-[13px] text-muted">ログインIDを入力してください</p>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-7">
          {error ? (
            <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2.5 text-[13px] text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
          {message ? (
            <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-[13px] text-text">
              {message}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Input
              label="ログインID"
              hint="社員番号・HACCP番号またはメールアドレス"
              type="text"
              autoComplete="username"
              autoFocus
              leadingIcon={<UserRound className="h-4 w-4" />}
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              disabled={loading}
            />
            <Button type="submit" loading={loading} className="h-11 w-full">
              再設定を申請する
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/login" className="inline-flex items-center gap-1 text-[13px] text-primary hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" />
              ログインに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
