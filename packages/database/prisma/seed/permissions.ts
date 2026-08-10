import type { PrismaClient } from "@prisma/client";

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  internal_admin: [
    "announcement.read", "announcement.manage", "order.read", "order.create", "order.update",
    "order.update_after_deadline", "order.delete", "order.export", "order_alert.read", "order_alert.update",
    "master.read", "master.customer.update", "master.deadline.update", "master.long_holiday.update", "master.swallow_category.update",
    "master.production_pattern.update", "master.allergen.update", "master.allergen.delete",
    "master.setout_direction.update", "master.reference_rule.update", "master.stock_item.update",
    "master.qr.update", "master.import", "procurement.schedule.read", "procurement.schedule.update",
    "procurement.schedule.confirm", "procurement.import.execute", "procurement.import.rollback",
    "procurement.stock_record.update", "procurement.adjustment.update", "procurement.recalculate",
    "report.read", "report.generate", "document.read", "document.upload", "document.publish",
    "document.regenerate", "shipping.generate", "shipping.send_api", "invoice.read", "invoice.close",
    "invoice.issue", "invoice.correct", "sales_price.read", "sales_price.generate",
    "admin.user.read", "admin.user.create", "admin.user.update", "admin.audit_log.read",
    "admin.job.cancel", "admin.impersonate", "admin.settings.read", "admin.settings.update",
  ],
  internal_staff: [
    "announcement.read", "order.read", "order.create", "order.update", "order.export", "order_alert.read",
    "master.read", "master.setout_direction.update", "master.reference_rule.update", "master.stock_item.update",
    "procurement.schedule.read", "procurement.schedule.update", "procurement.schedule.confirm",
    "procurement.import.execute", "procurement.stock_record.update", "procurement.adjustment.update",
    "procurement.recalculate", "report.read", "report.generate", "document.read", "document.upload",
    "document.publish", "shipping.generate", "invoice.read", "sales_price.read",
    "admin.job.cancel", "admin.settings.read", "admin.settings.update",
  ],
  facility_admin: [
    "announcement.read", "order.read", "order.create", "order.update", "order.export",
    "report.read", "document.read", "invoice.read",
  ],
  facility_staff: [
    "announcement.read", "order.read", "order.create", "order.update", "order.export",
    "report.read", "document.read",
  ],
};

const PERMISSION_META: Record<string, { name: string; category: string }> = {
  "announcement.read": { name: "お知らせ閲覧", category: "announcement" },
  "announcement.manage": { name: "お知らせ管理", category: "announcement" },
  "order.read": { name: "注文閲覧", category: "order" },
  "order.create": { name: "注文作成", category: "order" },
  "order.update": { name: "注文更新", category: "order" },
  "order.update_after_deadline": { name: "締切後注文更新", category: "order" },
  "order.delete": { name: "注文削除", category: "order" },
  "order.export": { name: "注文出力", category: "order" },
  "order_alert.read": { name: "未入力アラート閲覧", category: "order" },
  "order_alert.update": { name: "未入力アラート更新", category: "order" },
  "master.read": { name: "マスタ閲覧", category: "master" },
  "master.customer.update": { name: "施設マスタ更新", category: "master" },
  "master.deadline.update": { name: "締切マスタ更新", category: "master" },
  "master.long_holiday.update": { name: "長期休暇マスタ更新", category: "master" },
  "master.swallow_category.update": { name: "嚥下食区分更新", category: "master" },
  "master.production_pattern.update": { name: "製造パターン更新", category: "master" },
  "master.allergen.update": { name: "アレルギー更新", category: "master" },
  "master.allergen.delete": { name: "アレルギー削除", category: "master" },
  "master.setout_direction.update": { name: "盛付指示更新", category: "master" },
  "master.reference_rule.update": { name: "参照ロジック更新", category: "master" },
  "master.stock_item.update": { name: "商品マスタ更新", category: "master" },
  "master.qr.update": { name: "QR設定更新", category: "master" },
  "master.import": { name: "マスタ取込", category: "master" },
  "procurement.schedule.read": { name: "発注スケジュール閲覧", category: "procurement" },
  "procurement.schedule.update": { name: "発注スケジュール更新", category: "procurement" },
  "procurement.schedule.confirm": { name: "発注確定", category: "procurement" },
  "procurement.import.execute": { name: "データ取込実行", category: "procurement" },
  "procurement.import.rollback": { name: "データ取込取消", category: "procurement" },
  "procurement.stock_record.update": { name: "棚卸更新", category: "procurement" },
  "procurement.adjustment.update": { name: "食数補正更新", category: "procurement" },
  "procurement.recalculate": { name: "発注量再計算", category: "procurement" },
  "report.read": { name: "帳票閲覧", category: "report" },
  "report.generate": { name: "帳票生成", category: "report" },
  "document.read": { name: "資料閲覧", category: "document" },
  "document.upload": { name: "資料アップロード", category: "document" },
  "document.publish": { name: "資料公開", category: "document" },
  "document.regenerate": { name: "資料再生成", category: "document" },
  "shipping.generate": { name: "配送帳票生成", category: "shipping" },
  "shipping.send_api": { name: "佐川API送信", category: "shipping" },
  "invoice.read": { name: "請求閲覧", category: "invoice" },
  "invoice.close": { name: "請求締め", category: "invoice" },
  "invoice.issue": { name: "請求発行", category: "invoice" },
  "invoice.correct": { name: "請求訂正", category: "invoice" },
  "sales_price.read": { name: "売価閲覧", category: "invoice" },
  "sales_price.generate": { name: "売価計算", category: "invoice" },
  "admin.user.read": { name: "ユーザー閲覧", category: "admin" },
  "admin.user.create": { name: "ユーザー作成", category: "admin" },
  "admin.user.update": { name: "ユーザー更新", category: "admin" },
  "admin.role.update": { name: "ロール権限更新", category: "admin" },
  "admin.audit_log.read": { name: "監査ログ閲覧", category: "admin" },
  "admin.job.cancel": { name: "ジョブ取消", category: "admin" },
  "admin.impersonate": { name: "成り代わり", category: "admin" },
  "admin.settings.read": { name: "システム設定閲覧", category: "admin" },
  "admin.settings.update": { name: "システム設定更新", category: "admin" },
  "admin.data_fix": { name: "データ修正", category: "admin" },
};

function collectAllPermissionCodes(): string[] {
  const codes = new Set<string>();
  for (const roleCodes of Object.values(DEFAULT_ROLE_PERMISSIONS)) {
    for (const code of roleCodes) codes.add(code);
  }
  return [...codes].sort();
}

export async function seedPermissions(prisma: PrismaClient): Promise<void> {
  for (const code of collectAllPermissionCodes()) {
    const meta = PERMISSION_META[code] ?? { name: code, category: code.split(".")[0] ?? "other" };
    await prisma.permission.upsert({
      where: { code },
      update: { name: meta.name, category: meta.category },
      create: { code, name: meta.name, category: meta.category },
    });
  }

  const roles = await prisma.role.findMany();
  const permissions = await prisma.permission.findMany();
  const permissionByCode = new Map(permissions.map((p) => [p.code, p]));

  for (const role of roles) {
    const codes = DEFAULT_ROLE_PERMISSIONS[role.code];
    if (!codes) continue;

    const existing = await prisma.rolePermission.count({ where: { roleId: role.id } });
    if (existing > 0) continue;

    await prisma.rolePermission.createMany({
      data: codes
        .map((code) => permissionByCode.get(code))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((permission) => ({ roleId: role.id, permissionId: permission.id })),
      skipDuplicates: true,
    });
  }
}
