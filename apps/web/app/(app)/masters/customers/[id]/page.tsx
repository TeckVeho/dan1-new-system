"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { MasterBackLink } from "@/components/masters/MasterBackLink";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterChip } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/layout/DataTable";
import {
  CustomerFormFields,
  customerFormToPayload,
  customerToForm,
  emptyCustomerForm,
  type CustomerFormValues,
} from "@/components/masters/CustomerFormFields";
import {
  addCustomerAllergen,
  addCustomerProductionPattern,
  createMaster,
  deleteMaster,
  getCustomerAllergens,
  getCustomerProductionPatterns,
  getCustomerSettings,
  getMasterById,
  getMasterList,
  removeCustomerAllergen,
  removeCustomerProductionPattern,
  updateCustomerSettings,
  updateMaster,
  updateMasterSortOrder,
} from "@/lib/api";
import type { Customer } from "@/lib/types";

type Tab = "basic" | "units" | "allergens" | "settings" | "production";

type UnitRow = { id: string; unitCode: string; name: string; sortOrder: number; isActive: boolean };
type AllergenMaster = { id: string; code: string; name: string };
type CustomerAllergenRow = { id: string; allergenType: AllergenMaster };
type DietType = { id: string; code: string; name: string };
type ProductionPattern = { id: string; code: string; name: string };

const DOCUMENT_TYPES = [
  { code: "menu_sheet", label: "献立表" },
  { code: "nutrition_report", label: "栄養月報" },
  { code: "plating_instruction", label: "盛付指示書" },
] as const;

