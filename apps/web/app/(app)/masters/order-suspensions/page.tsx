"use client";

import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { ORDER_SUSPENSION_CONFIG } from "@/components/masters/configs";

export default function OrderSuspensionsPage() {
  return <SimpleMasterCrudPage config={ORDER_SUSPENSION_CONFIG} />;
}
