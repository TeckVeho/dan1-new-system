import { prisma } from "@dan1/database";
import { announcementSchema } from "@dan1/shared";
import { createMasterRouter } from "./masters/crud-factory.js";

export const announcementsRouter = createMasterRouter({
  entityType: "announcement",
  model: prisma.announcement,
  createSchema: announcementSchema,
  updateSchema: announcementSchema.partial(),
  searchFields: ["title", "body"],
  defaultSortField: "publishFrom",
  softDelete: false,
  readPermission: "announcement.read",
  writePermission: "announcement.manage",
  toCreateData: (input) => ({
    ...input,
    publishFrom: new Date(input.publishFrom),
    publishTo: input.publishTo ? new Date(input.publishTo) : null,
  }),
  toUpdateData: (input) => ({
    ...input,
    ...(input.publishFrom ? { publishFrom: new Date(input.publishFrom) } : {}),
    ...(input.publishTo !== undefined ? { publishTo: input.publishTo ? new Date(input.publishTo) : null } : {}),
  }),
});
