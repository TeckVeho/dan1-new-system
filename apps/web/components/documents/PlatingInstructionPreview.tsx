"use client";

type PlatingInstructionPreviewProps = {
  serviceDate: string;
  body: string;
  title?: string;
};

export function PlatingInstructionPreview({ serviceDate, body, title }: PlatingInstructionPreviewProps) {
  return (
    <div className="plating-print-preview rounded-lg border border-border bg-white p-8 text-[13px] leading-relaxed text-text shadow-sm">
      <div className="mb-6 border-b border-border pb-4 text-center">
        <h2 className="text-lg font-bold tracking-wide">盛付指示書</h2>
        {title ? <p className="mt-1 text-[12px] text-muted">{title}</p> : null}
        <p className="mt-2 text-[12px]">喫食日: {serviceDate || "—"}</p>
      </div>
      <div className="whitespace-pre-wrap font-medium">{body || "（本文未入力）"}</div>
      <div className="mt-8 border-t border-dashed border-border pt-3 text-[11px] text-muted">
        株式会社 談 — 印刷プレビュー
      </div>
    </div>
  );
}
