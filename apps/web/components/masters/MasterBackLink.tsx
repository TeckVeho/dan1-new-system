"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function MasterBackLink() {
  return (
    <Link
      href="/masters"
      className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-primary"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      マスタ一覧へ
    </Link>
  );
}
