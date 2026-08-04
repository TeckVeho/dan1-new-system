import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(20),
  sort: z.string().optional(),
  q: z.string().optional(),
  includeDeleted: z.coerce.boolean().optional().default(false),
  asOf: z.string().optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function parseSort(sort: string | undefined, allowedFields: string[], fallback: string) {
  if (!sort) return { [fallback]: "asc" as const };
  const desc = sort.startsWith("-");
  const field = desc ? sort.slice(1) : sort;
  if (!allowedFields.includes(field)) return { [fallback]: "asc" as const };
  return { [field]: desc ? ("desc" as const) : ("asc" as const) };
}

export function toSkipTake(page: number, perPage: number) {
  return { skip: (page - 1) * perPage, take: perPage };
}
