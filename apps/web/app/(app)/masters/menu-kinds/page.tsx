"use client";

import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { MENU_KIND_CONFIG } from "@/components/masters/configs";

export default function MenuKindsPage() {
  return <SimpleMasterCrudPage config={MENU_KIND_CONFIG} />;
}
