"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { MasterBackLink } from "@/components/masters/MasterBackLink";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CustomerFormFields,
  customerFormToPayload,
  emptyCustomerForm,
  type CustomerFormValues,
} from "@/components/masters/CustomerFormFields";
import {
  addCustomerAllergen,
  createMaster,
  getMasterList,
  updateCustomerSettings,
} from "@/lib/api";

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS: Array<{ step: Step; label: string }> = [
  { step: 1, label: "基本情報" },
  { step: 2, label: "ユニット" },
  { step: 3, label: "アレルギー" },
  { step: 4, label: "食種・資料出力" },
  { step: 5, label: "確認" },
];

type UnitDraft = { unitCode: string; name: string; sortOrder: number };
type AllergenMaster = { id: string; code: string; name: string };

function CustomerWizardContent() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<CustomerFormValues>(emptyCustomerForm());
  const [units, setUnits] = useState<UnitDraft[]>([{ unitCode: "1", name: "ユニット1", sortOrder: 1 }]);
  const [unitDraft, setUnitDraft] = useState<UnitDraft>({ unitCode: "", name: "", sortOrder: 2 });
  const [allergenIds, setAllergenIds] = useState<string[]>([]);
  const [allergenMasters, setAllergenMasters] = useState<AllergenMaster[]>([]);
  const [groupOptions, setGroupOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [dietTypes, setDietTypes] = useState<Array<{ code: string; name: string }>>([]);
  const [settings, setSettings] = useState({ dietTypeCode: "normal", useOverrides: false, overrides: {} as Record<string, boolean> });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getMasterList<AllergenMaster>("allergens", { pageSize: 200 }),
      getMasterList<{ id: string; name: string }>("customer-groups", { pageSize: 100 }),
      getMasterList<{ code: string; name: string }>("diet-types", { pageSize: 100 }),
    ]).then(([allergens, groups, diets]) => {
      setAllergenMasters(allergens.items);
      setGroupOptions(groups.items.map((g) => ({ value: g.id, label: g.name })));
      setDietTypes(diets.items);
      if (diets.items[0]) setSettings((s) => ({ ...s, dietTypeCode: diets.items[0].code }));
    }).catch(() => undefined);
  }, []);

  function addUnitDraft() {
    if (!unitDraft.unitCode || !unitDraft.name) return;
    setUnits((prev) => [...prev, { ...unitDraft, sortOrder: prev.length + 1 }]);
    setUnitDraft({ unitCode: "", name: "", sortOrder: units.length + 2 });
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const customer = await createMaster<{ id: string }>("customers", customerFormToPayload(form));
      for (const unit of units) {
        await createMaster("units", { ...unit, customerId: customer.id, isActive: true });
      }
      for (const allergenId of allergenIds) {
        await addCustomerAllergen(customer.id, allergenId);
      }
      const settingsPayload: Record<string, unknown> = { dietTypeCode: settings.dietTypeCode };
      if (settings.useOverrides) settingsPayload.documentOutputOverrides = settings.overrides;
      await updateCustomerSettings(customer.id, {
        validFrom: form.contractStartDate,
        settings: settingsPayload,
      });
      router.push(`/masters/customers/${customer.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました");
      setSaving(false);
    }
  }

  return (
    <div>
      <MasterBackLink />
      <PageHeader title="施設の新規登録" description="ウィザード形式で施設を登録します" />

      {error ? <Alert variant="danger" className="mb-4">{error}</Alert> : null}

      <ol className="mb-6 flex flex-wrap gap-2">
        {STEPS.map((s) => (
          <li key={s.step}>
            <button
              type="button"
              onClick={() => setStep(s.step)}
              className={`rounded-full px-3 py-1 text-[12px] ${step === s.step ? "bg-primary text-white" : "bg-bg text-muted"}`}
            >
              {s.step}. {s.label}
            </button>
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <div className="max-w-3xl rounded-lg border border-border bg-white px-4 py-4">
          <CustomerFormFields form={form} onChange={setForm} groupOptions={groupOptions} />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-white px-4 py-4">
            <h3 className="mb-3 text-[14px] font-semibold">ユニット一覧</h3>
            <ul className="mb-4 space-y-1 text-[13px]">
              {units.map((u) => (
                <li key={`${u.unitCode}-${u.sortOrder}`}>{u.unitCode} — {u.name}</li>
              ))}
            </ul>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label="コード" value={unitDraft.unitCode} onChange={(e) => setUnitDraft((f) => ({ ...f, unitCode: e.target.value }))} />
              <Input label="名称" value={unitDraft.name} onChange={(e) => setUnitDraft((f) => ({ ...f, name: e.target.value }))} />
              <div className="flex items-end">
                <Button type="button" onClick={addUnitDraft}>ユニットを追加</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="max-w-xl rounded-lg border border-border bg-white px-4 py-4">
          <h3 className="mb-3 text-[14px] font-semibold">アレルギー設定</h3>
          <div className="space-y-2">
            {allergenMasters.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={allergenIds.includes(a.id)}
                  onChange={(e) =>
                    setAllergenIds((ids) => (e.target.checked ? [...ids, a.id] : ids.filter((id) => id !== a.id)))
                  }
                />
                {a.code} — {a.name}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="max-w-xl space-y-4 rounded-lg border border-border bg-white px-4 py-4">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-muted">食種</label>
            <select value={settings.dietTypeCode} onChange={(e) => setSettings((s) => ({ ...s, dietTypeCode: e.target.value }))} className="w-full rounded-md border border-border px-3 py-2 text-sm">
              {dietTypes.map((d) => (
                <option key={d.code} value={d.code}>{d.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={settings.useOverrides} onChange={(e) => setSettings((s) => ({ ...s, useOverrides: e.target.checked }))} />
            資料出力を施設個別に上書きする
          </label>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="max-w-xl space-y-2 rounded-lg border border-border bg-white px-4 py-4 text-[13px]">
          <p><strong>施設名:</strong> {form.name}</p>
          <p><strong>施設コード:</strong> {form.customerCode}</p>
          <p><strong>ユニット数:</strong> {units.length}</p>
          <p><strong>アレルギー:</strong> {allergenIds.length} 件</p>
          <p><strong>食種:</strong> {settings.dietTypeCode}</p>
        </div>
      ) : null}

      <div className="mt-6 flex gap-2">
        {step > 1 ? (
          <Button type="button" variant="secondary" onClick={() => setStep((s) => (s - 1) as Step)}>戻る</Button>
        ) : null}
        {step < 5 ? (
          <Button type="button" onClick={() => setStep((s) => (s + 1) as Step)}>次へ</Button>
        ) : (
          <Button type="button" onClick={handleSubmit} loading={saving}>登録する</Button>
        )}
        <Link href="/masters/customers" className="ml-auto text-[13px] text-muted hover:text-primary">キャンセル</Link>
      </div>
    </div>
  );
}

export default function CustomerNewPage() {
  return (
    <InternalOnly>
      <CustomerWizardContent />
    </InternalOnly>
  );
}
