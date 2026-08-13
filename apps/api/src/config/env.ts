export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  /** パスワード再設定リンク等に使う Web アプリの公開 URL */
  publicWebUrl: process.env.PUBLIC_WEB_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:3000",
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "dan1_session",
  jobRunner: process.env.JOB_RUNNER ?? "inline",
  schedulerToken: process.env.SCHEDULER_TOKEN ?? "",
  smtpHost: process.env.SMTP_HOST?.trim() ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER?.trim() ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  mailFrom: process.env.MAIL_FROM?.trim() ?? "",
};

export const isProduction = env.nodeEnv === "production";

export function isSmtpConfigured(): boolean {
  return Boolean(env.smtpHost && env.mailFrom);
}
