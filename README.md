# dan1 新システム

株式會社 談 の基幹システム（受注・献立・帳票）と発注・在庫確認システムを統合した新システム。

## 実装状況（Phase 0〜4）

| Phase | 状態 | 内容 |
|-------|------|------|
| 0 | 実装済 | モノレポ、Prisma、Express、Next.js、UI基盤、CI、Terraform骨格 |
| 1 | 実装済 | 認証・権限・マスタCRUD・監査ログ・ジョブ基盤 |
| 2 | 実装済 | 週間注文・締切・履歴・未入力アラート・成り代わり |
| 3 | 実装済 | 献立資料・版管理・定型文・盛付指示書 |
| 4 | 実装済 | 発注スケジュール・取込・参照ロジック・棚卸 |

## 開発環境の起動

```bash
# 依存関係
npm install
cp .env.example .env

# MySQL（Docker）
docker-compose up -d

# DBマイグレーション & シード
npm run db:migrate
npm run db:seed

# 開発サーバー（API:4000 / Web:3000）
npm run dev
```

### テスト用アカウント（シード後）

| 種別 | ID | パスワード |
|------|-----|-----------|
| 社内管理者 | 91001 | 91001 |
| 施設ユーザー | 99999 | 99999 |

## リポジトリ構成

```
apps/web/          Next.js フロントエンド
apps/api/          Express REST API
packages/database/ Prisma スキーマ・マイグレーション
packages/shared/   共有型・Zodスキーマ
packages/ui/       共通UIコンポーネント
jobs/runner/       非同期ジョブランナー
infra/terraform/   GCP IaC
docs/              要件定義書
```

## 前提

| 項目 | 決定内容 |
|------|---------|
| スコープ | 基幹システム + 発注・在庫確認システムの**統合リプレース** |
| フロントエンド | Next.js（App Router / TypeScript） |
| バックエンド | Express（TypeScript） |
| データベース | MySQL 8.0（**新規構築**。既存スキーマは踏襲しない） |
| ORM | Prisma |
| インフラ | Google Cloud Platform |
| 成果物粒度 | 開発着手可能な詳細仕様 |
| UIデザイン | **misaki-reports 準拠**（`15_ui_design_spec.md`） |
| 未確定事項 | 仮置きし `[要確認]` タグを付与、`14_open_questions.md` に集約 |

## ドキュメント

| ファイル | 内容 |
|---------|------|
| [00_background_scope.md](docs/00_background_scope.md) | 背景・目的・統合方針・技術スタック決定 |
| [01_as_is_issues.md](docs/01_as_is_issues.md) | 現行課題一覧（REQ-01〜24）と根拠 |
| [02_business_flow.md](docs/02_business_flow.md) | As-Is / To-Be 業務フロー |
| [03_functional_requirements.md](docs/03_functional_requirements.md) | 機能要件（FR-xxx）とトレーサビリティ |
| [04_non_functional_requirements.md](docs/04_non_functional_requirements.md) | 非機能要件 |
| [05_data_model.md](docs/05_data_model.md) | MySQL データモデル設計案 |
| [06_master_management_spec.md](docs/06_master_management_spec.md) | マスタ管理仕様（設定駆動） |
| [07_screen_spec.md](docs/07_screen_spec.md) | 画面仕様（機能・遷移）。UI見た目は 15 を参照 |
| [08_api_spec.md](docs/08_api_spec.md) | API 仕様 |
| [09_integration_spec.md](docs/09_integration_spec.md) | 外部連携仕様 |
| [10_auth_roles.md](docs/10_auth_roles.md) | 認証・権限・排他制御 |
| [11_infrastructure.md](docs/11_infrastructure.md) | GCP インフラ構成 |
| [12_migration_plan.md](docs/12_migration_plan.md) | 移行計画 |
| [13_phase_plan.md](docs/13_phase_plan.md) | フェーズ別実装計画 |
| [14_open_questions.md](docs/14_open_questions.md) | 未決事項・確認事項 |
| [15_ui_design_spec.md](docs/15_ui_design_spec.md) | UIデザイン仕様（**misaki-reports 準拠**） |

### 付属資料

| ファイル | 内容 |
|---------|------|
| [proposal_client_presentation.md](docs/proposal_client_presentation.md) | クライアント提示用プレゼン資料 |

## 規模

| 項目 | 件数 |
|------|------|
| クライアント要望 | 24件（REQ-01〜24） |
| 調査で発見した課題 | 12件（A-01〜12） |
| 機能要件 | 58件（うち必須52件） |
| 非機能要件 | 21分類 |
| テーブル | 約86 |
| 画面 | 102（うち新規28） |
| 実装フェーズ | 9（Phase 0〜8） |
| 未確定事項 | 56件（うち最優先4件） |

## 次のステップ

1. `14_open_questions.md` の**優先度S（4件）** を確認する。特に既存システムのソースコードとDBスキーマの提供
2. 業務担当者との打ち合わせで優先度A（28件）の業務ルールを確定させる
3. 確定後に工数見積とスケジュールを作成する（`13_phase_plan.md` §13）

## 根拠となる現行調査

現行システムの調査結果は別リポジトリ `../dan1-system-survey/` を参照。Playwright による実画面クロール（2026-08-04 実施）に基づく。

| 調査ドキュメント | 内容 |
|-----------------|------|
| `01_screen_inventory_core.md` | 基幹システム画面一覧 |
| `02_screen_inventory_inventory.md` | 発注・在庫システム画面一覧 |
| `03_requirement_mapping.md` | 改善要望 ↔ 現行機能 対応表 |
| `04_findings_notes.md` | 調査所見 |
| `05_order_ui_facility_99999.md` | 施設ユーザー注文UI詳細 |
| `06_haccp_login_survey.md` | ログイン・権限調査 |
| `07_schedule_grid_survey.md` | 発注スケジュールグリッド詳細 |

## 設計の中核となる7つの原則

1. **設定駆動マスタ** — 締切・製造パターン・食種・嚥下食区分・資料出力ルールをすべて画面から設定可能にし、開発者依頼をゼロにする
2. **時系列を持つ設定と帳票のスナップショット** — 設定変更が過去の帳票に遡及しない
3. **レコード単位の排他制御** — 業者単位ロックを廃止し同時作業を可能にする
4. **重い処理の非同期ジョブ化** — 帳票出力・取込を即時受付＋進捗表示に
5. **統合ドメイン・単一認証** — IP直打ちと2システム間リダイレクトの解消
6. **帳票・QRのシステム内生成** — 佐川伝票の完全自動化、QR分割単位の設定化
7. **FAX業務のシステム取り込み** — おせち容器注文・試食会対応

## ドキュメント表記ルール

| 記法 | 意味 |
|------|------|
| `[要確認]` | クライアント確認またはデータ調査が必要な仮置き値 |
| `[設計案]` | 現行に存在せず新規に設計した内容 |
| `[現行踏襲]` | 現行システムの挙動を意図的に維持する内容 |
| REQ-xx | クライアントからの改善要望ID |
| FR-xxx | 機能要件ID |
| NFR-xx | 非機能要件ID |
| SC-xxx | 画面ID |
