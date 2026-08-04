import { Router } from "express";
import express from "express";
import { fileRegisterSchema, fileUploadUrlRequestSchema } from "@dan1/shared";
import { authenticate, authorize } from "../middleware/auth.js";
import { sendData } from "../lib/response.js";
import { paramId } from "../lib/http.js";
import {
  createDownloadUrl,
  createUploadUrl,
  readDownloadFile,
  registerFile,
  saveUploadedFile,
} from "../services/files.service.js";

export const filesRouter = Router();

filesRouter.post("/upload-url", authenticate, authorize("document.upload"), async (req, res, next) => {
  try {
    const input = fileUploadUrlRequestSchema.parse(req.body);
    const result = await createUploadUrl({
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      createdBy: req.context?.userId,
    });
    sendData(res, result, 201);
  } catch (error) {
    next(error);
  }
});

filesRouter.put(
  "/upload/:token",
  express.raw({ type: "*/*", limit: "50mb" }),
  async (req, res, next) => {
    try {
      const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
      const saved = await saveUploadedFile(token, req.body as Buffer);
      sendData(res, saved);
    } catch (error) {
      next(error);
    }
  },
);

filesRouter.post("/", authenticate, authorize("document.upload"), async (req, res, next) => {
  try {
    const input = fileRegisterSchema.parse(req.body);
    const created = await registerFile({
      ctx: req.context!,
      storageKey: input.storageKey,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });
    sendData(res, created, 201);
  } catch (error) {
    next(error);
  }
});

filesRouter.get("/:id/download-url", authenticate, authorize("document.read"), async (req, res, next) => {
  try {
    const result = await createDownloadUrl(BigInt(paramId(req.params.id)));
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});

filesRouter.get("/download/:token", authenticate, authorize("document.read"), async (req, res, next) => {
  try {
    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    const file = await readDownloadFile(token);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.send(file.body);
  } catch (error) {
    next(error);
  }
});
