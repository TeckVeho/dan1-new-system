import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { buildManualPdfBuffer } from "../services/manual-pdf.service.js";

export const manualRouter = Router();

manualRouter.use(authenticate);

manualRouter.get("/pdf", async (_req, res, next) => {
  try {
    const buffer = await buildManualPdfBuffer();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="manual.pdf"');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});
