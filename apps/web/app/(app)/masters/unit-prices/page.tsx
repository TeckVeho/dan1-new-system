"use client";

import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { UNIT_PRICE_CONFIG } from "@/components/masters/configs";

export default function UnitPricesPage() {
  return <SimpleMasterCrudPage config={UNIT_PRICE_CONFIG} />;
}
