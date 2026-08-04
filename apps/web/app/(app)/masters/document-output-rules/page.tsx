"use client";

import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { DOCUMENT_OUTPUT_RULE_CONFIG } from "@/components/masters/configs";

export default function DocumentOutputRulesPage() {
  return <SimpleMasterCrudPage config={DOCUMENT_OUTPUT_RULE_CONFIG} />;
}
