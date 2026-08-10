"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/brand-logo";
import { confirmPasswordReset } from "@/lib/api";

export default function PasswordResetConfirmPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 12) {
      setError("パスワードは12文字以上で入力してください");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset({ token, newPassword });
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "再設定に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-backdrop flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo priority className="mb-4 h-12" />
          <h1 className="text-[19px] font-semibold text-text">新しいパスワードの設定</h1>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl">
          {error ? (
            <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2.5 text-[13px] text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="新しいパスワード"
              type="password"
              autoComplete="new-password"
              leadingIcon={<Lock className="h-4 w-4" />}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={12}
            />
            <Input
              label="新しいパスワード（確認）"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={12}
            />
            <Button type="submit" loading={loading} className="h-11 w-full">
              パスワードを設定する
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/login" className="text-[13px] text-primary hover:underline">
              ログインに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
