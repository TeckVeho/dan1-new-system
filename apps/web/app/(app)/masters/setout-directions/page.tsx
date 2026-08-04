"use client";

import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { SETOUT_DIRECTION_CONFIG } from "@/components/masters/configs";

export default function SetoutDirectionsPage() {
  return <SimpleMasterCrudPage config={SETOUT_DIRECTION_CONFIG} />;
}
