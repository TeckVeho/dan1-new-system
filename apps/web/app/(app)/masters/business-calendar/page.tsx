"use client";

import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { BUSINESS_CALENDAR_CONFIG } from "@/components/masters/configs";

export default function BusinessCalendarPage() {
  return <SimpleMasterCrudPage config={BUSINESS_CALENDAR_CONFIG} />;
}
