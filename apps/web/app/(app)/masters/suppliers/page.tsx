"use client";

import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { SUPPLIER_CONFIG } from "@/components/masters/configs";

export default function SuppliersPage() {
  return <SimpleMasterCrudPage config={SUPPLIER_CONFIG} />;
}
