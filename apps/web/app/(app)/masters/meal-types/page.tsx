"use client";

import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { MEAL_TYPE_CONFIG } from "@/components/masters/configs";

export default function MealTypesPage() {
  return <SimpleMasterCrudPage config={MEAL_TYPE_CONFIG} />;
}
