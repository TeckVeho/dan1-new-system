"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getCustomers, previewDeliveryDates } from "@/lib/api";
import type { Customer, DeliveryDatePreview } from "@/lib/types";

function DeliveryDatesContent() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [preview, setPreview] = useState<DeliveryDatePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCustomers({ pageSize: 200 })
      .then((res) => {
        setCustomers(res.items);
        if (res.items[0]) setCustomerId(res.items[0].id);
      })
      .catch(() => setCustomers([]));
  }, []);

  const loadPreview = useCallback(async () => {
    if (!customerId || !serviceDate) return;
    setLoading(true);
    setError(null);
    try {
      const result = await previewDeliveryDates({ customerId, serviceDate });
      setPreview(result);
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : "プレビューに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [customerId, serviceDate]);

  return (
    <div>
      <PageHeader
        title="配送日プレビュー"
        description="製造パターンに基づき、喫食日から製造日・集荷日・着日を確認します"
      />

      <section className="mb-4 rounded-lg border border-border bg-white px-4 py-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="施設" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customerCode} {c.name}
              </option>
            ))}
          </Select>
          <Input label="喫食日" type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
          <div className="flex items-end">
            <Button type="button" onClick={loadPreview} disabled={loading || !customerId}>
              {loading ? "計算中…" : "プレビュー"}
            </Button>
          </div>
        </div>
      </section>

      {error ? (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      ) : null}

      {preview ? (
        <section className="rounded-lg border border-border bg-white px-4 py-4">
          <h2 className="text-[15px] font-semibold text-text">
            {preview.customer.customerCode} {preview.customer.name}
          </h2>
          <p className="mt-1 text-[12px] text-muted">
            製造パターン: {preview.pattern.code} {preview.pattern.name}（リード {preview.pattern.leadDays} 日）
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-[11px] text-muted">喫食日</dt>
              <dd className="text-[14px] font-medium">{preview.serviceDate}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted">製造日</dt>
              <dd className="text-[14px] font-medium">{preview.manufacturingDate}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted">集荷日</dt>
              <dd className="text-[14px] font-medium">{preview.pickupDate}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted">着日</dt>
              <dd className="text-[14px] font-medium">{preview.arrivalDate}</dd>
            </div>
          </dl>
          {preview.warnings.length > 0 ? (
            <Alert variant="warning" className="mt-4">
              {preview.warnings.join(" / ")}
            </Alert>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export default function DeliveryDatesPage() {
  return (
    <InternalOnly>
      <DeliveryDatesContent />
    </InternalOnly>
  );
}
