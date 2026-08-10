"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterChip } from "@/components/ui/badge";
import { useAuth } from "@/components/auth/AuthProvider";
import { changePassword, getSystemSettings, putSystemSettings, type SystemSettings } from "@/lib/api";

type Tab = "account" | "system";

function PasswordForm({ required }: { required?: boolean }) {
  const { refresh } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (newPassword.length < 12) {
      setError("新しいパスワードは12文字以上で入力してください");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("新しいパスワードが一致しません");
      return;
    }
    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setMessage("パスワードを変更しました");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "変更に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-white px-4 py-4">
      <h2 className="text-[15px] font-semibold text-text">パスワード変更</h2>
      {required ? (
        <Alert variant="warning" className="mt-3">
          初回ログインのため、パスワードの変更が必要です。
        </Alert>
      ) : null}
      <p className="mt-1 text-[12px] text-muted">12文字以上、英大文字・英小文字・数字・記号のうち3種以上を含めてください</p>

      {error ? (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      ) : null}
      {message ? (
        <Alert variant="success" className="mt-3">
          {message}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-3 grid gap-3 sm:max-w-md">
        <Input
          label="現在のパスワード"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <Input
          label="新しいパスワード"
          type="password"
          autoComplete="new-password"
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
        <Button type="submit" loading={saving} className="w-fit">
          変更する
        </Button>
      </form>
    </section>
  );
}

function SystemSettingsForm() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getSystemSettings()
      .then(setSettings)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await putSystemSettings(settings);
      setSettings(updated);
      setMessage("システム設定を更新しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
        読み込み中…
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-white px-4 py-4">
      <h2 className="text-[15px] font-semibold text-text">システム設定</h2>
      {error ? (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      ) : null}
      {message ? (
        <Alert variant="success" className="mt-3">
          {message}
        </Alert>
      ) : null}

      {settings ? (
        <form onSubmit={handleSubmit} className="mt-3 grid gap-3 sm:max-w-md">
          <Input
            label="ブランド名"
            value={settings.brandName}
            onChange={(e) => setSettings({ ...settings, brandName: e.target.value })}
          />
          <Input
            label="サポート窓口メールアドレス"
            type="email"
            value={settings.supportEmail}
            onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
          />
          <Input
            label="セッションタイムアウト（分）"
            type="number"
            value={settings.sessionTimeoutMinutes}
            onChange={(e) =>
              setSettings({ ...settings, sessionTimeoutMinutes: Number(e.target.value) })
            }
          />
          <label className="flex items-center gap-2 text-[13px] text-text">
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary"
            />
            メンテナンスモード
          </label>
          <Button type="submit" loading={saving} className="w-fit">
            保存する
          </Button>
        </form>
      ) : null}
    </section>
  );
}

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const searchParams = useSearchParams();
  const required = searchParams.get("required") === "1" || user.passwordChangeRequired;
  const [tab, setTab] = useState<Tab>("account");

  return (
    <div>
      <PageHeader title="設定" description="アカウント設定とシステム全体の設定を管理します" />

      {user.type === "internal" ? (
        <div className="mb-4 flex gap-1.5">
          <FilterChip active={tab === "account"} onClick={() => setTab("account")} label="アカウント" />
          <FilterChip active={tab === "system"} onClick={() => setTab("system")} label="システム設定" />
        </div>
      ) : null}

      {tab === "account" || user.type !== "internal" ? <PasswordForm required={required} /> : <SystemSettingsForm />}
    </div>
  );
}
