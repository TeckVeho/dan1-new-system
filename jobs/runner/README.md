# @dan1/job-runner

非同期タスク用の最小限の Cloud Run Job ランナー。`infra/terraform` の `cloud_run_job_runner` モジュールがこのイメージをデプロイする想定。参照: `docs/11_infrastructure.md` §2.4。

## 仕組み

1. 呼び出し側（Cloud Tasks / Cloud Scheduler）が `JOB_TYPE`（必須）と `JOB_PAYLOAD`（JSON文字列、任意）を環境変数として設定し、Cloud Run Jobs の実行を開始する。
2. `src/index.ts` が `JOB_TYPE` に対応するハンドラを `src/jobs/index.ts` のレジストリから探して実行する。
3. ハンドラが例外を投げると非ゼロで終了し、Cloud Run Jobs の `max_retries` に従って再試行される。

## ジョブタイプ一覧（プレースホルダー）

| jobType | キュー | 内容 |
|---------|-------|------|
| `import.rakuraku_menu` | imports | らくらく献立取込・食数同期 |
| `calculation.procurement_quantity` | calculations | 発注量計算 |
| `report.generate` | reports | 帳票・資料生成 |
| `export.spreadsheet` | exports | Excel / CSV 出力 |
| `integration.sagawa_shipping` | integrations | 佐川API連携・メール送信 |

いずれも `src/jobs/index.ts` にログのみのプレースホルダーとして実装されている。実処理を追加する際は `@dan1/database` 等をこのパッケージの依存に追加し、ハンドラ内で利用する。

## ローカル実行

```bash
JOB_TYPE=import.rakuraku_menu JOB_PAYLOAD='{"fileId":"123"}' npm run dev -w @dan1/job-runner
```

## 新しいジョブの追加

`src/jobs/index.ts` に `registerJob("<jobType>", async (context) => { ... })` を追加するだけでよい。`context.payload` / `context.taskIndex` / `context.taskAttempt` / `context.taskCount` が利用できる。

## デプロイ

```bash
docker build -f jobs/runner/Dockerfile -t <region>-docker.pkg.dev/<project>/dan1/job-runner:latest .
docker push <region>-docker.pkg.dev/<project>/dan1/job-runner:latest
```

イメージタグは `infra/terraform/environments/<env>/terraform.tfvars` の `job_runner_image` に反映する。
