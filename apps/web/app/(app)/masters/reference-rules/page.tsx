"use client";

import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { REFERENCE_RULE_CONFIG } from "@/components/masters/configs";

export default function ReferenceRulesPage() {
  return <SimpleMasterCrudPage config={REFERENCE_RULE_CONFIG} />;
}
