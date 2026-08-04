import type { ErrorRequestHandler, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";
import { sendErrorPayload } from "../lib/response.js";

export const notFoundHandler = (req: Request, res: Response): void => {
  sendErrorPayload(res, 404, "NOT_FOUND", `${req.method} ${req.path} は存在しません`);
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    sendErrorPayload(res, err.status, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join(".") || undefined,
      code: "VALIDATION_ERROR",
      message: issue.message,
    }));
    sendErrorPayload(res, 400, "VALIDATION_ERROR", "入力値の形式が不正です", details);
    return;
  }

  if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2025") {
    sendErrorPayload(res, 404, "NOT_FOUND", "リソースが見つかりません");
    return;
  }

  // eslint-disable-next-line no-console
  console.error(err);
  sendErrorPayload(res, 500, "INTERNAL_ERROR", "サーバーエラーが発生しました");
};
