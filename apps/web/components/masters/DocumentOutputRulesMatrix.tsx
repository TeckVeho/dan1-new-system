"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MasterBackLink } from "@/components/masters/MasterBackLink";
import { CustomerSearchSelect } from "@/components/orders/CustomerSearchSelect";
import {
  ApiError,
  createMaster,
  deleteMaster,
  getDocumentOutputMatrix,
  previewDocumentOutputRules,
  updateMaster,
} from "@/lib/api";
import type { DocumentOutputMatrix } from "@/lib/types";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  menu_sheet: "献立表",
  nutrition_report: "栄養月報",
  plating_instruction: "盛付指示書",
};

export function DocumentOutputRulesMatrix() {
  const [matrix, setMatrix] = useState<DocumentOutputMatrix | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [preview, setPreview] = useState<{ dietTypeCode: string; documentTypes: string[]; source: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDocumentOutputMatrix();
      setMatrix(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePreview() {
    if (!customerId.trim()) {
      setError("施設を選択してください");
      return;
    }
    setError(null);
    try {
      const result = await previewDocumentOutputRules(customerId.trim());
      setPreview(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "プレビューに失敗しました");
    }
  }

  function findRule(dietTypeCode: string, documentType: string) {
    return matrix?.rules.find((r) => r.dietTypeCode === dietTypeCode && r.documentType === documentType);
  }

  async function toggleRule(dietTypeCode: string, documentType: string) {
    if (!matrix) return;
    setSaving(true);
    setError(null);
    try {
      const existing = findRule(dietTypeCode, documentType);
      if (existing) {
        await updateMaster("document-output-rules", existing.id, { isEnabled: !existing.isEnabled });
      } else {
        await createMaster("document-output-rules", {
          dietTypeCode,
          documentType,
          isEnabled: true,
          sortOrder: 0,
        });
      }
      setMessage("ルールを更新しました");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function removeRule(dietTypeCode: string, documentType: string) {
    const existing = findRule(dietTypeCode, documentType);
    if (!existing) return;
    if (!window.confirm("このルールを削除しますか？")) return;
    setSaving(true);
    setError(null);
    try {
      await deleteMaster("document-output-rules", existing.id);
      setMessage("ルールを削除しました");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <InternalOnly>
      <MasterBackLink />
      <PageHeader
        title="資料出力ルール"
        description="食種ごとに出力する資料種別を設定します（REQ-11）"
        actions={
          <Link href="/masters/document-output-rules/manage" className="text-[13px] text-primary hover:underline">
            行単位で編集
          </Link>
        }
      />

      {error ? <Alert variant="danger" title="エラー" className="mb-4">{error}</Alert> : null}
      {message ? <Alert variant="success" className="mb-4">{message}</Alert> : null}

      <div className="mb-6 rounded-lg border border-border bg-white p-4">
        <h3 className="mb-2 text-[14px] font-semibold">施設別プレビュー</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[240px]">
            <span className="mb-1 block text-[12px] text-muted">施設</span>
            <CustomerSearchSelect value={customerId} onChange={(id) => setCustomerId(id)} />
          </div>
          <Button type="button" onClick={handlePreview} disabled={saving}>
            出力対象を確認
          </Button>
        </div>
        {preview ? (
          <p className="mt-3 text-[13px]">
            食種 <strong>{preview.dietTypeCode}</strong> / 出力資料:{" "}
            {preview.documentTypes.map((t) => DOCUMENT_TYPE_LABELS[t] ?? t).join("、") || "なし"}
            <span className="ml-2 text-muted">（{preview.source === "override" ? "施設上書き" : "ルール"}）</span>
          </p>
        ) : null}
        <p className="mt-2 text-[12px] text-muted">
          施設個別の上書きは
          <Link href="/masters/customers" className="mx-1 text-primary hover:underline">施設編集</Link>
          の「食種・資料出力」タブから設定できます。
        </p>
      </div>

      {loading || !matrix ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          読み込み中…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-white">
          <table className="min-w-full text-left text-[13px]">
            <thead className="border-b border-border bg-bg text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">食種</th>
                {matrix.documentTypes.map((type) => (
                  <th key={type} className="px-4 py-2 font-medium">
                    {DOCUMENT_TYPE_LABELS[type] ?? type}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.dietTypes.map((diet) => (
                <tr key={diet.code} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-medium">{diet.name}</td>
                  {matrix.documentTypes.map((type) => {
                    const rule = findRule(diet.code, type);
                    const enabled = rule?.isEnabled ?? false;
                    return (
                      <td key={type} className="px-4 py-2 text-center">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => toggleRule(diet.code, type)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            if (rule) removeRule(diet.code, type);
                          }}
                          className={`min-w-[2rem] rounded px-2 py-1 ${enabled ? "bg-primary/10 text-primary" : "text-muted hover:bg-bg"}`}
                          title={rule ? "クリックで切替 / 右クリックで削除" : "クリックで有効化"}
                        >
                          {enabled ? "✓" : "—"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-border px-4 py-2 text-[12px] text-muted">
            セルをクリックして出力の有効/無効を切り替えます。右クリックでルールを削除できます。
          </p>
        </div>
      )}
    </InternalOnly>
  );
}
