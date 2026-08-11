"use client";

import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { TAX_RATE_CONFIG } from "@/components/masters/configs";

export default function TaxRatesPage() {
  return <SimpleMasterCrudPage config={TAX_RATE_CONFIG} />;
}
