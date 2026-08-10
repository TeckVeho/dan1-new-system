"use client";

import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { CUSTOMER_GROUP_CONFIG } from "@/components/masters/configs";

export default function CustomerGroupsPage() {
  return <SimpleMasterCrudPage config={CUSTOMER_GROUP_CONFIG} />;
}
