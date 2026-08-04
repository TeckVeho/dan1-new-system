"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { MasterBackLink } from "@/components/masters/MasterBackLink";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterChip } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/layout/DataTable";
import {
  addCustomerAllergen,
  createMaster,
  getCustomerAllergens,
  getMasterById,
  getMasterList,
  removeCustomerAllergen,
  updateMaster,
} from "@/lib/api";
import type { Customer } from "@/lib/types";

type Tab = "basic" | "units" | "allergens";

type UnitRow = { id: string; unitCode: string; name: string; sortOrder: number; isActive: boolean };
type AllergenMaster = { id: string; code: string; name: string };
type CustomerAllergenRow = { id: string; allergenType: AllergenMaster };

function CustomerDetailContent() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;
  const [tab, setTab] = useState<Tab>("basic");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [allergens, setAllergens] = useState<CustomerAllergenRow[]>([]);
  const [allergenMasters, setAllergenMasters] = useState<AllergenMaster[]>([]);
  const [selectedAllergenId, setSelectedAllergenId] = useState("");
  const [unitForm, setUnitForm] = useState({ unitCode: "", name: "", sortOrder: 1 });
  const [form, setForm] = useState({
    customerCode: "",
    name: "",
    nameKana: "",
    shortName: "",
    contractStartDate: "",
    contractEndDate: "",
    isInternalTest: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, u, a, masters] = await Promise.all([
        getMasterById<Customer>("customers", customerId),
        getMasterList<UnitRow>("units", { customerId, pageSize: 100 }),
        getCustomerAllergens(customerId),
        getMasterList<AllergenMaster>("allergens", { pageSize: 200 }),
      ]);
      setCustomer(c);
      setForm({
        customerCode: c.customerCode,
        name: c.name,
        nameKana: c.nameKana ?? "",
        shortName: c.shortName ?? "",
        contractStartDate: c.contractStartDate.slice(0, 10),
        contractEndDate: c.contractEndDate?.slice(0, 10) ?? "",
        isInternalTest: c.isInternalTest,
      });
      setUnits(u.items);
      setAllergens(a.items);
      setAllergenMasters(masters.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveBasic(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateMaster("customers", customerId, {
        ...form,
        contractEndDate: form.contractEndDate || null,
      });
      setMessage("施設情報を更新しました");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function addUnit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createMaster("units", { ...unitForm, customerId, isActive: true });
      setUnitForm({ unitCode: "", name: "", sortOrder: units.length + 1 });
      setMessage("ユニットを追加しました");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "追加に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function addAllergen() {
    if (!selectedAllergenId) return;
    setSaving(true);
    setError(null);
    try {
      await addCustomerAllergen(customerId, selectedAllergenId);
      setSelectedAllergenId("");
      setMessage("アレルギー設定を追加しました");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "追加に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAllergen(allergenTypeId: string) {
    if (!window.confirm("このアレルギー設定を削除しますか？確定済み注文には影響しません。")) return;
    setError(null);
    try {
      await removeCustomerAllergen(customerId, allergenTypeId);
      setMessage("アレルギー設定を削除しました");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  }

  const unitColumns: DataTableColumn<UnitRow>[] = [
    { key: "unitCode", header: "コード" },
    { key: "name", header: "名称" },
    { key: "sortOrder", header: "表示順" },
  ];

  const allergenColumns: DataTableColumn<CustomerAllergenRow>[] = [
    { key: "code", header: "コード", render: (row) => row.allergenType.code },
    { key: "name", header: "名称", render: (row) => row.allergenType.name },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Button type="button" variant="secondary" onClick={() => deleteAllergen(row.allergenType.id)}>
          削除
        </Button>
      ),
    },
  ];

  if (loading && !customer) {
    return <p className="text-muted">読み込み中…</p>;
  }

  return (
    <div>
      <MasterBackLink />
      <PageHeader
        title={customer?.name ?? "施設編集"}
        description={`施設コード: ${customer?.customerCode ?? "—"}（REQ-10）`}
      />

      {error ? <Alert variant="danger" className="mb-4">{error}</Alert> : null}
      {message ? <Alert variant="success" className="mb-4">{message}</Alert> : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip active={tab === "basic"} onClick={() => setTab("basic")} label="基本情報" />
        <FilterChip active={tab === "units"} onClick={() => setTab("units")} label="ユニット" />
        <FilterChip active={tab === "allergens"} onClick={() => setTab("allergens")} label="アレルギー" />
      </div>

      {tab === "basic" ? (
        <form onSubmit={saveBasic} className="grid max-w-2xl gap-3 rounded-lg border border-border bg-white px-4 py-4 sm:grid-cols-2">
          <Input label="施設コード" value={form.customerCode} onChange={(e) => setForm((f) => ({ ...f, customerCode: e.target.value }))} required />
          <Input label="施設名" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <Input label="カナ" value={form.nameKana} onChange={(e) => setForm((f) => ({ ...f, nameKana: e.target.value }))} />
          <Input label="略称" value={form.shortName} onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value }))} />
          <Input label="契約開始日" type="date" value={form.contractStartDate} onChange={(e) => setForm((f) => ({ ...f, contractStartDate: e.target.value }))} required />
          <Input label="契約終了日" type="date" value={form.contractEndDate} onChange={(e) => setForm((f) => ({ ...f, contractEndDate: e.target.value }))} />
          <label className="flex items-center gap-2 text-[13px] sm:col-span-2">
            <input type="checkbox" checked={form.isInternalTest} onChange={(e) => setForm((f) => ({ ...f, isInternalTest: e.target.checked }))} />
            テスト用施設
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" loading={saving}>保存する</Button>
          </div>
        </form>
      ) : null}

      {tab === "units" ? (
        <div className="space-y-4">
          <form onSubmit={addUnit} className="grid gap-3 rounded-lg border border-border bg-white px-4 py-4 sm:grid-cols-4">
            <Input label="ユニットコード" value={unitForm.unitCode} onChange={(e) => setUnitForm((f) => ({ ...f, unitCode: e.target.value }))} required />
            <Input label="名称" value={unitForm.name} onChange={(e) => setUnitForm((f) => ({ ...f, name: e.target.value }))} required />
            <Input label="表示順" type="number" value={unitForm.sortOrder} onChange={(e) => setUnitForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} />
            <div className="flex items-end">
              <Button type="submit" loading={saving}>ユニット追加</Button>
            </div>
          </form>
          <DataTable columns={unitColumns} rows={units} getRowKey={(row) => row.id} />
        </div>
      ) : null}

      {tab === "allergens" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-white px-4 py-4">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-[12px] font-medium text-muted">アレルギー種類を追加</label>
              <select
                value={selectedAllergenId}
                onChange={(e) => setSelectedAllergenId(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              >
                <option value="">選択してください</option>
                {allergenMasters
                  .filter((m) => !allergens.some((a) => a.allergenType.id === m.id))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.name}
                    </option>
                  ))}
              </select>
            </div>
            <Button type="button" onClick={addAllergen} loading={saving} disabled={!selectedAllergenId}>
              追加
            </Button>
          </div>
          <DataTable columns={allergenColumns} rows={allergens} getRowKey={(row) => row.id} emptyMessage="アレルギー設定がありません" />
        </div>
      ) : null}

      <p className="mt-4 text-[12px] text-muted">
        <Link href={`/masters/customers`} className="text-primary hover:underline">
          施設一覧に戻る
        </Link>
      </p>
    </div>
  );
}

export default function CustomerDetailPage() {
  return (
    <InternalOnly>
      <CustomerDetailContent />
    </InternalOnly>
  );
}
