import { ValidationError } from "./errors.js";

/**
 * Express 5's route-param type inference falls back to
 * `string | string[]` when a route mixes multiple differently-typed
 * middlewares. Our path params (`:id`, `:customerId`, ...) are always
 * single segments, so this just narrows that back down to `string`.
 */
export function paramId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    if (value.length !== 1) throw new ValidationError("パラメータが不正です");
    return value[0]!;
  }
  if (!value) throw new ValidationError("パラメータが不正です");
  return value;
}
