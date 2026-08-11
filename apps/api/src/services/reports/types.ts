import type { z } from "zod";
import type { RequestContext } from "../../types/context.js";

export type ReportCategory = "procurement" | "production" | "delivery" | "order" | "billing";
export type ReportFormat = "xlsx" | "csv" | "pdf";
export type ReportSpecStatus = "confirmed" | "provisional";

export type ReportParamField = {
  key: string;
  label: string;
  type: "date" | "string" | "number" | "boolean" | "select";
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
};

export type BuiltReportFile = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  rowCount: number;
};

export type ReportBuildContext = {
  ctx: RequestContext;
  params: Record<string, unknown>;
  setProgress: (progress: number, message?: string) => Promise<void>;
};

export type ReportDefinition = {
  key: string;
  name: string;
  description: string;
  category: ReportCategory;
  formats: ReportFormat[];
  permission: string;
  specStatus: ReportSpecStatus;
  paramsSchema: z.ZodTypeAny;
  paramFields: ReportParamField[];
  build: (input: ReportBuildContext) => Promise<BuiltReportFile>;
};

export type ReportCatalogItem = {
  key: string;
  name: string;
  description: string;
  category: ReportCategory;
  formats: ReportFormat[];
  permission: string;
  specStatus: ReportSpecStatus;
  paramFields: ReportParamField[];
};
