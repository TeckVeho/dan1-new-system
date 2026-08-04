import { Prisma, type PrismaClient } from "@prisma/client";
import { addDays, getWeekStart, type MealOrderSeed, weekDates } from "./helpers.js";
import type { MasterRefs } from "./masters.js";

async function upsertMealOrder(prisma: PrismaClient, order: MealOrderSeed) {
  return prisma.mealOrder.upsert({
    where: {
      unitId_serviceDate_mealTypeId_menuKindId_orderTypeId: {
        unitId: order.unitId,
        serviceDate: order.serviceDate,
        mealTypeId: order.mealTypeId,
        menuKindId: order.menuKindId,
        orderTypeId: order.orderTypeId,
      },
    },
    create: order,
    update: { quantity: order.quantity, status: order.status },
  });
}

function mealQty(mealCode: "breakfast" | "lunch" | "dinner", dayIndex: number): number {
  const base = { breakfast: 8, lunch: 12, dinner: 10 }[mealCode];
  return base + (dayIndex % 3);
}

export async function seedDemoData(prisma: PrismaClient, refs: MasterRefs) {
  const weekStart = getWeekStart();
  const prevWeekStart = addDays(weekStart, -7);
  const nextWeekStart = addDays(weekStart, 7);

  const currentWeek = weekDates(weekStart);
  const prevWeek = weekDates(prevWeekStart);
  const nextWeek = weekDates(nextWeekStart);

  const serviceMonth = `${weekStart.getUTCFullYear()}-${String(weekStart.getUTCMonth() + 1).padStart(2, "0")}`;

  // ── 施設設定 ──────────────────────────────────────────────────────────────

  const settingData = {
    customerId: refs.customer.id,
    validFrom: new Date("2020-01-01"),
    settings: {
      riceEnabled: true,
      allergenEnabled: true,
      defaultMenuKind: "normal",
      notes: "デモ用施設設定",
    },
  };
  const existingSetting = await prisma.customerSetting.findFirst({
    where: { customerId: refs.customer.id, validFrom: settingData.validFrom },
  });
  if (existingSetting) {
    await prisma.customerSetting.update({ where: { id: existingSetting.id }, data: { settings: settingData.settings } });
  } else {
    await prisma.customerSetting.create({ data: settingData });
  }

  for (const [customerId, allergenId] of [
    [refs.customer.id, refs.allergenTypes.egg.id],
    [refs.customer.id, refs.allergenTypes.milk.id],
    [refs.customerPartial.id, refs.allergenTypes.wheat.id],
  ] as const) {
    await prisma.customerAllergen.upsert({
      where: { customerId_allergenTypeId: { customerId, allergenTypeId: allergenId } },
      update: { deletedAt: null },
      create: { customerId, allergenTypeId: allergenId },
    });
  }

  const productionPatternData = {
    customerId: refs.customer.id,
    productionPatternId: refs.productionPattern.id,
    validFrom: new Date("2020-01-01"),
  };
  const existingProductionPattern = await prisma.customerProductionPattern.findFirst({
    where: {
      customerId: productionPatternData.customerId,
      productionPatternId: productionPatternData.productionPatternId,
    },
  });
  if (!existingProductionPattern) {
    await prisma.customerProductionPattern.create({ data: productionPatternData });
  }

  const referenceRuleData = {
    customerId: refs.customer.id,
    referenceRuleId: refs.referenceRule.id,
    validFrom: new Date("2020-01-01"),
  };
  const existingReferenceRule = await prisma.customerReferenceRule.findFirst({
    where: {
      customerId: referenceRuleData.customerId,
      referenceRuleId: referenceRuleData.referenceRuleId,
    },
  });
  if (!existingReferenceRule) {
    await prisma.customerReferenceRule.create({ data: referenceRuleData });
  }

  await prisma.orderSuspension.deleteMany({ where: { customerId: refs.customerSuspended.id } });
  await prisma.orderSuspension.create({
    data: {
      customerId: refs.customerSuspended.id,
      startDate: addDays(weekStart, -14),
      endDate: addDays(weekStart, 14),
      reason: "デモ用：一時休止中",
    },
  });

  await prisma.businessCalendar.upsert({
    where: { calDate: addDays(weekStart, 2) },
    update: { isHoliday: true, note: "デモ祝日" },
    create: { calDate: addDays(weekStart, 2), isHoliday: true, note: "デモ祝日" },
  });

  // ── 食事注文 ────────────────────────────────────────────────────────────

  const mealCodes = ["breakfast", "lunch", "dinner"] as const;

  // 前週: 本館・全食事・確定済み
  for (let dayIndex = 0; dayIndex < prevWeek.length; dayIndex += 1) {
    const serviceDate = prevWeek[dayIndex]!;
    for (const mealCode of mealCodes) {
      await upsertMealOrder(prisma, {
        customerId: refs.customer.id,
        unitId: refs.unitMain.id,
        serviceDate,
        mealTypeId: refs.mealTypes[mealCode].id,
        menuKindId: refs.menuKinds.normal.id,
        orderTypeId: refs.orderTypes.normal.id,
        quantity: mealQty(mealCode, dayIndex),
        status: "confirmed",
      });
    }
  }

  // 当週: 本館・全食事・仮登録（水曜昼のみ薄味）
  for (let dayIndex = 0; dayIndex < currentWeek.length; dayIndex += 1) {
    const serviceDate = currentWeek[dayIndex]!;
    for (const mealCode of mealCodes) {
      const isThinLunch = dayIndex === 2 && mealCode === "lunch";
      await upsertMealOrder(prisma, {
        customerId: refs.customer.id,
        unitId: refs.unitMain.id,
        serviceDate,
        mealTypeId: refs.mealTypes[mealCode].id,
        menuKindId: isThinLunch ? refs.menuKinds.thin.id : refs.menuKinds.normal.id,
        orderTypeId: refs.orderTypes.normal.id,
        quantity: mealQty(mealCode, dayIndex),
        status: dayIndex < 3 ? "provisional" : "draft",
      });
    }
  }

  // 当週: 別館・昼食のみ
  for (let dayIndex = 0; dayIndex < currentWeek.length; dayIndex += 1) {
    await upsertMealOrder(prisma, {
      customerId: refs.customer.id,
      unitId: refs.unitAnnex.id,
      serviceDate: currentWeek[dayIndex]!,
      mealTypeId: refs.mealTypes.lunch.id,
      menuKindId: refs.menuKinds.normal.id,
      orderTypeId: refs.orderTypes.normal.id,
      quantity: 6 + dayIndex,
      status: "provisional",
    });
  }

  // 翌週: 本館・月火の昼食のみ仮登録
  for (let dayIndex = 0; dayIndex < 2; dayIndex += 1) {
    await upsertMealOrder(prisma, {
      customerId: refs.customer.id,
      unitId: refs.unitMain.id,
      serviceDate: nextWeek[dayIndex]!,
      mealTypeId: refs.mealTypes.lunch.id,
      menuKindId: refs.menuKinds.normal.id,
      orderTypeId: refs.orderTypes.normal.id,
      quantity: 11,
      status: "provisional",
    });
  }

  // 試食会（当週金曜昼）
  await upsertMealOrder(prisma, {
    customerId: refs.customer.id,
    unitId: refs.unitMain.id,
    serviceDate: currentWeek[4]!,
    mealTypeId: refs.mealTypes.lunch.id,
    menuKindId: refs.menuKinds.normal.id,
    orderTypeId: refs.orderTypes.tasting.id,
    quantity: 20,
    status: "provisional",
  });

  // サンプル園: 月曜昼のみ（未入力アラート用）
  await upsertMealOrder(prisma, {
    customerId: refs.customerPartial.id,
    unitId: refs.unitPartial.id,
    serviceDate: currentWeek[0]!,
    mealTypeId: refs.mealTypes.lunch.id,
    menuKindId: refs.menuKinds.normal.id,
    orderTypeId: refs.orderTypes.normal.id,
    quantity: 5,
    status: "provisional",
  });

  // ── ご飯注文 ──────────────────────────────────────────────────────────────

  const riceTypes = ["mix", "white", "brown"] as const;
  for (let dayIndex = 0; dayIndex < 5; dayIndex += 1) {
    const serviceDate = currentWeek[dayIndex]!;
    await prisma.riceOrder.upsert({
      where: {
        unitId_serviceDate_riceType: {
          unitId: refs.unitMain.id,
          serviceDate,
          riceType: riceTypes[dayIndex % riceTypes.length]!,
        },
      },
      create: {
        customerId: refs.customer.id,
        unitId: refs.unitMain.id,
        serviceDate,
        riceType: riceTypes[dayIndex % riceTypes.length]!,
        quantity: 10 + dayIndex,
        status: "provisional",
      },
      update: { quantity: 10 + dayIndex, status: "provisional" },
    });
    await prisma.riceOrder.upsert({
      where: {
        unitId_serviceDate_riceType: {
          unitId: refs.unitAnnex.id,
          serviceDate,
          riceType: "mix",
        },
      },
      create: {
        customerId: refs.customer.id,
        unitId: refs.unitAnnex.id,
        serviceDate,
        riceType: "mix",
        quantity: 4 + dayIndex,
        status: "provisional",
      },
      update: { quantity: 4 + dayIndex, status: "provisional" },
    });
  }

  // ── アレルゲン注文 ────────────────────────────────────────────────────────

  for (const [dayIndex, allergenKey, qty] of [
    [1, "egg", 2],
    [3, "egg", 1],
    [4, "milk", 3],
  ] as const) {
    await prisma.allergenOrder.upsert({
      where: {
        unitId_serviceDate_allergenTypeId: {
          unitId: refs.unitMain.id,
          serviceDate: currentWeek[dayIndex]!,
          allergenTypeId: refs.allergenTypes[allergenKey].id,
        },
      },
      create: {
        customerId: refs.customer.id,
        unitId: refs.unitMain.id,
        serviceDate: currentWeek[dayIndex]!,
        allergenTypeId: refs.allergenTypes[allergenKey].id,
        quantity: qty,
        status: "provisional",
      },
      update: { quantity: qty, status: "provisional" },
    });
  }

  // ── 変更履歴（前週月曜昼） ────────────────────────────────────────────────

  const historyOrder = await prisma.mealOrder.findUnique({
    where: {
      unitId_serviceDate_mealTypeId_menuKindId_orderTypeId: {
        unitId: refs.unitMain.id,
        serviceDate: prevWeek[0]!,
        mealTypeId: refs.mealTypes.lunch.id,
        menuKindId: refs.menuKinds.normal.id,
        orderTypeId: refs.orderTypes.normal.id,
      },
    },
  });
  if (historyOrder) {
    await prisma.orderChangeLog.deleteMany({ where: { mealOrderId: historyOrder.id } });
    await prisma.orderChangeLog.createMany({
      data: [
        {
          mealOrderId: historyOrder.id,
          fieldName: "quantity",
          beforeValue: "10",
          afterValue: String(historyOrder.quantity),
          changedBy: refs.adminUser.id,
        },
        {
          mealOrderId: historyOrder.id,
          fieldName: "status",
          beforeValue: "provisional",
          afterValue: "confirmed",
          changedBy: refs.adminUser.id,
        },
      ],
    });
  }

  // ── お知らせ ──────────────────────────────────────────────────────────────

  const announcementTitle = "【デモ】週間注文の締切について";
  const existingAnnouncement = await prisma.announcement.findFirst({ where: { title: announcementTitle } });
  if (existingAnnouncement) {
    await prisma.announcement.update({
      where: { id: existingAnnouncement.id },
      data: {
        body: "毎週水曜 12:00 が通常の締切です。デモ環境では seed データで動作確認できます。",
        category: "system",
        publishFrom: addDays(weekStart, -30),
        publishTo: addDays(weekStart, 90),
        audience: "all",
        isActive: true,
      },
    });
  } else {
    await prisma.announcement.create({
      data: {
        title: announcementTitle,
        body: "毎週水曜 12:00 が通常の締切です。デモ環境では seed データで動作確認できます。",
        category: "system",
        publishFrom: addDays(weekStart, -30),
        publishTo: addDays(weekStart, 90),
        audience: "all",
        isActive: true,
      },
    });
  }

  // ── 献立資料 ──────────────────────────────────────────────────────────────

  const documentTitle = `${serviceMonth} 献立資料（デモ）`;
  let document = await prisma.document.findFirst({
    where: { customerId: refs.customer.id, documentType: "menu_sheet", serviceMonth },
  });
  if (!document) {
    document = await prisma.document.create({
      data: {
        customerId: refs.customer.id,
        documentType: "menu_sheet",
        title: documentTitle,
        serviceMonth,
        isActive: true,
      },
    });
  } else {
    document = await prisma.document.update({
      where: { id: document.id },
      data: { title: documentTitle, isActive: true },
    });
  }

  const existingDemoFile = await prisma.file.findFirst({ where: { storageKey: "demo/menu-sheet-v1.pdf" } });
  const demoFile =
    existingDemoFile ??
    (await prisma.file.create({
      data: {
        storageKey: "demo/menu-sheet-v1.pdf",
        originalName: "menu-sheet-demo.pdf",
        mimeType: "application/pdf",
        sizeBytes: 102400n,
        createdBy: refs.adminUser.id,
      },
    }));

  await prisma.documentVersion.upsert({
    where: { documentId_versionNo: { documentId: document.id, versionNo: 1 } },
    update: {
      fileId: demoFile.id,
      settingsSnapshot: { demo: true, serviceMonth },
      generatedAt: addDays(weekStart, -3),
      generatedBy: refs.adminUser.id,
    },
    create: {
      documentId: document.id,
      versionNo: 1,
      fileId: demoFile.id,
      settingsSnapshot: { demo: true, serviceMonth },
      generatedAt: addDays(weekStart, -3),
      generatedBy: refs.adminUser.id,
    },
  });

  // ── 盛付指示書 ────────────────────────────────────────────────────────────

  for (const dayIndex of [0, 2, 4]) {
    const serviceDate = currentWeek[dayIndex]!;
    const existing = await prisma.platingInstruction.findFirst({
      where: { serviceDate, menuTemplateId: refs.menuTemplate.id },
    });
    const data = {
      serviceDate,
      menuTemplateId: refs.menuTemplate.id,
      bodySnapshot: refs.menuTemplate.body,
      settingsSnapshot: { mealType: "lunch", demo: true },
      isVisible: true,
      createdBy: refs.adminUser.id,
    };
    if (existing) {
      await prisma.platingInstruction.update({ where: { id: existing.id }, data });
    } else {
      await prisma.platingInstruction.create({ data });
    }
  }

  // ── 発注・在庫 ────────────────────────────────────────────────────────────

  const deliveryDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  for (const stockItem of refs.stockItems) {
    for (let i = 0; i < deliveryDates.length; i += 1) {
      const deliveryDate = deliveryDates[i]!;
      const orderQty = new Prisma.Decimal((8 + i + refs.stockItems.indexOf(stockItem)).toFixed(3));
      const stockQty = new Prisma.Decimal((6 + i).toFixed(3));
      const schedule = await prisma.orderSchedule.upsert({
        where: { stockItemId_deliveryDate: { stockItemId: stockItem.id, deliveryDate } },
        create: {
          supplierId: stockItem.itemCode.startsWith("VEG") ? refs.supplierSecondary.id : refs.supplierPrimary.id,
          stockItemId: stockItem.id,
          deliveryDate,
          orderQuantity: orderQty,
          stockQuantity: stockQty,
          status: i < 3 ? "confirmed" : "draft",
          calcSnapshot: { demo: true, source: "seed" },
          confirmedAt: i < 3 ? addDays(weekStart, -1) : null,
        },
        update: {
          orderQuantity: orderQty,
          stockQuantity: stockQty,
          status: i < 3 ? "confirmed" : "draft",
          calcSnapshot: { demo: true, source: "seed" },
        },
      });

      await prisma.orderScheduleReference.deleteMany({ where: { orderScheduleId: schedule.id } });
      if (i === 0) {
        await prisma.orderScheduleReference.create({
          data: {
            orderScheduleId: schedule.id,
            customerId: refs.customer.id,
            referenceDate: prevWeek[0]!,
            referenceQty: new Prisma.Decimal("12.000"),
            fallbackUsed: false,
          },
        });
      }
    }

    await prisma.stockRecord.deleteMany({
      where: { stockItemId: stockItem.id, recordDate: addDays(weekStart, -1) },
    });
    await prisma.stockRecord.create({
      data: {
        stockItemId: stockItem.id,
        recordDate: addDays(weekStart, -1),
        quantity: new Prisma.Decimal("15.000"),
        recordType: "inventory",
        createdBy: refs.adminUser.id,
      },
    });
  }

  await prisma.ingredientMapping.upsert({
    where: { sourceName: "豚ミンチ" },
    update: { stockItemId: refs.stockItems[0]!.id, confidenceScore: new Prisma.Decimal("95.00") },
    create: {
      sourceName: "豚ミンチ",
      stockItemId: refs.stockItems[0]!.id,
      confidenceScore: new Prisma.Decimal("95.00"),
    },
  });

  const existingBatch = await prisma.importBatch.findFirst({
    where: { supplierId: refs.supplierPrimary.id, fileType: "order_schedule_demo" },
  });
  if (!existingBatch) {
    await prisma.importBatch.create({
      data: {
        supplierId: refs.supplierPrimary.id,
        fileType: "order_schedule_demo",
        status: "completed",
        errorCount: 0,
        successCount: refs.stockItems.length,
        params: { demo: true },
        startedAt: addDays(weekStart, -2),
        completedAt: addDays(weekStart, -2),
        createdBy: refs.adminUser.id,
      },
    });
  }

  // ── 請求（下書き） ──────────────────────────────────────────────────────

  const invoice = await prisma.invoice.upsert({
    where: {
      customerId_invoiceMonth_version: {
        customerId: refs.customer.id,
        invoiceMonth: serviceMonth,
        version: 1,
      },
    },
    create: {
      customerId: refs.customer.id,
      invoiceMonth: serviceMonth,
      status: "draft",
      totalAmount: new Prisma.Decimal("125400.00"),
      settingsSnapshot: { demo: true },
    },
    update: {
      status: "draft",
      totalAmount: new Prisma.Decimal("125400.00"),
      settingsSnapshot: { demo: true },
    },
  });

  await prisma.invoiceLine.deleteMany({ where: { invoiceId: invoice.id } });
  await prisma.invoiceLine.createMany({
    data: [
      {
        invoiceId: invoice.id,
        lineNo: 1,
        description: "昼食（通常）",
        quantity: 240,
        unitPrice: new Prisma.Decimal("480.00"),
        amount: new Prisma.Decimal("115200.00"),
        lineType: "meal",
      },
      {
        invoiceId: invoice.id,
        lineNo: 2,
        description: "アレルゲン対応加算",
        quantity: 12,
        unitPrice: new Prisma.Decimal("850.00"),
        amount: new Prisma.Decimal("10200.00"),
        lineType: "surcharge",
      },
    ],
  });

  return {
    weekStart: weekStart.toISOString().slice(0, 10),
    serviceMonth,
    customers: {
      main: refs.customer.customerCode,
      partial: refs.customerPartial.customerCode,
      suspended: refs.customerSuspended.customerCode,
    },
  };
}
