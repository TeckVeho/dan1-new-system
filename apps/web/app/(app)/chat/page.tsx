"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  createInquiryThread,
  getInquiryThread,
  getInquiryThreads,
  markInquiryThreadRead,
  patchInquiryThreadStatus,
  postInquiryMessage,
} from "@/lib/api";
import type { InquiryThreadDetail, InquiryThreadItem } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  open: "対応中",
  closed: "終了",
};

export default function ChatPage() {
  const { user, can } = useAuth();
  const isInternal = user.type === "internal";
  const [threads, setThreads] = useState<InquiryThreadItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InquiryThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCustomerId, setNewCustomerId] = useState("");
  const [filterCustomerId, setFilterCustomerId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "open" | "closed">("");

  const loadThreads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInquiryThreads({
        customerId: filterCustomerId || undefined,
        status: statusFilter || undefined,
        perPage: 50,
      });
      setThreads(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [filterCustomerId, statusFilter]);

  const loadDetail = useCallback(async (threadId: string) => {
    setDetailLoading(true);
    try {
      await markInquiryThreadRead(threadId);
      const data = await getInquiryThread(threadId);
      setDetail(data);
      setSelectedId(threadId);
      await loadThreads();
    } catch (e) {
      setError(e instanceof Error ? e.message : "詳細の読み込みに失敗しました");
    } finally {
      setDetailLoading(false);
    }
  }, [loadThreads]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  async function handleCreateThread(e: React.FormEvent) {
    e.preventDefault();
    if (!newBody.trim()) return;
    setSending(true);
    setError(null);
    try {
      const created = await createInquiryThread({
        customerId: isInternal ? newCustomerId || undefined : undefined,
        subject: newSubject || undefined,
        body: newBody.trim(),
      });
      setShowNewForm(false);
      setNewSubject("");
      setNewBody("");
      setNewCustomerId("");
      await loadThreads();
      await loadDetail(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setSending(false);
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    setError(null);
    try {
      await postInquiryMessage(selectedId, reply.trim());
      setReply("");
      await loadDetail(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSending(false);
    }
  }

  async function handleToggleStatus() {
    if (!detail) return;
    const nextStatus = detail.status === "open" ? "closed" : "open";
    setSending(true);
    try {
      await patchInquiryThreadStatus(detail.id, nextStatus);
      await loadDetail(detail.id);
      await loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="問い合わせ"
        description="施設と社内のやり取りを確認・返信できます"
        actions={
          can("inquiry.create") ? (
            <Button type="button" variant="secondary" onClick={() => setShowNewForm((v) => !v)}>
              {showNewForm ? "閉じる" : "新規問い合わせ"}
            </Button>
          ) : null
        }
      />

      {error ? <Alert variant="danger" title="エラー" className="mb-4">{error}</Alert> : null}

      {showNewForm ? (
        <section className="mb-4 rounded-lg border border-border bg-white p-4">
          <h2 className="mb-3 text-[14px] font-semibold">新規問い合わせ</h2>
          <form onSubmit={handleCreateThread} className="space-y-3">
            {isInternal ? (
              <Input
                label="施設ID（社内のみ必須）"
                value={newCustomerId}
                onChange={(e) => setNewCustomerId(e.target.value)}
                required
              />
            ) : null}
            <Input
              label="件名（任意）"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
            />
            <label className="block text-[13px]">
              <span className="mb-1 block text-[12px] text-muted">内容</span>
              <textarea
                className="min-h-[120px] w-full rounded-md border border-border px-3 py-2 text-[13px]"
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                required
              />
            </label>
            <Button type="submit" loading={sending}>送信</Button>
          </form>
        </section>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-3">
        {isInternal ? (
          <Input
            label="施設ID"
            value={filterCustomerId}
            onChange={(e) => setFilterCustomerId(e.target.value)}
            className="w-40"
          />
        ) : null}
        <label className="text-[13px]">
          <span className="mb-1 block text-[12px] text-muted">状態</span>
          <select
            className="rounded-md border border-border px-3 py-2 text-[13px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | "open" | "closed")}
          >
            <option value="">すべて</option>
            <option value="open">対応中</option>
            <option value="closed">終了</option>
          </select>
        </label>
        <div className="flex items-end">
          <Button type="button" variant="secondary" onClick={loadThreads}>再読み込み</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-white">
          <div className="border-b border-border px-4 py-3 text-[14px] font-semibold">スレッド一覧</div>
          {loading ? (
            <div className="px-4 py-10 text-center text-[13px] text-muted">読み込み中…</div>
          ) : threads.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-muted">問い合わせはありません</div>
          ) : (
            <ul>
              {threads.map((thread) => (
                <li key={thread.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    className={`w-full px-4 py-3 text-left hover:bg-surface-subtle ${selectedId === thread.id ? "bg-surface-subtle" : ""}`}
                    onClick={() => loadDetail(thread.id)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={thread.status === "open" ? "primary" : "muted"}>
                        {STATUS_LABELS[thread.status] ?? thread.status}
                      </Badge>
                      {(thread.unreadCount ?? 0) > 0 ? <Badge variant="warning">未読</Badge> : null}
                      <span className="text-[13px] font-medium">
                        {thread.subject || "（件名なし）"}
                      </span>
                    </div>
                    {isInternal ? (
                      <p className="mt-1 text-[12px] text-muted">
                        {thread.customerCode} {thread.customerName}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[12px] text-muted">
                      {thread.lastMessageAt ? formatDateTime(thread.lastMessageAt) : formatDateTime(thread.createdAt)}
                    </p>
                    {thread.lastMessage ? (
                      <p className="mt-1 line-clamp-2 text-[12px] text-text">{thread.lastMessage.body}</p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-[14px] font-semibold">詳細</h2>
            {detail && can("inquiry.reply") ? (
              <Button type="button" variant="secondary" loading={sending} onClick={handleToggleStatus}>
                {detail.status === "open" ? "終了する" : "再開する"}
              </Button>
            ) : null}
          </div>
          {!selectedId || !detail ? (
            <div className="px-4 py-10 text-center text-[13px] text-muted">
              スレッドを選択してください
            </div>
          ) : detailLoading ? (
            <div className="px-4 py-10 text-center text-[13px] text-muted">読み込み中…</div>
          ) : (
            <div className="p-4">
              {isInternal ? (
                <p className="mb-3 text-[13px] text-muted">
                  {detail.customerCode} {detail.customerName}
                </p>
              ) : null}
              <ul className="mb-4 max-h-[420px] space-y-3 overflow-y-auto">
                {detail.messages.map((message) => (
                  <li
                    key={message.id}
                    className={`rounded-md border px-3 py-2 ${
                      message.senderType === (isInternal ? "internal" : "facility")
                        ? "border-primary/20 bg-primary/5 ml-8"
                        : "border-border bg-white mr-8"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2 text-[12px] text-muted">
                      <span>{message.senderType === "internal" ? "社内" : "施設"}</span>
                      <span>{formatDateTime(message.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-[13px]">{message.body}</p>
                  </li>
                ))}
              </ul>
              {can("inquiry.reply") && detail.status === "open" ? (
                <form onSubmit={handleReply} className="space-y-2">
                  <textarea
                    className="min-h-[96px] w-full rounded-md border border-border px-3 py-2 text-[13px]"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="返信を入力"
                    required
                  />
                  <Button type="submit" loading={sending}>返信</Button>
                </form>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
