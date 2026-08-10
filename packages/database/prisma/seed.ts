import "./load-env.js";
import { PrismaClient } from "@prisma/client";
import { seedDemoData } from "./seed/demo.js";
import { seedMasters } from "./seed/masters.js";
import { seedPermissions } from "./seed/permissions.js";

const prisma = new PrismaClient();

async function main() {
  const refs = await seedMasters(prisma);
  await seedPermissions(prisma);
  const demo = await seedDemoData(prisma, refs);

  console.log("Seed completed:", {
    customerId: refs.customer.id.toString(),
    customerCode: refs.customer.customerCode,
    units: [refs.unitMain.unitCode, refs.unitAnnex.unitCode],
    weekStart: demo.weekStart,
    serviceMonth: demo.serviceMonth,
    accounts: {
      admin: "91001",
      staff: "91002",
      facilityMain: "99999",
      facilityPartial: "88888",
    },
    demoCustomers: demo.customers,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
