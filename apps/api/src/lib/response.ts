import type { Response } from "express";
import { serializeBigInt } from "@dan1/shared";
import type { ErrorDetail } from "./errors.js";

export type PageMeta = {
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
};

export function sendData(res: Response, data: unknown, status = 200): void {
  res.status(status).json({ data: serializeBigInt(data) });
}

export function sendList(res: Response, items: unknown[], meta: PageMeta, extra?: Record<string, unknown>): void {
  res.status(200).json({ data: serializeBigInt(items), meta, ...(extra ? serializeBigInt(extra) : {}) });
}

export function sendAccepted(res: Response, data: unknown): void {
  res.status(202).json({ data: serializeBigInt(data) });
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}

export function sendMessage(res: Response, message: string): void {
  res.status(200).json({ data: { message } });
}

export function sendErrorPayload(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: ErrorDetail[],
): void {
  res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
}

export function buildPageMeta(page: number, perPage: number, totalCount: number): PageMeta {
  return {
    page,
    perPage,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
  };
}
