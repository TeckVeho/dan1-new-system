type LogFields = Record<string, unknown>;

// Structured JSON logs are parsed by Cloud Logging's severity field automatically
// when running on Cloud Run (docs/11_infrastructure.md §2.6).
function log(severity: "INFO" | "WARNING" | "ERROR", message: string, fields: LogFields = {}) {
  console.log(
    JSON.stringify({
      severity,
      message,
      timestamp: new Date().toISOString(),
      ...fields,
    }),
  );
}

export const logger = {
  info: (message: string, fields?: LogFields) => log("INFO", message, fields),
  warn: (message: string, fields?: LogFields) => log("WARNING", message, fields),
  error: (message: string, fields?: LogFields) => log("ERROR", message, fields),
};
