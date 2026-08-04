"use client";

import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { STOCK_ITEM_CONFIG } from "@/components/masters/configs";

export default function StockItemsPage() {
  return <SimpleMasterCrudPage config={STOCK_ITEM_CONFIG} />;
}
