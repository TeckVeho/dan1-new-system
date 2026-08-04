# infra/terraform

dan1-new-system の GCP インフラを構築する Terraform スケルトン。構成の背景は [`docs/11_infrastructure.md`](../../docs/11_infrastructure.md) を参照。

## ⚠️ このスケルトンは `terraform apply` がそのまま通る状態ではありません

以下がすべて揃うまでは **plan / apply を実行しないこと**。

1. **GCP プロジェクトと認証情報。** 環境ごとに実在する GCP プロジェクト（`dan1-system-dev` / `-stg` / `-prod`）と、課金が有効なアカウントが必要。ローカルでは `gcloud auth application-default login`、CI では Workload Identity 連携のサービスアカウントを使う（サービスアカウントキーは発行しない）。
2. **Terraform state 用バケット。** `environments/<env>/backend.hcl` が指す GCS バケット（例: `dan1-terraform-state-dev`）を事前に作成しておく必要がある（Terraform 自身では作れない、鶏と卵の問題）。
3. **コンテナイメージ。** `web_image` / `api_image` / `job_runner_image` は既定でダミー (`gcr.io/cloudrun/hello`)。CI (`.github/workflows/ci.yml`) がビルドして Artifact Registry に push した実イメージのタグに更新する。
4. **`innodb_buffer_pool_size` など、インスタンスサイズに依存する DB フラグ。** `modules/cloud-sql/main.tf` にコメントで記載。実際のメモリ量が決まってから値を確定する。
5. **`[要確認]` 項目。** `docs/11_infrastructure.md` §8 の未確定事項（予算上限、HA 構成の採否、ドメイン名など）は仮値のまま。

## 構成

```
infra/terraform/
├── main.tf                  # ルート: provider / backend 宣言 + モジュール呼び出し
├── variables.tf
├── outputs.tf
├── environments/
│   ├── dev/{terraform.tfvars,backend.hcl}
│   ├── stg/{terraform.tfvars,backend.hcl}
│   └── prod/{terraform.tfvars,backend.hcl}
└── modules/
    ├── vpc/          # VPC + サブネット + Serverless VPC Access + Private Service Access
    ├── cloud-sql/    # Cloud SQL for MySQL 8.0（Private IP）
    ├── storage/      # Cloud Storage バケット（uploads/reports/documents/exports/backups）
    └── cloud-run/    # Cloud Run v2 service（web/api）または job（非同期処理）
```

環境間の差分は `environments/<env>/terraform.tfvars`（リソースサイズ・プロジェクトID等）と `environments/<env>/backend.hcl`（state の保存先）のみで表現する。モジュール本体は環境非依存。

## 使い方（credentials が揃った前提）

```bash
cd infra/terraform

# 環境ごとに state を分離するため、initからやり直す
terraform init -backend-config=environments/dev/backend.hcl -reconfigure

terraform plan  -var-file=environments/dev/terraform.tfvars
terraform apply -var-file=environments/dev/terraform.tfvars
```

`stg` / `prod` も同様に `environments/stg` / `environments/prod` を指定する。

## 手動変更の禁止

`docs/11_infrastructure.md` §3.3 の方針により、Console からの手動変更は禁止。すべての変更は `.tfvars` またはモジュールのコード変更 → PR → apply で行う。
