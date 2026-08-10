"use client";

import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { LONG_HOLIDAY_CONFIG } from "@/components/masters/configs";

export default function LongHolidaysPage() {
  return <SimpleMasterCrudPage config={LONG_HOLIDAY_CONFIG} />;
}
