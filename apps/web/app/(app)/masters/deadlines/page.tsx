"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FilterChip } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/layout/DataTable";
import { createMaster, getDeadlineExceptions, getDeadlineRules } from "@/lib/api";
import type { DeadlineException, DeadlineRule } from "@/lib/types";

type Tab = "rules" | "exceptions";

const SCOPE_LABEL: Record<DeadlineRule["scopeType"], string> = {
  global: "全体",
  group: "施設グループ",
  customer: "施設別",
};

function RuleForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [scopeType, setScopeType] = useState<DeadlineRule["scopeType"]>("global");
  const [dayOffset, setDayOffset] = useState(5);
  const [cutoffTime, setCutoffTime] = useState("17:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createMaster("deadline-rules", { name, scopeType, dayOffset, cutoffTime });
      setName("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-4 rounded-lg border border-border bg-white px-4 py-4">
      <h2 className="text-[15px] font-semibold text-text">締切ルールを追加</h2>
      {error ? (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      ) : null}
      <form onSubmit={handleSubmit} className="mt-3 grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Input label="ルール名" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <Select
          label="適用範囲"
          value={scopeType}
          onChange={(e) => setScopeType(e.target.value as DeadlineRule["scopeType"])}
        >
          <option value="global">全体</option>
          <option value="group">施設グループ</option>
          <option value="customer">施設別</option>
        </Select>
        <Input
          label="締切（喫食日の何日前か）"
          type="number"
          value={dayOffset}
          onChange={(e) => setDayOffset(Number(e.target.value))}
        />
        <Input
          label="締切時刻"
          type="time"
          value={cutoffTime}
          onChange={(e) => setCutoffTime(e.target.value)}
        />
        <div className="flex items-end sm:col-span-4">
          <Button type="submit" loading={saving} className="ml-auto">
            <Plus className="h-3.5 w-3.5" />
            追加する
          </Button>
        </div>
      </form>
    </section>
  );
}

function ExceptionForm({ rules, onCreated }: { rules: DeadlineRule[]; onCreated: () => void }) {
  const [deadlineRuleId, setDeadlineRuleId] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [dayOffset, setDayOffset] = useState(12);
  const [cutoffTime, setCutoffTime] = useState("10:00");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!deadlineRuleId) {
      setError("対象の締切ルールを選択してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createMaster("deadline-exceptions", { deadlineRuleId, serviceDate, dayOffset, cutoffTime, reason });
      setServiceDate("");
      setReason("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-4 rounded-lg border border-border bg-white px-4 py-4">
      <h2 className="text-[15px] font-semibold text-text">締切例外日を追加</h2>
      <p className="mt-1 text-[12px] text-muted">例: 正月の前倒し締切など、通常ルールに対する例外を設定します</p>
      {error ? (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      ) : null}
      <form onSubmit={handleSubmit} className="mt-3 grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Select label="対象の締切ルール" value={deadlineRuleId} onChange={(e) => setDeadlineRuleId(e.target.value)}>
            <option value="">選択してください</option>
            {rules.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label="対象喫食日"
          type="date"
          value={serviceDate}
          onChange={(e) => setServiceDate(e.target.value)}
          required
        />
        <Input
          label="締切（何日前）"
          type="number"
          value={dayOffset}
          onChange={(e) => setDayOffset(Number(e.target.value))}
        />
        <Input label="締切時刻" type="time" value={cutoffTime} onChange={(e) => setCutoffTime(e.target.value)} />
        <div className="sm:col-span-2">
          <Input
            label="理由"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例: 2027年正月前倒し"
          />
        </div>
        <div className="flex items-end sm:col-span-4">
          <Button type="submit" loading={saving} className="ml-auto">
            <Plus className="h-3.5 w-3.5" />
            追加する
          </Button>
        </div>
      </form>
    </section>
  );
}

function DeadlinesContent() {
  const [tab, setTab] = useState<Tab>("rules");
  const [rules, setRules] = useState<DeadlineRule[]>([]);
  const [exceptions, setExceptions] = useState<DeadlineException[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, e] = await Promise.all([
        getDeadlineRules({ pageSize: 200 }),
        getDeadlineExceptions({ pageSize: 200 }),
      ]);
      setRules(r.items);
      setExceptions(e.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ruleColumns: DataTableColumn<DeadlineRule>[] = [
    { key: "name", header: "ルール名" },
    { key: "scopeType", header: "適用範囲", render: (row) => SCOPE_LABEL[row.scopeType] },
    { key: "dayOffset", header: "何日前", className: "text-right tabular-nums" },
    { key: "cutoffTime", header: "締切時刻", className: "tabular-nums" },
  ];

  const exceptionColumns: DataTableColumn<DeadlineException>[] = [
    { key: "serviceDate", header: "対象喫食日" },
    {
      key: "deadlineRuleId",
      header: "対象ルール",
      render: (row) => rules.find((r) => r.id === row.deadlineRuleId)?.name ?? row.deadlineRuleId,
    },
    { key: "cutoffTime", header: "締切時刻", className: "tabular-nums" },
    { key: "reason", header: "理由" },
  ];

  return (
    <div>
      <PageHeader
        title="締切マスタ"
        description="仮注文締切をマスタ化し、画面操作のみで変更・例外設定を行えます（REQ-13）"
      />

      {error ? (
        <Alert variant="danger" title="エラー" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <div className="mb-4 flex gap-1.5">
        <FilterChip active={tab === "rules"} onClick={() => setTab("rules")} label="締切ルール" />
        <FilterChip active={tab === "exceptions"} onClick={() => setTab("exceptions")} label="締切例外日" />
      </div>

      {tab === "rules" ? (
        <>
          <RuleForm onCreated={load} />
          <DataTable columns={ruleColumns} rows={rules} getRowKey={(row) => row.id} loading={loading} />
        </>
      ) : (
        <>
          <ExceptionForm rules={rules} onCreated={load} />
          <DataTable columns={exceptionColumns} rows={exceptions} getRowKey={(row) => row.id} loading={loading} />
        </>
      )}
    </div>
  );
}

export default function DeadlinesPage() {
  return (
    <InternalOnly>
      <DeadlinesContent />
    </InternalOnly>
  );
}
