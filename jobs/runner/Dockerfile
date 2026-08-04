# Build context must be the monorepo root, e.g.:
#   docker build -f jobs/runner/Dockerfile -t dan1-job-runner .

FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY jobs/runner/package.json jobs/runner/package.json
RUN npm ci --workspace=@dan1/job-runner --include-workspace-root

COPY jobs/runner ./jobs/runner
RUN npm run build --workspace=@dan1/job-runner

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/jobs/runner/dist ./dist

# JOB_TYPE / JOB_PAYLOAD are set per-execution by the caller (Cloud Tasks / Cloud Scheduler).
CMD ["node", "dist/index.js"]
