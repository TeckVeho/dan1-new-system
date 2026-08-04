"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError, createAllergenOrder, getAllergenOrderOptions } from "@/lib/api";
import type { Unit } from "@/lib/types";

type AllergenOption = { id: string; code: string; name: string };

export default function NewAllergenOrderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState(user.customerId ?? "");
  const [units, setUnits] = useState<Unit[]>([]);
  const [allergens, setAllergens] = useState<AllergenOption[]>([]);
  const [unitId, setUnitId] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [allergenTypeId, setAllergenTypeId] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scopedCustomerId = user.type === "internal" ? customerId || user.customerId : user.customerId;

  const load = useCallback(async () => {
    if (!scopedCustomerId) {
      setLoading(false);
      setUnits([]);
      setAllergens([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { units: unitItems, allergens: allergenItems } = await getAllergenOrderOptions({
        customerId: scopedCustomerId,
      });
      setUnits(unitItems);
      setAllergens(allergenItems.map((row) => row.allergenType));
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [scopedCustomerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scopedCustomerId || !unitId || !serviceDate || !allergenTypeId) {
      setError("必須項目を入力してください");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createAllergenOrder({
        customerId: scopedCustomerId,
        unitId,
        serviceDate,
        allergenTypeId,
        quantity,
      });
      router.push("/orders/allergen");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="アレルギー注文（新規）"
        description="アレルギー対応食を新規に注文します"
        actions={
          <Link
            href="/orders/allergen"
            className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-white px-3 text-[13px] font-medium text-text hover:bg-bg"
          >
            変更一覧へ
          </Link>
        }
      />

      <Alert variant="info" className="mb-4">
        アレルギーの食数は通常の食数に追加注文する形となります。施設に設定されたアレルギー種類のみ選択できます。
      </Alert>

      {error ? (
        <Alert variant="danger" title="エラー" className="mb-4">
          {error}
        </Alert>
      ) : null}

      {user.type === "internal" ? (
        <div className="mb-4 w-56">
          <Input
            placeholder="施設ID（数値・必須）"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          />
        </div>
      ) : null}

      {user.type === "internal" && !scopedCustomerId ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          施設IDを入力するか、施設ユーザーでログインしてください。
        </div>
      ) : loading ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          読み込み中…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-lg border border-border bg-white p-4">
          <label className="block text-[13px]">
            <span className="mb-1 block font-medium">ユニット</span>
            <select
              className="w-full rounded-md border border-border px-2 py-1.5"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              required
            >
              <option value="">選択</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[13px]">
            <span className="mb-1 block font-medium">喫食日</span>
            <Input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} required />
          </label>

          <label className="block text-[13px]">
            <span className="mb-1 block font-medium">アレルギー種類</span>
            <select
              className="w-full rounded-md border border-border px-2 py-1.5"
              value={allergenTypeId}
              onChange={(e) => setAllergenTypeId(e.target.value)}
              required
            >
              <option value="">選択</option>
              {allergens.map((allergen) => (
                <option key={allergen.id} value={allergen.id}>
                  {allergen.code} {allergen.name}
                </option>
              ))}
            </select>
            {allergens.length === 0 ? (
              <p className="mt-1 text-[12px] text-muted">施設マスタでアレルギー種類を設定してください。</p>
            ) : null}
          </label>

          <label className="block text-[13px]">
            <span className="mb-1 block font-medium">食数</span>
            <Input
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
          </label>

          <div className="flex gap-2">
            <Button type="submit" loading={saving}>
              登録する
            </Button>
            <Link
              href="/orders/allergen"
              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-white px-3 text-[13px] font-medium text-text hover:bg-bg"
            >
              キャンセル
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
