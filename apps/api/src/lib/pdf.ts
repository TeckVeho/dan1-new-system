import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

export type PdfDocument = InstanceType<typeof PDFDocument>;

export function resolvePdfFontPath(): string | undefined {
  const configured = process.env.PDF_FONT_PATH?.trim();
  if (configured && fs.existsSync(configured)) return configured;

  const defaultPath = path.join(process.cwd(), "assets/fonts/NotoSansJP-Regular.otf");
  if (fs.existsSync(defaultPath)) return defaultPath;

  return undefined;
}

export function applyPdfFont(doc: PdfDocument): void {
  const fontPath = resolvePdfFontPath();
  if (fontPath) {
    doc.font(fontPath);
    return;
  }
  doc.font("Helvetica");
}

export function createPdfBuffer(build: (doc: PdfDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    applyPdfFont(doc);
    build(doc);
    doc.end();
  });
}
