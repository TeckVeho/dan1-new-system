"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AdminOnly } from "@/components/auth/AdminOnly";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";
import {
  createFacilityUser,
  createInternalUser,
  deleteAdminUser,
  getAdminRoles,
  getAdminUsers,
  getCustomers,
  resetAdminUserPassword,
  updateFacilityUser,
  updateInternalUser,
} from "@/lib/api";
import type { Customer, FacilityAdminUser, InternalAdminUser } from "@/lib/types";

type UserTab = "internal" | "facility";

const emptyCreateForm = {
  employeeNo: "",
  haccpNo: "",
  loginId: "",
  customerId: "",
  customerLabel: "",
  name: "",
  email: "",
  roleId: "",
};

function UsersContent() {
  const [tab, setTab] = useState<UserTab>("internal");
  const [rows, setRows] = useState<(InternalAdminUser | FacilityAdminUser)[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [roles, setRoles] = useState<{ id: string; name: string; code: string; scope: string }[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    employeeNo: "",
    haccpNo: "",
    loginId: "",
    name: "",
    email: "",
    roleId: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminUsers({ type: tab, search: search || undefined, page, pageSize });
      setRows(res.items.filter((row) => row.type === tab));
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [tab, search, page, pageSize]);

  function switchTab(next: UserTab) {
    setTab(next);
    setPage(1);
    setRows([]);
    setShowCreate(false);
    setEditingId(null);
    setCreateForm(emptyCreateForm);
    setCustomerSearch("");
    setCustomerOptions([]);
  }

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getAdminRoles()
      .then((r) => setRoles(r.map(({ id, name, code, scope }) => ({ id, name, code, scope }))))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (tab !== "facility" || !showCreate) return;
    const query = customerSearch.trim();
    if (query.length < 1) {
      setCustomerOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setCustomerSearchLoading(true);
      try {
        const res = await getCustomers({ search: query, page: 1, pageSize: 20 });
        setCustomerOptions(res.items);
      } catch {
        setCustomerOptions([]);
      } finally {
        setCustomerSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, tab, showCreate]);

  function startEdit(row: InternalAdminUser | FacilityAdminUser) {
    setEditingId(row.id);
    setShowCreate(false);
    if (row.type === "internal") {
      setEditForm({
        employeeNo: row.employeeNo,
        haccpNo: row.haccpNo ?? "",
        loginId: "",
        name: row.name,
        email: row.email ?? "",
        roleId: row.role.id,
      });
    } else {
      setEditForm({
        employeeNo: "",
        haccpNo: "",
        loginId: row.loginId,
        name: row.name,
        email: "",
        roleId: row.role.id,
      });
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      if (tab === "internal") {
        const result = await createInternalUser({
          employeeNo: createForm.employeeNo,
          haccpNo: createForm.haccpNo || undefined,
          name: createForm.name,
          email: createForm.email || undefined,
          roleId: createForm.roleId,
        });
        setMessage(
          result.temporaryPassword
            ? `ユーザーを作成しました。初期パスワード: ${result.temporaryPassword}`
            : "ユーザーを作成しました",
        );
      } else {
        const result = await createFacilityUser({
          customerId: createForm.customerId,
          loginId: createForm.loginId,
          name: createForm.name,
          roleId: createForm.roleId,
        });
        setMessage(
          result.temporaryPassword
            ? `施設ユーザーを作成しました。初期パスワード: ${result.temporaryPassword}`
            : "施設ユーザーを作成しました",
        );
      }
      setShowCreate(false);
      setCreateForm(emptyCreateForm);
      setCustomerSearch("");
      setCustomerOptions([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError(null);
    setMessage(null);
    try {
      if (tab === "internal") {
        await updateInternalUser(editingId, {
          employeeNo: editForm.employeeNo,
          haccpNo: editForm.haccpNo || null,
          name: editForm.name,
          email: editForm.email || null,
          roleId: editForm.roleId,
        });
      } else {
        await updateFacilityUser(editingId, {
          loginId: editForm.loginId,
          name: editForm.name,
          roleId: editForm.roleId,
        });
      }
      setMessage("ユーザーを更新しました");
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  }

  async function handleResetPassword(row: InternalAdminUser | FacilityAdminUser) {
    setError(null);
    setMessage(null);
    try {
      const result = await resetAdminUserPassword(row.type, row.id);
      setMessage(
        result.temporaryPassword
          ? `${row.name} のパスワードを再発行しました: ${result.temporaryPassword}`
          : "パスワードを再発行しました",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "再発行に失敗しました");
    }
  }

  async function handleToggleActive(row: InternalAdminUser | FacilityAdminUser) {
    setError(null);
    try {
      if (row.type === "internal") {
        await updateInternalUser(row.id, { isActive: !row.isActive });
      } else {
        await updateFacilityUser(row.id, { isActive: !row.isActive });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  }

  async function handleDelete(row: InternalAdminUser | FacilityAdminUser) {
    if (!window.confirm(`${row.name} を削除しますか？この操作は取り消せません。`)) return;
    setError(null);
    setMessage(null);
    try {
      await deleteAdminUser(row.type, row.id);
      setMessage(`${row.name} を削除しました`);
      if (editingId === row.id) setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  }

  const actionButtons = (row: InternalAdminUser | FacilityAdminUser) => (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" onClick={() => startEdit(row)}>
        編集
      </Button>
      <Button type="button" variant="secondary" onClick={() => handleResetPassword(row)}>
        パスワード再発行
      </Button>
      <Button type="button" variant="secondary" onClick={() => handleToggleActive(row)}>
        {row.isActive ? "無効化" : "有効化"}
      </Button>
      <Button type="button" variant="secondary" onClick={() => handleDelete(row)}>
        削除
      </Button>
    </div>
  );

  const internalColumns: DataTableColumn<InternalAdminUser>[] = [
    { key: "employeeNo", header: "社員番号" },
    { key: "haccpNo", header: "HACCP番号", render: (row) => row.haccpNo ?? "—" },
    { key: "name", header: "氏名" },
    { key: "email", header: "メール", render: (row) => row.email ?? "—" },
    { key: "role", header: "ロール", render: (row) => row.role.name },
    {
      key: "isActive",
      header: "状態",
      render: (row) => (row.isActive ? <Badge variant="success">有効</Badge> : <Badge variant="muted">無効</Badge>),
    },
    { key: "actions", header: "", render: (row) => actionButtons(row) },
  ];

  const facilityColumns: DataTableColumn<FacilityAdminUser>[] = [
    { key: "loginId", header: "ログインID" },
    { key: "name", header: "氏名" },
    {
      key: "customer",
      header: "施設",
      render: (row) => (row.customer ? `${row.customer.customerCode} ${row.customer.name}` : "—"),
    },
    { key: "role", header: "ロール", render: (row) => row.role?.name ?? "—" },
    {
      key: "isActive",
      header: "状態",
      render: (row) => (row.isActive ? <Badge variant="success">有効</Badge> : <Badge variant="muted">無効</Badge>),
    },
    { key: "actions", header: "", render: (row) => actionButtons(row) },
  ];

  const scopedRoles = roles.filter((r) => r.scope === tab);

  return (
    <div>
      <PageHeader
        title="ユーザー管理"
        description="社内ユーザーと施設ユーザーのアカウントを管理します"
        actions={
          <Button
            type="button"
            onClick={() => {
              setShowCreate((v) => !v);
              setEditingId(null);
            }}
          >
            {showCreate ? "作成を閉じる" : "新規作成"}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterChip active={tab === "internal"} onClick={() => switchTab("internal")} label="社内ユーザー" />
        <FilterChip active={tab === "facility"} onClick={() => switchTab("facility")} label="施設ユーザー" />
        <Input
          placeholder="検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button type="button" variant="secondary" onClick={() => load()}>
          検索
        </Button>
      </div>

      {error ? (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      ) : null}
      {message ? (
        <Alert variant="success" className="mb-4">
          {message}
        </Alert>
      ) : null}

      {showCreate ? (
        <form onSubmit={handleCreate} className="mb-4 grid gap-3 rounded-lg border border-border bg-white p-4 sm:grid-cols-2">
          {tab === "internal" ? (
            <>
              <Input
                label="社員番号"
                value={createForm.employeeNo}
                onChange={(e) => setCreateForm({ ...createForm, employeeNo: e.target.value })}
                required
              />
              <Input
                label="HACCP番号"
                value={createForm.haccpNo}
                onChange={(e) => setCreateForm({ ...createForm, haccpNo: e.target.value })}
              />
              <Input
                label="氏名"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
              />
              <Input
                label="メール"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </>
          ) : (
            <>
              <div className="sm:col-span-2">
                <Input
                  label="施設検索"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="施設名・施設コードで検索"
                />
                {createForm.customerId ? (
                  <p className="mt-1 text-[12px] text-muted">選択中: {createForm.customerLabel}</p>
                ) : null}
                {customerSearchLoading ? (
                  <p className="mt-1 text-[12px] text-muted">検索中...</p>
                ) : customerOptions.length > 0 ? (
                  <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-border">
                    {customerOptions.map((customer) => (
                      <li key={customer.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-[13px] hover:bg-bg"
                          onClick={() => {
                            setCreateForm({
                              ...createForm,
                              customerId: customer.id,
                              customerLabel: `${customer.customerCode} ${customer.name}`,
                            });
                            setCustomerSearch(`${customer.customerCode} ${customer.name}`);
                            setCustomerOptions([]);
                          }}
                        >
                          {customer.customerCode} {customer.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : customerSearch.trim() ? (
                  <p className="mt-1 text-[12px] text-muted">該当する施設がありません</p>
                ) : null}
              </div>
              <Input
                label="ログインID"
                value={createForm.loginId}
                onChange={(e) => setCreateForm({ ...createForm, loginId: e.target.value })}
                required
              />
              <Input
                label="氏名"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
              />
            </>
          )}
          <label className="text-[13px] text-text">
            ロール
            <select
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-[13px]"
              value={createForm.roleId}
              onChange={(e) => setCreateForm({ ...createForm, roleId: e.target.value })}
              required
            >
              <option value="">選択してください</option>
              {scopedRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button type="submit" disabled={tab === "facility" && !createForm.customerId}>
              作成する
            </Button>
          </div>
        </form>
      ) : null}

      {editingId ? (
        <form onSubmit={handleUpdate} className="mb-4 grid gap-3 rounded-lg border border-border bg-white p-4 sm:grid-cols-2">
          <p className="sm:col-span-2 text-[14px] font-medium text-text">ユーザー編集</p>
          {tab === "internal" ? (
            <>
              <Input
                label="社員番号"
                value={editForm.employeeNo}
                onChange={(e) => setEditForm({ ...editForm, employeeNo: e.target.value })}
                required
              />
              <Input
                label="HACCP番号"
                value={editForm.haccpNo}
                onChange={(e) => setEditForm({ ...editForm, haccpNo: e.target.value })}
              />
              <Input
                label="氏名"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
              <Input
                label="メール"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </>
          ) : (
            <>
              <Input
                label="ログインID"
                value={editForm.loginId}
                onChange={(e) => setEditForm({ ...editForm, loginId: e.target.value })}
                required
              />
              <Input
                label="氏名"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </>
          )}
          <label className="text-[13px] text-text">
            ロール
            <select
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-[13px]"
              value={editForm.roleId}
              onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}
              required
            >
              <option value="">選択してください</option>
              {scopedRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit">保存する</Button>
            <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
              キャンセル
            </Button>
          </div>
        </form>
      ) : null}

      {tab === "internal" ? (
        <DataTable
          columns={internalColumns}
          rows={(rows as InternalAdminUser[]).filter((row) => row.type === "internal")}
          loading={loading}
          getRowKey={(row) => row.id}
        />
      ) : (
        <DataTable
          columns={facilityColumns}
          rows={(rows as FacilityAdminUser[]).filter((row) => row.type === "facility")}
          loading={loading}
          getRowKey={(row) => row.id}
        />
      )}
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminOnly>
      <UsersContent />
    </AdminOnly>
  );
}
