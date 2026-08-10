"use client";

import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { DIET_TYPE_CONFIG } from "@/components/masters/configs";

export default function DietTypesPage() {
  return <SimpleMasterCrudPage config={DIET_TYPE_CONFIG} />;
}
