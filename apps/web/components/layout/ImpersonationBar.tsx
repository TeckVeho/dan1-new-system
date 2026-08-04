"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { endImpersonation } from "@/lib/auth";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";

export function ImpersonationBar() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const [ending, setEnding] = useState(false);

  if (!user.impersonating) return null;

  async function handleEnd() {
    setEnding(true);
    await endImpersonation();
    await refresh();
    setEnding(false);
    router.push("/dashboard");
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2 text-[13px] text-text">
      <span>
        <span className="font-medium">{user.customerName ?? "施設"}</span> として表示中（操作可）
      </span>
      <Button variant="secondary" size="md" onClick={handleEnd} loading={ending} className="h-7">
        終了
      </Button>
    </div>
  );
}
