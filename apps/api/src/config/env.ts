export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "dan1_session",
  jobRunner: process.env.JOB_RUNNER ?? "inline",
};

export const isProduction = env.nodeEnv === "production";
