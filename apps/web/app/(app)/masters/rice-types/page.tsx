"use client";

import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { RICE_TYPE_CONFIG } from "@/components/masters/configs";

export default function RiceTypesPage() {
  return <SimpleMasterCrudPage config={RICE_TYPE_CONFIG} />;
}
