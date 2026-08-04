import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "./helpers.js";

export type MasterRefs = {
  adminRole: { id: bigint };
  internalStaffRole: { id: bigint };
  facilityRole: { id: bigint };
  adminUser: { id: bigint };
  customer: { id: bigint; customerCode: string };
  unitMain: { id: bigint; unitCode: string };
  unitAnnex: { id: bigint; unitCode: string };
  customerPartial: { id: bigint; customerCode: string };
  customerSuspended: { id: bigint; customerCode: string };
  unitPartial: { id: bigint };
  supplierPrimary: { id: bigint };
  supplierSecondary: { id: bigint };
  stockItems: { id: bigint; itemCode: string }[];
  mealTypes: Record<"breakfast" | "lunch" | "dinner", { id: bigint }>;
  menuKinds: Record<"normal" | "thin", { id: bigint }>;
  orderTypes: Record<"normal" | "tasting" | "special", { id: bigint }>;
  allergenTypes: Record<"egg" | "milk" | "wheat" | "shrimp", { id: bigint }>;
  productionPattern: { id: bigint };
  referenceRule: { id: bigint };
  menuTemplate: { id: bigint };
  deadlineRule: { id: bigint };
};

export async function seedMasters(prisma: PrismaClient): Promise<MasterRefs> {
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
  const internalStaffRole = await prisma.role.findUniqueOrThrow({ where: { code: "internal_staff" } });
  const facilityRole = await prisma.role.findUniqueOrThrow({ where: { code: "facility_admin" } });

  const adminUser = await prisma.user.upsert({
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

  await prisma.user.upsert({
    where: { employeeNo: "91002" },
    update: {},
    create: {
      employeeNo: "91002",
      haccpNo: "91002",
      name: "社内スタッフ",
      email: "staff@dan1.local",
      passwordHash: hashPassword("91002"),
      passwordChangedAt: new Date(),
      roleId: internalStaffRole.id,
    },
  });

  const customerGroup = await prisma.customerGroup.upsert({
    where: { code: "DEMO" },
    update: { name: "デモ施設グループ" },
    create: { code: "DEMO", name: "デモ施設グループ", sortOrder: 1 },
  });

  const customer = await prisma.customer.upsert({
    where: { customerCode: "99999" },
    update: { customerGroupId: customerGroup.id },
    create: {
      customerCode: "99999",
      name: "テスト施設",
      shortName: "テスト",
      nameKana: "テストシセツ",
      customerGroupId: customerGroup.id,
      postalCode: "1000001",
      prefecture: "東京都",
      address: "千代田区千代田1-1",
      phone: "03-0000-0001",
      contactName: "施設担当者",
      contractStartDate: new Date("2020-01-01"),
      isInternalTest: true,
    },
  });

  const customerPartial = await prisma.customer.upsert({
    where: { customerCode: "88888" },
    update: {},
    create: {
      customerCode: "88888",
      name: "サンプル園",
      shortName: "サンプル",
      customerGroupId: customerGroup.id,
      contractStartDate: new Date("2021-04-01"),
      isInternalTest: true,
    },
  });

  const customerSuspended = await prisma.customer.upsert({
    where: { customerCode: "77777" },
    update: {},
    create: {
      customerCode: "77777",
      name: "休止デモ施設",
      shortName: "休止",
      customerGroupId: customerGroup.id,
      contractStartDate: new Date("2019-01-01"),
      isInternalTest: true,
    },
  });

  const unitMain = await prisma.unit.upsert({
    where: { customerId_unitCode: { customerId: customer.id, unitCode: "01" } },
    update: { name: "本館", sortOrder: 1 },
    create: {
      customerId: customer.id,
      unitCode: "01",
      name: "本館",
      sortOrder: 1,
    },
  });

  const unitAnnex = await prisma.unit.upsert({
    where: { customerId_unitCode: { customerId: customer.id, unitCode: "02" } },
    update: { name: "別館", sortOrder: 2 },
    create: {
      customerId: customer.id,
      unitCode: "02",
      name: "別館",
      sortOrder: 2,
    },
  });

  const unitPartial = await prisma.unit.upsert({
    where: { customerId_unitCode: { customerId: customerPartial.id, unitCode: "01" } },
    update: {},
    create: {
      customerId: customerPartial.id,
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

  await prisma.customerUser.upsert({
    where: { loginId: "88888" },
    update: {},
    create: {
      customerId: customerPartial.id,
      loginId: "88888",
      name: "サンプル園ユーザー",
      passwordHash: hashPassword("88888"),
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

  const regularSwallow = await prisma.swallowCategory.findUniqueOrThrow({ where: { code: "regular" } });

  const mealTypeDefs = [
    { code: "breakfast", name: "朝食", sortOrder: 1 },
    { code: "lunch", name: "昼食", sortOrder: 2 },
    { code: "dinner", name: "夕食", sortOrder: 3 },
  ] as const;
  for (const mt of mealTypeDefs) {
    await prisma.mealType.upsert({ where: { code: mt.code }, update: mt, create: mt });
  }

  const menuKindDefs = [
    { code: "normal", name: "通常", sortOrder: 1, swallowCategoryId: regularSwallow.id },
    { code: "thin", name: "薄味", sortOrder: 2, swallowCategoryId: regularSwallow.id },
  ] as const;
  for (const mk of menuKindDefs) {
    await prisma.menuKind.upsert({ where: { code: mk.code }, update: mk, create: mk });
  }

  const orderTypeDefs = [
    { code: "normal", name: "通常", sortOrder: 1 },
    { code: "tasting", name: "試食会", sortOrder: 2 },
    { code: "special", name: "特別", sortOrder: 3 },
    { code: "new_year", name: "元旦", sortOrder: 4 },
  ];
  for (const ot of orderTypeDefs) {
    await prisma.orderType.upsert({ where: { code: ot.code }, update: ot, create: ot });
  }

  const allergenDefs = [
    { code: "egg", name: "卵", sortOrder: 1 },
    { code: "milk", name: "乳", sortOrder: 2 },
    { code: "wheat", name: "小麦", sortOrder: 3 },
    { code: "shrimp", name: "えび", sortOrder: 4 },
  ] as const;
  for (const allergen of allergenDefs) {
    await prisma.allergenType.upsert({ where: { code: allergen.code }, update: allergen, create: allergen });
  }

  await prisma.deadlineRule.deleteMany({ where: { name: "通常注文締切" } });
  const deadlineRule = await prisma.deadlineRule.create({
    data: {
      name: "通常注文締切",
      scopeType: "global",
      dayOffset: -2,
      cutoffTime: "12:00",
    },
  });

  const supplierPrimary = await prisma.supplier.upsert({
    where: { code: "S001" },
    update: { name: "エスフーズ", sortOrder: 1 },
    create: { code: "S001", name: "エスフーズ", sortOrder: 1 },
  });

  const supplierSecondary = await prisma.supplier.upsert({
    where: { code: "S002" },
    update: { name: "フレッシュ青果", sortOrder: 2 },
    create: { code: "S002", name: "フレッシュ青果", sortOrder: 2 },
  });

  const stockItemDefs = [
    { supplierId: supplierPrimary.id, itemCode: "ITEM001", name: "豚ミンチ（フ）", category: "肉類", unit: "kg", sortOrder: 1 },
    { supplierId: supplierPrimary.id, itemCode: "ITEM002", name: "鶏もも肉（骨なし）", category: "肉類", unit: "kg", sortOrder: 2 },
    { supplierId: supplierPrimary.id, itemCode: "ITEM003", name: "玉ねぎ（国産）", category: "野菜", unit: "kg", sortOrder: 3 },
    { supplierId: supplierSecondary.id, itemCode: "VEG001", name: "キャベツ", category: "野菜", unit: "kg", sortOrder: 1 },
    { supplierId: supplierSecondary.id, itemCode: "VEG002", name: "にんじん", category: "野菜", unit: "kg", sortOrder: 2 },
  ];

  const stockItems: { id: bigint; itemCode: string }[] = [];
  for (const item of stockItemDefs) {
    const row = await prisma.stockItem.upsert({
      where: { supplierId_itemCode: { supplierId: item.supplierId, itemCode: item.itemCode } },
      update: {
        name: item.name,
        category: item.category,
        unit: item.unit,
        sortOrder: item.sortOrder,
      },
      create: item,
    });
    stockItems.push({ id: row.id, itemCode: row.itemCode });
  }

  const productionPattern = await prisma.productionPattern.upsert({
    where: { code: "D0" },
    update: {},
    create: { code: "D0", name: "当日製造", leadDays: 0, sortOrder: 1 },
  });

  const referenceRule = await prisma.referenceRule.upsert({
    where: { code: "same_menu_180d" },
    update: {},
    create: {
      code: "same_menu_180d",
      name: "過去同一献立（180日）→直近実績",
      ruleConfig: { maxDays: 180, fallback: "latest" },
    },
  });

  const menuTemplateData = {
    title: "標準盛付",
    body: "主菜は中央に配置し、副菜は左右に均等に盛り付ける。",
    tags: ["標準"],
    sortOrder: 1,
    isActive: true,
  };
  const existingMenuTemplate = await prisma.menuTemplate.findFirst({ where: { title: menuTemplateData.title } });
  const menuTemplate = existingMenuTemplate
    ? await prisma.menuTemplate.update({ where: { id: existingMenuTemplate.id }, data: menuTemplateData })
    : await prisma.menuTemplate.create({ data: menuTemplateData });

  const documentOutputRules = [
    { mealTypeCode: "breakfast", documentType: "menu_sheet", sortOrder: 1 },
    { mealTypeCode: "lunch", documentType: "menu_sheet", sortOrder: 2 },
    { mealTypeCode: "dinner", documentType: "menu_sheet", sortOrder: 3 },
    { mealTypeCode: "lunch", documentType: "plating_instruction", sortOrder: 4 },
  ];
  for (const rule of documentOutputRules) {
    await prisma.documentOutputRule.upsert({
      where: { mealTypeCode_documentType: { mealTypeCode: rule.mealTypeCode, documentType: rule.documentType } },
      update: rule,
      create: rule,
    });
  }

  const breakfast = await prisma.mealType.findUniqueOrThrow({ where: { code: "breakfast" } });
  const lunch = await prisma.mealType.findUniqueOrThrow({ where: { code: "lunch" } });
  const dinner = await prisma.mealType.findUniqueOrThrow({ where: { code: "dinner" } });
  const normalMenu = await prisma.menuKind.findUniqueOrThrow({ where: { code: "normal" } });
  const thinMenu = await prisma.menuKind.findUniqueOrThrow({ where: { code: "thin" } });
  const normalOrderType = await prisma.orderType.findUniqueOrThrow({ where: { code: "normal" } });
  const tastingOrderType = await prisma.orderType.findUniqueOrThrow({ where: { code: "tasting" } });
  const specialOrderType = await prisma.orderType.findUniqueOrThrow({ where: { code: "special" } });
  const egg = await prisma.allergenType.findUniqueOrThrow({ where: { code: "egg" } });
  const milk = await prisma.allergenType.findUniqueOrThrow({ where: { code: "milk" } });
  const wheat = await prisma.allergenType.findUniqueOrThrow({ where: { code: "wheat" } });
  const shrimp = await prisma.allergenType.findUniqueOrThrow({ where: { code: "shrimp" } });

  return {
    adminRole,
    internalStaffRole,
    facilityRole,
    adminUser,
    customer,
    unitMain,
    unitAnnex,
    customerPartial,
    customerSuspended,
    unitPartial,
    supplierPrimary,
    supplierSecondary,
    stockItems,
    mealTypes: { breakfast, lunch, dinner },
    menuKinds: { normal: normalMenu, thin: thinMenu },
    orderTypes: { normal: normalOrderType, tasting: tastingOrderType, special: specialOrderType },
    allergenTypes: { egg, milk, wheat, shrimp },
    productionPattern,
    referenceRule,
    menuTemplate,
    deadlineRule,
  };
}
