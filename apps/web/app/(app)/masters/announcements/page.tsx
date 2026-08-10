"use client";

import { AdminOnly } from "@/components/auth/AdminOnly";
import { SimpleMasterCrudPage } from "@/components/masters/SimpleMasterCrudPage";
import { ANNOUNCEMENT_CONFIG } from "@/components/masters/configs";

export default function AnnouncementsAdminPage() {
  return (
    <AdminOnly>
      <SimpleMasterCrudPage config={ANNOUNCEMENT_CONFIG} />
    </AdminOnly>
  );
}
