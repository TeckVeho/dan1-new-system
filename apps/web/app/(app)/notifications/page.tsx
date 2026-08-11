"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api";
import type { NotificationItem } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  deadline: "締切",
  job: "処理",
  order_alert: "未入力",
  announcement: "お知らせ",
  billing: "請求",
  inquiry: "問い合わせ",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getNotifications({
        perPage: 50,
        isRead: unreadOnly ? false : undefined,
      });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleOpen(item: NotificationItem) {
    setExpandedId(item.id === expandedId ? null : item.id);
    if (!item.isRead) {
      await markNotificationRead(item.id);
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  return (
    <div>
      <PageHeader
        title="通知"
        description="締切リマインドや処理完了などのお知らせです"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setUnreadOnly((v) => !v)}
            >
              {unreadOnly ? "すべて表示" : "未読のみ"}
            </Button>
            <Button variant="secondary" type="button" onClick={handleMarkAllRead}>
              すべて既読
            </Button>
          </div>
        }
      />

      {error ? <Alert variant="danger" title="エラー" className="mb-4">{error}</Alert> : null}

      {loading ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          読み込み中…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          通知はありません
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
                    <Badge variant="muted">{CATEGORY_LABELS[item.category] ?? item.category}</Badge>
                    {!item.isRead ? <Badge variant="primary">未読</Badge> : null}
                    <span className="text-[13px] font-medium text-text">{item.title}</span>
                  </div>
                  <p className="mt-1 text-[12px] text-muted">{formatDateTime(item.createdAt)}</p>
                </div>
              </button>
              {expandedId === item.id ? (
                <div className="border-t border-border px-4 py-3 text-[13px] text-text">
                  <p className="whitespace-pre-wrap">{item.body}</p>
                  {item.linkUrl ? (
                    <Link href={item.linkUrl} className="mt-2 inline-block text-[13px] text-primary hover:underline">
                      詳細を見る
                    </Link>
                  ) : null}
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