function CustomerDetailContent() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;
  const [tab, setTab] = useState<Tab>("basic");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [allergens, setAllergens] = useState<CustomerAllergenRow[]>([]);
  const [allergenMasters, setAllergenMasters] = useState<AllergenMaster[]>([]);
  const [groupOptions, setGroupOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [dietTypes, setDietTypes] = useState<DietType[]>([]);
  const [productionPatterns, setProductionPatterns] = useState<ProductionPattern[]>([]);
  const [customerPatterns, setCustomerPatterns] = useState<
    Array<{ id: string; validFrom: string; validTo?: string | null; productionPattern: ProductionPattern }>
  >([]);
  const [selectedAllergenId, setSelectedAllergenId] = useState("");
  const [unitForm, setUnitForm] = useState({ unitCode: "", name: "", sortOrder: 1 });
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerFormValues>(emptyCustomerForm());
  const [settingsForm, setSettingsForm] = useState({
    validFrom: new Date().toISOString().slice(0, 10),
    dietTypeCode: "normal",
    documentOutputOverrides: {} as Record<string, boolean>,
    useOverrides: false,
  });
  const [patternForm, setPatternForm] = useState({ productionPatternId: "", validFrom: "", validTo: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, u, a, masters, groups, diets, patterns, assignments, setting] = await Promise.all([
        getMasterById<Customer>("customers", customerId),
        getMasterList<UnitRow>("units", { customerId, pageSize: 200 }),
        getCustomerAllergens(customerId),
        getMasterList<AllergenMaster>("allergens", { pageSize: 200 }),
        getMasterList<{ id: string; name: string }>("customer-groups", { pageSize: 100 }),
        getMasterList<DietType>("diet-types", { pageSize: 100 }),
        getMasterList<ProductionPattern>("production-patterns", { pageSize: 100 }),
        getCustomerProductionPatterns(customerId),
        getCustomerSettings(customerId).catch(() => null),
      ]);
      setCustomer(c);
      setForm(customerToForm(c));
      setUnits(u.items);
      setAllergens(a.items);
      setAllergenMasters(masters.items);
      setGroupOptions(groups.items.map((g) => ({ value: g.id, label: g.name })));
      setDietTypes(diets.items);
      setProductionPatterns(patterns.items);
      setCustomerPatterns(assignments);
      const settings = (setting?.settings ?? {}) as Record<string, unknown>;
      const overrides = settings.documentOutputOverrides as Record<string, boolean> | undefined;
      setSettingsForm({
        validFrom: new Date().toISOString().slice(0, 10),
        dietTypeCode: typeof settings.dietTypeCode === "string" ? settings.dietTypeCode : "normal",
        documentOutputOverrides: overrides ?? {},
        useOverrides: Boolean(overrides && Object.keys(overrides).length > 0),
      });
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
      await updateMaster("customers", customerId, customerFormToPayload(form));
      setMessage("施設情報を更新しました");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function saveUnit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingUnitId) {
        await updateMaster("units", editingUnitId, { ...unitForm, customerId, isActive: true });
        setMessage("ユニットを更新しました");
        setEditingUnitId(null);
      } else {
        await createMaster("units", { ...unitForm, customerId, isActive: true });
        setMessage("ユニットを追加しました");
      }
      setUnitForm({ unitCode: "", name: "", sortOrder: units.length + 1 });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUnit(id: string) {
    if (!window.confirm("このユニットを削除しますか？")) return;
    setError(null);
    try {
      await deleteMaster("units", id);
      setMessage("ユニットを削除しました");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  }

  async function moveUnit(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= units.length) return;
    const reordered = [...units];
    const [item] = reordered.splice(index, 1);
    reordered.splice(target, 0, item);
    const items = reordered.map((u, i) => ({ id: u.id, sortOrder: i + 1 }));
    await updateMasterSortOrder("units", items);
    await load();
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
    if (!window.confirm("このアレルギー設定を削除しますか？")) return;
    setError(null);
    try {
      await removeCustomerAllergen(customerId, allergenTypeId);
      setMessage("アレルギー設定を削除しました");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const settings: Record<string, unknown> = { dietTypeCode: settingsForm.dietTypeCode };
      if (settingsForm.useOverrides) {
        settings.documentOutputOverrides = settingsForm.documentOutputOverrides;
      }
      await updateCustomerSettings(customerId, {
        validFrom: settingsForm.validFrom,
        settings,
      });
      setMessage("施設設定を保存しました");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function addProductionPattern(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await addCustomerProductionPattern(customerId, {
        productionPatternId: patternForm.productionPatternId,
        validFrom: patternForm.validFrom,
        validTo: patternForm.validTo || undefined,
      });
      setPatternForm({ productionPatternId: "", validFrom: "", validTo: "" });
      setMessage("製造パターンを割り当てました");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "追加に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProductionPattern(id: string) {
    if (!window.confirm("この割当を削除しますか？")) return;
    setError(null);
    try {
      await removeCustomerProductionPattern(customerId, id);
      setMessage("製造パターンの割当を削除しました");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  }

  const unitColumns: DataTableColumn<UnitRow>[] = [
    { key: "unitCode", header: "コード" },
    { key: "name", header: "名称" },
    { key: "sortOrder", header: "表示順" },
    {
      key: "actions",
      header: "",
      render: (row) => {
        const index = units.findIndex((u) => u.id === row.id);
        return (
          <div className="flex justify-end gap-1">
            <button type="button" onClick={() => moveUnit(index, -1)} className="rounded p-1 hover:bg-bg" aria-label="上へ">
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => moveUnit(index, 1)} className="rounded p-1 hover:bg-bg" aria-label="下へ">
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingUnitId(row.id);
                setUnitForm({ unitCode: row.unitCode, name: row.name, sortOrder: row.sortOrder });
              }}
              className="rounded p-1 hover:bg-bg"
              aria-label="編集"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => deleteUnit(row.id)} className="rounded p-1 hover:bg-danger/5 text-danger" aria-label="削除">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
    },
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
      <PageHeader title={customer?.name ?? "施設編集"} description={`施設コード: ${customer?.customerCode ?? "—"}`} />

      {error ? <Alert variant="danger" className="mb-4">{error}</Alert> : null}
      {message ? <Alert variant="success" className="mb-4">{message}</Alert> : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip active={tab === "basic"} onClick={() => setTab("basic")} label="基本情報" />
        <FilterChip active={tab === "units"} onClick={() => setTab("units")} label="ユニット" />
        <FilterChip active={tab === "allergens"} onClick={() => setTab("allergens")} label="アレルギー" />
        <FilterChip active={tab === "settings"} onClick={() => setTab("settings")} label="食種・資料出力" />
        <FilterChip active={tab === "production"} onClick={() => setTab("production")} label="製造パターン" />
      </div>

      {tab === "basic" ? (
        <form onSubmit={saveBasic} className="max-w-3xl rounded-lg border border-border bg-white px-4 py-4">
          <CustomerFormFields form={form} onChange={setForm} groupOptions={groupOptions} />
          <div className="mt-4">
            <Button type="submit" loading={saving}>保存する</Button>
          </div>
        </form>
      ) : null}

      {tab === "units" ? (
        <div className="space-y-4">
          <form onSubmit={saveUnit} className="grid gap-3 rounded-lg border border-border bg-white px-4 py-4 sm:grid-cols-4">
            <Input label="ユニットコード" value={unitForm.unitCode} onChange={(e) => setUnitForm((f) => ({ ...f, unitCode: e.target.value }))} required />
            <Input label="名称" value={unitForm.name} onChange={(e) => setUnitForm((f) => ({ ...f, name: e.target.value }))} required />
            <Input label="表示順" type="number" value={unitForm.sortOrder} onChange={(e) => setUnitForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} />
            <div className="flex items-end gap-2">
              {editingUnitId ? (
                <Button type="button" variant="secondary" onClick={() => { setEditingUnitId(null); setUnitForm({ unitCode: "", name: "", sortOrder: units.length + 1 }); }}>
                  キャンセル
                </Button>
              ) : null}
              <Button type="submit" loading={saving}>{editingUnitId ? "更新" : "ユニット追加"}</Button>
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
              <select value={selectedAllergenId} onChange={(e) => setSelectedAllergenId(e.target.value)} className="w-full rounded-md border border-border px-3 py-2 text-sm">
                <option value="">選択してください</option>
                {allergenMasters.filter((m) => !allergens.some((a) => a.allergenType.id === m.id)).map((m) => (
                  <option key={m.id} value={m.id}>{m.code} — {m.name}</option>
                ))}
              </select>
            </div>
            <Button type="button" onClick={addAllergen} loading={saving} disabled={!selectedAllergenId}>追加</Button>
          </div>
          <DataTable columns={allergenColumns} rows={allergens} getRowKey={(row) => row.id} emptyMessage="アレルギー設定がありません" />
        </div>
      ) : null}

      {tab === "settings" ? (
        <form onSubmit={saveSettings} className="max-w-2xl space-y-4 rounded-lg border border-border bg-white px-4 py-4">
          <Input label="適用開始日" type="date" value={settingsForm.validFrom} onChange={(e) => setSettingsForm((f) => ({ ...f, validFrom: e.target.value }))} required />
          <div>
            <label className="mb-1 block text-[12px] font-medium text-muted">食種</label>
            <select value={settingsForm.dietTypeCode} onChange={(e) => setSettingsForm((f) => ({ ...f, dietTypeCode: e.target.value }))} className="w-full rounded-md border border-border px-3 py-2 text-sm">
              {dietTypes.map((d) => (
                <option key={d.code} value={d.code}>{d.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={settingsForm.useOverrides} onChange={(e) => setSettingsForm((f) => ({ ...f, useOverrides: e.target.checked }))} />
            資料出力を施設個別に上書きする
          </label>
          {settingsForm.useOverrides ? (
            <div className="space-y-2">
              {DOCUMENT_TYPES.map((doc) => (
                <label key={doc.code} className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={settingsForm.documentOutputOverrides[doc.code] ?? false}
                    onChange={(e) =>
                      setSettingsForm((f) => ({
                        ...f,
                        documentOutputOverrides: { ...f.documentOutputOverrides, [doc.code]: e.target.checked },
                      }))
                    }
                  />
                  {doc.label}
                </label>
              ))}
            </div>
          ) : null}
          <Button type="submit" loading={saving}>設定を保存</Button>
        </form>
      ) : null}

      {tab === "production" ? (
        <div className="space-y-4">
          <form onSubmit={addProductionPattern} className="grid gap-3 rounded-lg border border-border bg-white px-4 py-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[12px] font-medium text-muted">製造パターン</label>
              <select value={patternForm.productionPatternId} onChange={(e) => setPatternForm((f) => ({ ...f, productionPatternId: e.target.value }))} required className="w-full rounded-md border border-border px-3 py-2 text-sm">
                <option value="">選択してください</option>
                {productionPatterns.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                ))}
              </select>
            </div>
            <Input label="適用開始日" type="date" value={patternForm.validFrom} onChange={(e) => setPatternForm((f) => ({ ...f, validFrom: e.target.value }))} required />
            <Input label="適用終了日" type="date" value={patternForm.validTo} onChange={(e) => setPatternForm((f) => ({ ...f, validTo: e.target.value }))} />
            <div className="sm:col-span-4">
              <Button type="submit" loading={saving}>割り当てを追加</Button>
            </div>
          </form>
          <DataTable
            columns={[
              { key: "code", header: "コード", render: (row) => row.productionPattern.code },
              { key: "name", header: "名称", render: (row) => row.productionPattern.name },
              { key: "validFrom", header: "適用開始", render: (row) => row.validFrom.slice(0, 10) },
              { key: "validTo", header: "適用終了", render: (row) => row.validTo?.slice(0, 10) ?? "—" },
              {
                key: "actions",
                header: "",
                render: (row) => (
                  <Button type="button" variant="secondary" onClick={() => deleteProductionPattern(row.id)}>削除</Button>
                ),
              },
            ]}
            rows={customerPatterns}
            getRowKey={(row) => row.id}
            emptyMessage="製造パターンの割当がありません"
          />
        </div>
      ) : null}

      <p className="mt-4 text-[12px] text-muted">
        <Link href="/masters/customers" className="text-primary hover:underline">施設一覧に戻る</Link>
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
