"use client";

import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { DOCUMENT_OUTPUT_RULE_CONFIG } from "@/components/masters/configs";

export default function DocumentOutputRulesManagePage() {
  return <SimpleMasterCrudPage config={DOCUMENT_OUTPUT_RULE_CONFIG} />;
}
