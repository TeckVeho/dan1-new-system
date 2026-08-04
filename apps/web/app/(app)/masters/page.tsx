"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { MasterHub } from "@/components/masters/MasterHub";

function MastersHubContent() {
  return (
    <div>
      <PageHeader
        title="マスタ管理"
        description="施設・締切・区分・発注設定などのマスタを一元管理します（FR-201）"
      />
      <MasterHub />
    </div>
  );
}

export default function MastersPage() {
  return (
    <InternalOnly>
      <MastersHubContent />
    </InternalOnly>
  );
}
