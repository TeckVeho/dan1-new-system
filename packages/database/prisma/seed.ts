import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const roles = [
    { code: "system_admin", name: "システム管理者", scope: "internal" as const, sortOrder: 1 },
    { code: "internal_admin", name: "社内管理者", scope: "internal" as const, sortOrder: 2 },
    { code: "internal_staff", name: "社内スタッフ", scope: "internal" as const, sortOrder: 3 },
    { code: "facility_admin", name: "施設管理者", scope: "facility" as const, sortOrder: 4 },
    { code: "facility_staff", name: "施設スタッフ", scope: "facility" as const, sortOrder: 5 },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: role,
      create: role,
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: "system_admin" } });
  const facilityRole = await prisma.role.findUniqueOrThrow({ where: { code: "facility_admin" } });

  await prisma.user.upsert({
    where: { employeeNo: "91001" },
    update: {},
    create: {
      employeeNo: "91001",
      haccpNo: "91001",
      name: "管理者",
      email: "admin@dan1.local",
      passwordHash: hashPassword("91001"),
      passwordChangedAt: new Date(),
      roleId: adminRole.id,
    },
  });

  const customer = await prisma.customer.upsert({
    where: { customerCode: "99999" },
    update: {},
    create: {
      customerCode: "99999",
      name: "テスト施設",
      shortName: "テスト",
      contractStartDate: new Date("2020-01-01"),
      isInternalTest: true,
    },
  });

  const unit = await prisma.unit.upsert({
    where: { customerId_unitCode: { customerId: customer.id, unitCode: "01" } },
    update: {},
    create: {
      customerId: customer.id,
      unitCode: "01",
      name: "本館",
      sortOrder: 1,
    },
  });

  await prisma.customerUser.upsert({
    where: { loginId: "99999" },
    update: {},
    create: {
      customerId: customer.id,
      loginId: "99999",
      name: "テスト施設ユーザー",
      passwordHash: hashPassword("99999"),
      passwordChangedAt: new Date(),
      roleId: facilityRole.id,
    },
  });

  const swallowCategories = [
    { code: "regular", name: "常食", sortOrder: 1 },
    { code: "soft", name: "軟食", sortOrder: 2 },
    { code: "minced", name: "ミキサー", sortOrder: 3 },
  ];
  for (const cat of swallowCategories) {
    await prisma.swallowCategory.upsert({
      where: { code: cat.code },
      update: cat,
      create: cat,
    });
  }

  const mealTypes = [
    { code: "breakfast", name: "朝食", sortOrder: 1 },
    { code: "lunch", name: "昼食", sortOrder: 2 },
    { code: "dinner", name: "夕食", sortOrder: 3 },
  ];
  for (const mt of mealTypes) {
    await prisma.mealType.upsert({ where: { code: mt.code }, update: mt, create: mt });
  }

  const menuKinds = [
    { code: "normal", name: "通常", sortOrder: 1 },
    { code: "thin", name: "薄味", sortOrder: 2 },
  ];
  for (const mk of menuKinds) {
    await prisma.menuKind.upsert({ where: { code: mk.code }, update: mk, create: mk });
  }

  const orderTypes = [
    { code: "normal", name: "通常", sortOrder: 1 },
    { code: "tasting", name: "試食会", sortOrder: 2 },
    { code: "special", name: "特別", sortOrder: 3 },
    { code: "new_year", name: "元旦", sortOrder: 4 },
  ];
  for (const ot of orderTypes) {
    await prisma.orderType.upsert({ where: { code: ot.code }, update: ot, create: ot });
  }

  await prisma.deadlineRule.deleteMany({ where: { name: "通常注文締切" } });
  await prisma.deadlineRule.create({
    data: {
      name: "通常注文締切",
      scopeType: "global",
      dayOffset: -2,
      cutoffTime: "12:00",
    },
  });

  const supplier = await prisma.supplier.upsert({
    where: { code: "S001" },
    update: {},
    create: { code: "S001", name: "エスフーズ", sortOrder: 1 },
  });

  await prisma.stockItem.upsert({
    where: { supplierId_itemCode: { supplierId: supplier.id, itemCode: "ITEM001" } },
    update: {},
    create: {
      supplierId: supplier.id,
      itemCode: "ITEM001",
      name: "豚ミンチ（フ）",
      category: "肉類",
      unit: "kg",
    },
  });

  await prisma.productionPattern.upsert({
    where: { code: "D0" },
    update: {},
    create: { code: "D0", name: "当日製造", leadDays: 0, sortOrder: 1 },
  });

  await prisma.referenceRule.upsert({
    where: { code: "same_menu_180d" },
    update: {},
    create: {
      code: "same_menu_180d",
      name: "過去同一献立（180日）→直近実績",
      ruleConfig: { maxDays: 180, fallback: "latest" },
    },
  });

  await prisma.menuTemplate.create({
    data: {
      title: "標準盛付",
      body: "主菜は中央に配置し、副菜は左右に均等に盛り付ける。",
      tags: ["標準"],
      sortOrder: 1,
    },
  });

  console.log("Seed completed:", {
    customer: customer.customerCode,
    unit: unit.unitCode,
    admin: "91001",
    facility: "99999",
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
