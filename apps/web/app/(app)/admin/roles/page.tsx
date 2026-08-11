"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAdminPermissions, getAdminRoles, updateRolePermissions } from "@/lib/api";
import type { AdminPermission, AdminRole } from "@/lib/types";

const FACILITY_PERMISSION_CATEGORIES = new Set(["announcement", "order", "report", "document", "invoice"]);

function RolesContent() {
  const { user, can } = useAuth();
  const canEdit = can("admin.role.update");
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAdminRoles(), getAdminPermissions()])
      .then(([roleList, permissionList]) => {
        setRoles(roleList);
        setPermissions(permissionList);
        if (roleList[0]) {
          setSelectedRoleId(roleList[0].id);
          setSelectedCodes(new Set(roleList[0].permissionCodes));
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function selectRole(role: AdminRole) {
    setSelectedRoleId(role.id);
    setSelectedCodes(new Set(role.permissionCodes));
    setMessage(null);
    setError(null);
  }

  function togglePermission(code: string) {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function handleSave() {
    if (!selectedRoleId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateRolePermissions(selectedRoleId, [...selectedCodes]);
      setRoles((prev) =>
        prev.map((role) =>
          role.id === selectedRoleId ? { ...role, permissionCodes: updated.permissionCodes } : role,
        ),
      );
      setMessage("権限を更新しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const visiblePermissions =
    selectedRole?.scope === "facility"
      ? permissions.filter((p) => FACILITY_PERMISSION_CATEGORIES.has(p.category))
      : permissions;
  const grouped = visiblePermissions.reduce<Record<string, AdminPermission[]>>((acc, permission) => {
    (acc[permission.category] ??= []).push(permission);
    return acc;
  }, {});

  if (loading) {
    return <div className="text-[13px] text-muted">読み込み中…</div>;
  }

  return (
    <div>
      <PageHeader title="ロール・権限設定" description="ロールごとに利用できる機能を設定します" />

      {error ? <Alert variant="danger" className="mb-4">{error}</Alert> : null}
      {message ? <Alert variant="success" className="mb-4">{message}</Alert> : null}

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border border-border bg-white p-3">
          <p className="mb-2 text-[12px] font-semibold text-muted">ロール</p>
          <div className="space-y-1">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => selectRole(role)}
                className={`w-full rounded-md px-3 py-2 text-left text-[13px] ${
                  selectedRoleId === role.id ? "bg-primary/8 font-medium text-primary" : "hover:bg-bg"
                }`}
              >
                {role.name}
                <span className="mt-0.5 block text-[11px] text-muted">{role.userCount} ユーザー</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-lg border border-border bg-white p-4">
          {selectedRole ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-text">{selectedRole.name}</h2>
                </div>
                {canEdit && selectedRole.code !== "system_admin" ? (
                  <Button type="button" loading={saving} onClick={handleSave}>
                    保存する
                  </Button>
                ) : null}
              </div>

              {selectedRole.code === "system_admin" ? (
                <p className="text-[13px] text-muted">システム管理者はすべての権限を持ちます。</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(grouped).map(([category, items]) => (
                    <div key={category}>
                      <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">{category}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {items.map((permission) => (
                          <label key={permission.code} className="flex items-start gap-2 rounded-md border border-border px-3 py-2 text-[13px]">
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={selectedCodes.has(permission.code)}
                              disabled={!canEdit}
                              onChange={() => togglePermission(permission.code)}
                            />
                            <span>
                              <span className="font-medium text-text">{permission.name}</span>
                              <span className="mt-0.5 block text-[11px] text-muted">{permission.code}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default function AdminRolesPage() {
  return (
    <InternalOnly>
      <RolesContent />
    </InternalOnly>
  );
}
