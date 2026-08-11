import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@dan1/database";
import { ensureUploadDir } from "./files.service.js";
import { recordAuditLog } from "./audit.service.js";

const UPLOAD_DIR = process.env.FILE_STORAGE_PATH ?? path.join(process.cwd(), "uploads");

export type SaveGeneratedFileInput = {
  createdBy?: bigint | null;
  buffer: Buffer;
  originalName: string;
  mimeType: string;
};

export async function saveGeneratedFile(input: SaveGeneratedFileInput) {
  await ensureUploadDir();
  const storageKey = `${crypto.randomUUID()}${path.extname(input.originalName) || ""}`;
  const filePath = path.join(UPLOAD_DIR, storageKey);
  await fs.writeFile(filePath, input.buffer);

  const created = await prisma.file.create({
    data: {
      storageKey,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: BigInt(input.buffer.length),
      createdBy: input.createdBy ?? null,
    },
  });

  await recordAuditLog({
    ctx: {
      sessionId: 0n,
      userType: "internal",
      userId: input.createdBy ?? undefined,
      name: "system",
      roleCode: "system_admin",
      permissions: new Set(["*"]),
    },
    action: "create",
    entityType: "file",
    entityId: created.id,
    after: created,
  });

  return created;
}
