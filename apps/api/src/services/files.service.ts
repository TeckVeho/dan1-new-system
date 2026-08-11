import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "@dan1/database";
import { NotFoundError } from "../lib/errors.js";
import type { RequestContext } from "../types/context.js";
import { recordAuditLog } from "./audit.service.js";

const UPLOAD_DIR = process.env.FILE_STORAGE_PATH ?? path.join(process.cwd(), "uploads");
const UPLOAD_TOKEN_TTL_MS = 15 * 60 * 1000;

type PendingUpload = {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdBy?: bigint;
  expiresAt: number;
};

const pendingUploads = new Map<string, PendingUpload>();

function sanitizeStorageKey(storageKey: string): string {
  const base = path.basename(storageKey);
  if (!base || base.includes("..")) throw new Error("invalid storage key");
  return base;
}

export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

function createStorageKey(originalName: string): string {
  const ext = path.extname(originalName).slice(0, 20);
  return `${crypto.randomUUID()}${ext}`;
}

function createUploadToken(storageKey: string): string {
  return crypto.createHash("sha256").update(`${storageKey}:${Date.now()}:${crypto.randomUUID()}`).digest("hex");
}

export type CreateUploadUrlInput = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdBy?: bigint;
};

export async function createUploadUrl(input: CreateUploadUrlInput) {
  await ensureUploadDir();
  const storageKey = createStorageKey(input.originalName);
  const token = createUploadToken(storageKey);
  const expiresAt = Date.now() + UPLOAD_TOKEN_TTL_MS;

  pendingUploads.set(token, {
    storageKey,
    originalName: input.originalName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    createdBy: input.createdBy,
    expiresAt,
  });

  return {
    storageKey,
    uploadUrl: `/api/v1/files/upload/${token}`,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

export async function saveUploadedFile(token: string, body: Buffer) {
  const pending = pendingUploads.get(token);
  if (!pending || pending.expiresAt < Date.now()) {
    pendingUploads.delete(token);
    throw new NotFoundError("アップロードURLの有効期限が切れています");
  }

  const storageKey = sanitizeStorageKey(pending.storageKey);
  const filePath = path.join(UPLOAD_DIR, storageKey);
  await fs.writeFile(filePath, body);
  pendingUploads.delete(token);

  return {
    storageKey,
    originalName: pending.originalName,
    mimeType: pending.mimeType,
    sizeBytes: body.length,
    createdBy: pending.createdBy,
  };
}

export type RegisterFileInput = {
  ctx: RequestContext;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

export async function registerFile(input: RegisterFileInput) {
  const storageKey = sanitizeStorageKey(input.storageKey);
  const filePath = path.join(UPLOAD_DIR, storageKey);
  try {
    await fs.access(filePath);
  } catch {
    throw new NotFoundError("アップロードされたファイルが見つかりません");
  }

  const created = await prisma.file.create({
    data: {
      storageKey,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: BigInt(input.sizeBytes),
      createdBy: input.ctx.userId ?? null,
    },
  });

  await recordAuditLog({
    ctx: input.ctx,
    action: "create",
    entityType: "file",
    entityId: created.id,
    after: created,
  });

  return created;
}

export async function getFile(id: bigint) {
  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) throw new NotFoundError("ファイルが見つかりません");
  return file;
}

export async function createDownloadUrl(id: bigint) {
  const file = await getFile(id);
  const token = createUploadToken(file.storageKey);
  const expiresAt = Date.now() + UPLOAD_TOKEN_TTL_MS;
  pendingUploads.set(`download:${token}`, {
    storageKey: file.storageKey,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: Number(file.sizeBytes),
    expiresAt,
  });

  return {
    downloadUrl: `/api/v1/files/download/${token}`,
    expiresAt: new Date(expiresAt).toISOString(),
    originalName: file.originalName,
    mimeType: file.mimeType,
  };
}

export async function readDownloadFile(token: string) {
  const pending = pendingUploads.get(`download:${token}`);
  if (!pending || pending.expiresAt < Date.now()) {
    pendingUploads.delete(`download:${token}`);
    throw new NotFoundError("ダウンロードURLの有効期限が切れています");
  }

  const storageKey = sanitizeStorageKey(pending.storageKey);
  const filePath = path.join(UPLOAD_DIR, storageKey);
  const body = await fs.readFile(filePath);
  pendingUploads.delete(`download:${token}`);

  return {
    body,
    originalName: pending.originalName,
    mimeType: pending.mimeType,
  };
}

export async function readFileContent(id: bigint) {
  const file = await getFile(id);
  const filePath = path.join(UPLOAD_DIR, sanitizeStorageKey(file.storageKey));
  const body = await fs.readFile(filePath);
  return {
    body,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: Number(file.sizeBytes),
  };
}
