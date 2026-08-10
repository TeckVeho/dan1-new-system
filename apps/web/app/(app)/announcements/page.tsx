"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAnnouncementFeed, markAnnouncementRead } from "@/lib/api";
import type { AnnouncementFeedItem } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function AnnouncementsPage() {
  const [items, setItems] = useState<AnnouncementFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnnouncementFeed({ perPage: 50 });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleOpen(item: AnnouncementFeedItem) {
    setExpandedId(item.id === expandedId ? null : item.id);
    if (!item.isRead) {
      await markAnnouncementRead(item.id);
      setItems((prev) => prev.map((a) => (a.id === item.id ? { ...a, isRead: true } : a)));
    }
  }

  return (
    <div>
      <PageHeader title="お知らせ" description="施設向けのお知らせ一覧です" />

      {error ? <Alert variant="danger" title="エラー" className="mb-4">{error}</Alert> : null}

      {loading ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          読み込み中…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          お知らせはありません
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-border bg-white">
              <button
                type="button"
                className="flex w-full items-start gap-2 px-4 py-3 text-left"
                onClick={() => handleOpen(item)}
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.isPinned ? <Badge variant="warning">固定</Badge> : null}
                    {item.severity === "important" ? <Badge variant="danger">重要</Badge> : null}
                    {!item.isRead ? <Badge variant="primary">未読</Badge> : null}
                    <span className="text-[13px] font-medium text-text">{item.title}</span>
                  </div>
                  <p className="mt-1 text-[12px] text-muted">
                    {formatDateTime(item.publishFrom)} · {item.category}
                  </p>
                </div>
              </button>
              {expandedId === item.id ? (
                <div className="border-t border-border px-4 py-3 text-[13px] text-text whitespace-pre-wrap">
                  {item.body}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <Button variant="secondary" onClick={load}>再読み込み</Button>
      </div>
    </div>
  );
}
