import { ValidationError } from "./errors.js";

const MIN_LENGTH = 12;

function countCharTypes(password: string): number {
  let types = 0;
  if (/[a-z]/.test(password)) types += 1;
  if (/[A-Z]/.test(password)) types += 1;
  if (/[0-9]/.test(password)) types += 1;
  if (/[^a-zA-Z0-9]/.test(password)) types += 1;
  return types;
}

export function validatePassword(password: string, context?: { loginId?: string; name?: string }): void {
  if (password.length < MIN_LENGTH) {
    throw new ValidationError(`パスワードは${MIN_LENGTH}文字以上で入力してください`);
  }
  if (countCharTypes(password) < 3) {
    throw new ValidationError("英大文字・英小文字・数字・記号のうち3種類以上を含めてください");
  }
  if (context?.loginId) {
    const loginId = context.loginId.toLowerCase();
    const lower = password.toLowerCase();
    if (lower === loginId || lower.includes(loginId)) {
      throw new ValidationError("ログインIDと同じ、またはログインIDを含むパスワードは使用できません");
    }
  }
  if (context?.name) {
    const normalizedName = context.name.replace(/\s+/g, "");
    if (normalizedName.length >= 2 && password.includes(normalizedName)) {
      throw new ValidationError("氏名を含むパスワードは使用できません");
    }
  }
}
