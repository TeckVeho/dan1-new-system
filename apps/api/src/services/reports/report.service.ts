import { NotFoundError, ValidationError } from "../../lib/errors.js";
import type { RequestContext } from "../../types/context.js";
import { saveGeneratedFile } from "../generated-file.service.js";
import { createAndRunJob } from "../jobs.service.js";
import { getReportDefinition, getReportDefinitionOrThrow, listReportDefinitions } from "./registry.js";
import type { ReportCatalogItem } from "./types.js";

function canAccessReport(ctx: RequestContext, permission: string): boolean {
  if (ctx.permissions.has("*")) return true;
  return ctx.permissions.has(permission);
}

export function listReportCatalog(ctx: RequestContext): ReportCatalogItem[] {
  return listReportDefinitions()
    .filter((def) => canAccessReport(ctx, def.permission))
    .map((def) => ({
      key: def.key,
      name: def.name,
      description: def.description,
      category: def.category,
      formats: def.formats,
      permission: def.permission,
      specStatus: def.specStatus,
      paramFields: def.paramFields,
    }));
}

export type GenerateReportInput = {
  ctx: RequestContext;
  reportKey: string;
  params: Record<string, unknown>;
};

export async function runReportBuild(input: {
  reportKey: string;
  params: Record<string, unknown>;
  createdBy?: bigint;
  setProgress: (progress: number, message?: string) => Promise<void>;
}) {
  const definition = getReportDefinitionOrThrow(input.reportKey);
  const parsed = definition.paramsSchema.safeParse(input.params);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const built = await definition.build({
    ctx: {
      sessionId: 0n,
      userType: "internal",
      userId: input.createdBy,
      name: "system",
      roleCode: "system",
      permissions: new Set(["*"]),
    },
    params: parsed.data as Record<string, unknown>,
    setProgress: input.setProgress,
  });

  if (!input.createdBy) {
    throw new ValidationError("出力ファイルの登録にはユーザー情報が必要です");
  }

  const file = await saveGeneratedFile({
    createdBy: input.createdBy,
    buffer: built.buffer,
    originalName: built.filename,
    mimeType: built.mimeType,
  });

  return {
    fileId: file.id.toString(),
    filename: built.filename,
    rowCount: built.rowCount,
    reportKey: input.reportKey,
  };
}

export async function generateReportJob(input: GenerateReportInput) {
  const definition = getReportDefinition(input.reportKey);
  if (!definition) throw new NotFoundError("帳票が見つかりません");
  if (!canAccessReport(input.ctx, definition.permission)) {
    throw new NotFoundError("帳票が見つかりません");
  }

  const parsed = definition.paramsSchema.safeParse(input.params);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((i) => i.message).join(", "));
  }

  return createAndRunJob({
    jobType: "report.generate",
    createdBy: input.ctx.userId,
    params: {
      reportKey: input.reportKey,
      params: parsed.data,
    },
  });
}
