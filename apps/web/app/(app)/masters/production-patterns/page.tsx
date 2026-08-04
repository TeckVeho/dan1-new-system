"use client";

import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { PRODUCTION_PATTERN_CONFIG } from "@/components/masters/configs";

export default function ProductionPatternsPage() {
  return <SimpleMasterCrudPage config={PRODUCTION_PATTERN_CONFIG} />;
}
