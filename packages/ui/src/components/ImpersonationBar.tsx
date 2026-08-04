"use client";

import { cn } from "../lib/utils.js";
import { Button } from "./Button.js";

export type ImpersonationMode = "view" | "edit";

export type ImpersonationBarProps = {
  /** Name of the facility/customer currently being viewed as, e.g. "○○苑". */
  targetName: string;
  mode: ImpersonationMode;
  onEnd: () => void;
  endLabel?: string;
  className?: string;
};

const MODE_LABELS: Record<ImpersonationMode, string> = {
  view: "閲覧のみ",
  edit: "操作可",
};

export function ImpersonationBar({
  targetName,
  mode,
  onEnd,
  endLabel = "終了",
  className,
}: ImpersonationBarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2 text-[13px] text-text",
        className,
      )}
      role="status"
    >
      <span>
        <span className="font-medium">{targetName}</span> として表示中（{MODE_LABELS[mode]}）
      </span>
      <Button type="button" variant="secondary" size="sm" onClick={onEnd}>
        {endLabel}
      </Button>
    </div>
  );
}
