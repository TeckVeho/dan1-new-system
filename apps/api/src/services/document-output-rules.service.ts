import { prisma } from "@dan1/database";
import { resolveCustomerSetting } from "./settings.service.js";

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  menu_sheet: "献立表",
  nutrition_report: "栄養月報",
  plating_instruction: "盛付指示書",
};

export type ResolvedDocumentOutput = {
  dietTypeCode: string;
  documentTypes: string[];
  source: "rule" | "override";
};

function readDietTypeCode(settings: Record<string, unknown> | null | undefined): string {
  const code = settings?.dietTypeCode;
  return typeof code === "string" && code.length > 0 ? code : "normal";
}

function readOutputOverrides(settings: Record<string, unknown> | null | undefined): Record<string, boolean> | null {
  const raw = settings?.documentOutputOverrides;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const result: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "boolean") result[key] = value;
  }
  return Object.keys(result).length > 0 ? result : null;
}

export async function resolveDocumentOutputTypes(customerId: bigint, asOf: Date): Promise<ResolvedDocumentOutput> {
  const setting = await resolveCustomerSetting(customerId, asOf);
  const settings = (setting?.settings ?? {}) as Record<string, unknown>;
  const dietTypeCode = readDietTypeCode(settings);
  const overrides = readOutputOverrides(settings);

  if (overrides) {
    return {
      dietTypeCode,
      documentTypes: Object.entries(overrides)
        .filter(([, enabled]) => enabled)
        .map(([type]) => type),
      source: "override",
    };
  }

  const rules = await prisma.documentOutputRule.findMany({
    where: {
      dietTypeCode,
      isEnabled: true,
      validFrom: { lte: asOf },
      OR: [{ validTo: null }, { validTo: { gte: asOf } }],
    },
    orderBy: { sortOrder: "asc" },
  });

  return {
    dietTypeCode,
    documentTypes: rules.map((rule) => rule.documentType),
    source: "rule",
  };
}

export async function listDocumentOutputMatrix(asOf: Date) {
  const [dietTypes, rules] = await Promise.all([
    prisma.dietType.findMany({ where: { deletedAt: null, isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.documentOutputRule.findMany({
      where: {
        validFrom: { lte: asOf },
        OR: [{ validTo: null }, { validTo: { gte: asOf } }],
      },
      orderBy: [{ dietTypeCode: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  const documentTypes = [...new Set(rules.map((rule) => rule.documentType))].sort();

  return {
    dietTypes,
    documentTypes,
    rules: rules.map((rule) => ({
      id: rule.id.toString(),
      dietTypeCode: rule.dietTypeCode,
      documentType: rule.documentType,
      isEnabled: rule.isEnabled,
      sortOrder: rule.sortOrder,
      validFrom: rule.validFrom,
      validTo: rule.validTo,
    })),
  };
}
