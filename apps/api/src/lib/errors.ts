export type ErrorDetail = {
  field?: string;
  code?: string;
  message: string;
  meta?: unknown;
};

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ErrorDetail[];

  constructor(status: number, code: string, message: string, details?: ErrorDetail[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message = "入力値が不正です", details?: ErrorDetail[]) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "認証が必要です") {
    super(401, "UNAUTHENTICATED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "この操作を行う権限がありません", details?: ErrorDetail[]) {
    super(403, "FORBIDDEN", message, details);
  }
}

export class ScopeViolationError extends AppError {
  constructor(message = "アクセス権限のない施設のデータです") {
    super(403, "SCOPE_VIOLATION", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "リソースが見つかりません") {
    super(404, "NOT_FOUND", message);
  }
}

export class VersionConflictError extends AppError {
  constructor(message = "他のユーザーが同じデータを更新しました", details?: ErrorDetail[]) {
    super(409, "VERSION_CONFLICT", message, details);
  }
}

export class DuplicateResourceError extends AppError {
  constructor(message = "同じデータが既に存在します", details?: ErrorDetail[]) {
    super(409, "DUPLICATE_RESOURCE", message, details);
  }
}

export class JobAlreadyRunningError extends AppError {
  constructor(message = "同一パラメータのジョブが実行中です") {
    super(409, "JOB_ALREADY_RUNNING", message);
  }
}

export class DeadlineExceededError extends AppError {
  constructor(message = "締切を過ぎています", details?: ErrorDetail[]) {
    super(410, "DEADLINE_EXCEEDED", message, details);
  }
}

export class PeriodClosedError extends AppError {
  constructor(message = "変更可能期間外です") {
    super(410, "PERIOD_CLOSED", message);
  }
}

export class BusinessRuleViolationError extends AppError {
  constructor(message = "業務ルールに違反しています", details?: ErrorDetail[]) {
    super(422, "BUSINESS_RULE_VIOLATION", message, details);
  }
}

export class ValidPeriodOverlapError extends AppError {
  constructor(message = "有効期間が重複しています", details?: ErrorDetail[]) {
    super(422, "VALID_PERIOD_OVERLAP", message, details);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = "リクエストが多すぎます") {
    super(429, "RATE_LIMITED", message);
  }
}

export class InternalError extends AppError {
  constructor(message = "サーバーエラーが発生しました") {
    super(500, "INTERNAL_ERROR", message);
  }
}
