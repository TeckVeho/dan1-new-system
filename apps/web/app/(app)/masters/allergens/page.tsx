"use client";

import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { ALLERGEN_CONFIG } from "@/components/masters/configs";

export default function AllergensPage() {
  return <SimpleMasterCrudPage config={ALLERGEN_CONFIG} />;
}
