"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";
import { createBagDesign, deleteBagDesign, getBagDesigns } from "@/lib/api";
import type { BagDesignItem } from "@/lib/types";

const columns: DataTableColumn<BagDesignItem>[] = [
  { key: "customer", header: "施設", render: (row) => row.customer?.name ?? row.customerId },
  { key: "name", header: "袋名", render: (row) => row.name },
  { key: "facilityNumber", header: "施設番号", render: (row) => row.facilityNumber ?? "—" },
  { key: "maxUnits", header: "最大ユニット", render: (row) => row.maxUnits },
  { key: "maxMeals", header: "最大食数", render: (row) => row.maxMeals },
  {
    key: "units",
    header: "ユニット",
    render: (row) => row.units?.map((u) => u.unit.name).join(", ") || "—",
  },
];

function BagDesignsContent() {
  const [rows, setRows] = useState<BagDesignItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [customerId, setCustomerId] = useState("");
  const [formCustomerId, setFormCustomerId] = useState("");
  const [name, setName] = useState("");
  const [facilityNumber, setFacilityNumber] = useState("");
  const [unitIds, setUnitIds] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getBagDesigns({ customerId: customerId || undefined, page, perPage: pageSize });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [customerId, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formCustomerId || !name.trim()) {
      setError("施設IDと袋名は必須です");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await createBagDesign({
        customerId: formCustomerId,
        name: name.trim(),
        facilityNumber: facilityNumber ? Number(facilityNumber) : undefined,
        unitIds: unitIds.split(",").map((id) => id.trim()).filter(Boolean),
      });
      setMessage("袋設計を登録しました");
      setName("");
      setFacilityNumber("");
      setUnitIds("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("この袋設計を削除しますか？")) return;
    try {
      await deleteBagDesign(id);
      setMessage("削除しました");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  }

  return (
    <div>
      <PageHeader title="袋の集約設計" description="施設ごとの袋設計とユニット割当を管理します（仮仕様）" />

      {error ? <Alert variant="danger" title="エラー" className="mb-4">{error}</Alert> : null}
      {message ? <Alert variant="success" title="完了" className="mb-4">{message}</Alert> : null}

      <form onSubmit={handleCreate} className="mb-4 grid gap-3 rounded-lg border border-border bg-white p-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[12px] text-muted">施設ID *</label>
          <Input value={formCustomerId} onChange={(e) => setFormCustomerId(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-[12px] text-muted">袋名 *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-[12px] text-muted">施設番号</label>
          <Input type="number" value={facilityNumber} onChange={(e) => setFacilityNumber(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-[12px] text-muted">ユニットID（カンマ区切り）</label>
          <Input value={unitIds} onChange={(e) => setUnitIds(e.target.value)} placeholder="1,2,3" />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" loading={saving}>登録</Button>
        </div>
      </form>

      <div className="mb-3 flex gap-2">
        <Input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="施設IDで絞り込み" className="max-w-xs" />
        <Button variant="secondary" onClick={() => { setPage(1); load(); }}>再読込</Button>
      </div>

      <DataTable
        columns={[
          ...columns,
          {
            key: "actions",
            header: "",
            render: (row) => (
              <Button variant="secondary" type="button" onClick={() => handleDelete(row.id)}>
                削除
              </Button>
            ),
          },
        ]}
        rows={rows}
        getRowKey={(row) => row.id}
        emptyMessage={loading ? "読み込み中…" : "袋設計がありません"}
      />
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  );
}

export default function BagDesignsPage() {
  return (
    <InternalOnly>
      <BagDesignsContent />
    </InternalOnly>
  );
}
