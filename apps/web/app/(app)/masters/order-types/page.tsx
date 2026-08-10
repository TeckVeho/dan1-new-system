"use client";

import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { ORDER_TYPE_CONFIG } from "@/components/masters/configs";

export default function OrderTypesPage() {
  return <SimpleMasterCrudPage config={ORDER_TYPE_CONFIG} />;
}
