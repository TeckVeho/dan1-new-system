# 08. API 仕様

作成日: 2026-08-04
バックエンド: Express 5 / TypeScript / Prisma / MySQL 8.0

---

## 1. 共通仕様

### 1.1 基本方針

| 項目 | 仕様 |
|------|------|
| スタイル | REST。リソース指向のURL設計 |
| ベースURL | `https://<domain>/api/v1` |
| バージョニング | URLパスに含める（`/api/v1`）。破壊的変更時に `/api/v2` を追加 |
| 形式 | リクエスト・レスポンスともに JSON（`application/json; charset=utf-8`） |
| 日付 | 日付は `YYYY-MM-DD`、日時は ISO 8601（`2026-08-12T17:00:00+09:00`） |
| ID | `BigInt` を文字列として返す（JavaScript の数値精度対策） |
| 数量 | 食数は整数、重量は文字列（`"217.000"`。小数精度の維持） |
| 金額 | 文字列（`"12345.00"`） |
| 命名 | リクエスト・レスポンスのキーは camelCase。DB のカラムは snake_case で ORM が変換 |
| 認証 | セッション Cookie（HttpOnly / Secure / SameSite=Lax） |
| CSRF | 状態変更メソッド（POST / PUT / PATCH / DELETE）に CSRF トークンを要求 |
| OpenAPI | Zod スキーマから OpenAPI 3.1 を自動生成（NFR-16-4） |

### 1.2 レスポンス形式

**単一リソース**

```json
{
  "data": {
    "id": "12345",
    "name": "..."
  }
}
```

**一覧（ページング付き）**

```json
{
  "data": [ { "id": "1" }, { "id": "2" } ],
  "meta": {
    "page": 1,
    "perPage": 20,
    "totalCount": 361,
    "totalPages": 19
  }
}
```

**エラー**

```json
{
  "error": {
    "code": "DEADLINE_EXCEEDED",
    "message": "締切を過ぎています（2026年8月12日 17:00締切）",
    "details": [
      {
        "field": "orders[3].quantity",
        "code": "DEADLINE_EXCEEDED",
        "message": "8月20日 喫食分は締切を過ぎています",
        "meta": { "serviceDate": "2026-08-20", "deadlineAt": "2026-08-12T17:00:00+09:00" }
      }
    ]
  }
}
```

`message` は日本語でそのまま画面に表示できる文言とする（NFR-18-6）。

### 1.3 HTTP ステータスコード

| コード | 用途 |
|-------|------|
| 200 | 取得・更新の成功 |
| 201 | 作成の成功 |
| 202 | 非同期ジョブの受付（`jobId` を返す） |
| 204 | 削除の成功 |
| 400 | バリデーションエラー |
| 401 | 未認証 |
| 403 | 権限不足・施設スコープ違反 |
| 404 | リソースが存在しない |
| 409 | **楽観ロックの競合**（FR-307）/ 重複登録 |
| 410 | 締切超過など、業務上すでに操作できない状態 |
| 422 | 業務ルール違反（有効期間の重複など） |
| 429 | レート制限 |
| 500 | サーバーエラー |

### 1.4 エラーコード

| コード | ステータス | 意味 |
|-------|-----------|------|
| `VALIDATION_ERROR` | 400 | 入力値の形式不正 |
| `UNAUTHENTICATED` | 401 | 未認証・セッション失効 |
| `MFA_REQUIRED` | 401 | 多要素認証が必要 |
| `FORBIDDEN` | 403 | 権限不足 |
| `SCOPE_VIOLATION` | 403 | 施設・業者スコープ外へのアクセス |
| `NOT_FOUND` | 404 | — |
| `VERSION_CONFLICT` | 409 | 楽観ロックの競合 |
| `DUPLICATE_RESOURCE` | 409 | 一意制約違反 |
| `JOB_ALREADY_RUNNING` | 409 | 同一パラメータのジョブが実行中 |
| `DEADLINE_EXCEEDED` | 410 | 締切超過 |
| `PERIOD_CLOSED` | 410 | 変更可能期間外 |
| `BUSINESS_RULE_VIOLATION` | 422 | 業務ルール違反 |
| `VALID_PERIOD_OVERLAP` | 422 | 有効期間の重複（FR-202） |
| `INVOICE_ALREADY_ISSUED` | 422 | 発行済み請求書の直接更新 |
| `RATE_LIMITED` | 429 | — |
| `INTERNAL_ERROR` | 500 | — |

### 1.5 共通クエリパラメータ

一覧系エンドポイントで共通。

| パラメータ | 型 | 既定 | 説明 |
|-----------|----|------|------|
| `page` | number | 1 | ページ番号 |
| `perPage` | number | 20 | 1ページの件数。最大200 |
| `sort` | string | — | 並び順。`name` 昇順、`-createdAt` 降順 |
| `q` | string | — | キーワード検索 |
| `includeDeleted` | boolean | false | 論理削除済みを含む |
| `asOf` | date | 今日 | **有効期間の基準日**（FR-202）。設定を持つリソースで使用 |

`asOf` は設定の時系列解決に使う。省略時は当日だが、帳票関連の取得では業務基準日を明示的に渡すことを推奨する。これが REQ-16 の再発防止につながる。

### 1.6 楽観ロック（FR-307）

更新系リクエストのボディに `version` を含める。

```json
{ "quantity": 15, "version": 3 }
```

競合時のレスポンス（409）

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "他のユーザーが同じデータを更新しました",
    "details": [{
      "field": "quantity",
      "message": "現在の値: 12 / あなたの入力: 15 / 更新者: 近藤 志保（2026-08-04 10:15）",
      "meta": {
        "currentValue": 12,
        "currentVersion": 4,
        "updatedBy": "近藤 志保",
        "updatedAt": "2026-08-04T10:15:00+09:00"
      }
    }]
  }
}
```

`meta` の情報から画面上で差分を表示し、上書き / 破棄 / マージを選択させる。

### 1.7 非同期ジョブ（FR-002）

時間のかかる処理は 202 を返してジョブ化する。

```
POST /api/v1/imports
→ 202 Accepted
{
  "data": {
    "jobId": "8891",
    "status": "queued",
    "statusUrl": "/api/v1/jobs/8891"
  }
}
```

`GET /api/v1/jobs/8891` で進捗を取得する。

### 1.8 レート制限

| 対象 | 制限 |
|------|------|
| ログイン | 5回 / 15分 / IP+ログインID |
| 一般API | 300回 / 分 / ユーザー |
| 出力・ジョブ登録 | 30回 / 分 / ユーザー |

---

## 2. エンドポイント一覧

### 2.1 認証（`/auth`）

| メソッド | パス | 説明 | 権限 | FR |
|---------|------|------|------|-----|
| POST | `/auth/login` | ログイン。社員番号 / HACCP番号 / 施設ID で認証 | 公開 | FR-101, FR-103 |
| POST | `/auth/mfa/verify` | TOTP 検証 | 公開（一次認証済み） | FR-102 |
| POST | `/auth/logout` | ログアウト | 認証済 | — |
| GET | `/auth/me` | 現在のユーザー・権限・成り代わり状態 | 認証済 | FR-104 |
| POST | `/auth/password/change` | パスワード変更 | 認証済 | FR-101 |
| POST | `/auth/password/reset-request` | リセット要求 | 公開 | FR-101 |
| POST | `/auth/password/reset` | リセット実行 | 公開（トークン） | FR-101 |
| POST | `/auth/impersonate` | 施設への成り代わり開始 | 社内管理者 | FR-105 |
| DELETE | `/auth/impersonate` | 成り代わり終了 | 社内管理者 | FR-105 |

### 2.2 注文（`/orders`）

| メソッド | パス | 説明 | FR |
|---------|------|------|-----|
| GET | `/order-windows` | 締切・変更可能期間の解決結果 | FR-206 |
| GET | `/orders/weekly` | 週間注文の取得（グリッド用） | FR-301 |
| PUT | `/orders/weekly` | 週間注文の一括保存（差分） | FR-301 |
| GET | `/orders` | 注文一覧（明細） | FR-303 |
| GET | `/orders/summary` | 注文集計（ユニット別 / 日別） | FR-303 |
| PATCH | `/orders/:id` | 個別の食数変更 | FR-302 |
| PATCH | `/orders/bulk` | 複数注文の一括変更 | FR-302 |
| GET | `/orders/:id/changes` | 変更履歴 | FR-302 |
| GET | `/rice-orders` | 合数注文の取得 | FR-304 |
| PUT | `/rice-orders` | 合数注文の一括登録 | FR-304 |
| GET | `/allergen-orders` | アレルギー注文の取得 | FR-305 |
| POST | `/allergen-orders` | アレルギー注文の登録 | FR-305 |
| PATCH | `/allergen-orders/:id` | アレルギー注文の変更 | FR-305 |
| GET | `/allergen-orders/options` | カスケード選択肢の取得 | FR-305 |
| GET | `/new-year-orders` | 元旦注文の取得・受付状態 | FR-306 |
| PUT | `/new-year-orders` | 元旦注文の登録 | FR-306 |
| GET | `/special-order-windows` | 受付中の特別注文枠 | FR-901 |
| PUT | `/special-orders` | 特別注文の登録 | FR-901 |
| GET | `/order-alerts` | 未入力施設アラート | FR-801 |
| POST | `/order-alerts/:id/status` | 対応状況の記録 | FR-801 |

### 2.3 資料・帳票（`/documents`, `/reports`）

| メソッド | パス | 説明 | FR |
|---------|------|------|-----|
| GET | `/documents` | 献立資料一覧 | FR-401 |
| GET | `/documents/:id` | 資料詳細（最新版） | FR-401 |
| GET | `/documents/:id/versions` | 版履歴 | FR-402 |
| GET | `/documents/:id/versions/:versionNo` | 特定版の詳細（スナップショット含む） | FR-402 |
| POST | `/documents` | 資料の登録（アップロード後） | FR-401 |
| POST | `/documents/:id/regenerate` | 再生成（新版を追加） | FR-402 |
| POST | `/documents/:id/publish` | 施設への公開 | FR-401 |
| GET | `/setout-instructions` | 盛付指示書一覧 | FR-403 |
| POST | `/setout-instructions` | 盛付指示書の作成 | FR-403 |
| GET | `/reports` | 生成済み帳票一覧 | FR-501 |
| POST | `/reports/generate` | 帳票生成（非同期） | FR-501 |
| GET | `/reports/:id` | 帳票詳細（スナップショット含む） | FR-402 |
| GET | `/reports/:id/download` | ダウンロードURL取得（署名付き） | FR-004 |
| POST | `/shipping/labels/generate` | 配送ラベル生成 | FR-502 |
| POST | `/shipping/qr/preview` | QRプレビュー生成 | FR-503 |
| POST | `/shipping/sagawa/generate` | 佐川伝票生成・API送信 | FR-504 |
| GET | `/shipping/sagawa` | 佐川伝票の発行状況一覧 | FR-504 |
| POST | `/picking/generate` | ピッキング指示書生成 | FR-502 |
| GET | `/picking/results` | ピッキング結果追跡 | FR-502 |

### 2.4 請求（`/invoices`）

| メソッド | パス | 説明 | FR |
|---------|------|------|-----|
| GET | `/invoices` | 請求書一覧 | FR-602 |
| GET | `/invoices/:id` | 請求書詳細（明細含む） | FR-602 |
| POST | `/invoices/close` | 請求締め処理（非同期） | FR-601 |
| POST | `/invoices/preview` | 締め結果のプレビュー | FR-601 |
| POST | `/invoices/:id/issue` | 発行 | FR-601 |
| POST | `/invoices/:id/corrections` | 訂正版の作成・発行 | FR-602 |
| GET | `/invoices/:id/corrections` | 訂正履歴 | FR-602 |
| GET | `/invoices/:id/download` | PDF ダウンロードURL | FR-603 |
| GET | `/sales-prices` | 売価計算表一覧 | FR-604 |
| POST | `/sales-prices/generate` | 売価計算表生成 | FR-604 |

### 2.5 発注・在庫（`/procurement`）

| メソッド | パス | 説明 | FR |
|---------|------|------|-----|
| GET | `/procurement/schedules` | **発注スケジュール（グリッド）** | FR-706 |
| PATCH | `/procurement/schedules/:id` | セルの個別更新 | FR-706 |
| POST | `/procurement/schedules/confirm` | 発注確認済みの一括登録 | FR-706 |
| GET | `/procurement/schedules/:id/basis` | 発注量の計算根拠 | FR-703 |
| POST | `/procurement/schedules/recalculate` | 発注量の再計算（非同期） | FR-703 |
| POST | `/procurement/schedules/export` | Excel 出力（非同期） | FR-706 |
| GET | `/procurement/adjustments` | 食数補正の取得 | FR-705 |
| PUT | `/procurement/adjustments` | 食数補正の一括登録 | FR-705 |
| POST | `/procurement/imports` | データ取込（非同期） | FR-701 |
| GET | `/procurement/imports` | 取込履歴 | FR-701 |
| GET | `/procurement/imports/:id/errors` | 取込エラー一覧 | FR-701 |
| PATCH | `/procurement/imports/errors/:id` | エラー食材の商品紐付け | FR-701 |
| POST | `/procurement/imports/:id/rollback` | 取込の取消 | FR-701 |
| GET | `/procurement/import-status` | 取込状況カレンダー | FR-708 |
| POST | `/procurement/meal-count-sync` | 食数同期（非同期） | FR-702 |
| GET | `/procurement/stock-records` | 棚卸結果一覧 | FR-707 |
| PUT | `/procurement/stock-records` | 棚卸結果の一括登録 | FR-707 |
| POST | `/procurement/rice-logs/generate` | 合数ログ出力（非同期） | FR-709 |

### 2.6 マスタ（`/masters`）

全マスタに共通のCRUDを提供する。`{resource}` は以下のいずれか。

```
customers / units / customer-groups / meal-types / diet-types / menu-kinds /
swallow-categories / allergens / customer-allergens / production-patterns /
deadline-rules / deadline-exceptions / long-holidays / business-calendar /
setout-directions / setout-direction-categories / document-output-rules /
unit-prices / tax-rates / everyday-sellings / new-year-settings /
order-suspensions / mix-rice / mix-rice-packages / raw-plates /
suppliers / stock-items / stock-packages / reference-rules /
customer-reference-rules / qr-layouts / qr-payload-rules / announcements
```

| メソッド | パス | 説明 | FR |
|---------|------|------|-----|
| GET | `/masters/{resource}` | 一覧（検索・絞込・ページング） | FR-201 |
| GET | `/masters/{resource}/:id` | 詳細 | FR-201 |
| POST | `/masters/{resource}` | 作成 | FR-201 |
| PUT | `/masters/{resource}/:id` | 更新 | FR-201 |
| DELETE | `/masters/{resource}/:id` | 論理削除 | FR-201 |
| POST | `/masters/{resource}/:id/restore` | 復元 | FR-201 |
| PATCH | `/masters/{resource}/sort-order` | 表示順の一括更新 | FR-201 |
| POST | `/masters/{resource}/impact` | **変更の影響範囲を試算** | FR-201 |
| POST | `/masters/{resource}/import` | CSVインポート（ドライラン対応） | FR-201 |
| GET | `/masters/{resource}/export` | CSVエクスポート | FR-201 |

**個別の追加エンドポイント**

| メソッド | パス | 説明 | FR |
|---------|------|------|-----|
| GET | `/masters/customers/:id/settings` | 施設の全設定（タブ構成用） | FR-106 |
| PUT | `/masters/customers/:id/settings/:type` | 設定の更新（有効期間付き） | FR-202 |
| GET | `/masters/customers/:id/settings/:type/history` | 設定の変更履歴（有効期間の推移） | FR-202 |
| POST | `/masters/setout-directions/duplicates` | 重複候補の検出 | FR-207 |
| POST | `/masters/setout-directions/archive` | 一括アーカイブ | FR-207 |
| POST | `/masters/reference-rules/preview` | 参照ロジック適用結果のプレビュー | FR-704 |
| GET | `/masters/production-patterns/:id/simulate` | 配送日算出のシミュレーション | FR-505 |

### 2.7 共通基盤（`/jobs`, `/files`, `/notifications`, `/audit-logs`）

| メソッド | パス | 説明 | FR |
|---------|------|------|-----|
| GET | `/jobs` | ジョブ一覧 | FR-002 |
| GET | `/jobs/:id` | ジョブの状態・進捗 | FR-002 |
| POST | `/jobs/:id/cancel` | ジョブのキャンセル | FR-002 |
| POST | `/jobs/:id/retry` | 再実行 | FR-002 |
| POST | `/files/upload-url` | アップロード用署名付きURLの発行 | FR-004 |
| POST | `/files` | アップロード完了の通知（メタ登録） | FR-004 |
| GET | `/files/:id/download-url` | ダウンロード用署名付きURLの発行 | FR-004 |
| GET | `/notifications` | 通知一覧（絞込付き） | FR-003 |
| PATCH | `/notifications/:id/read` | 既読化 | FR-003 |
| POST | `/notifications/read-all` | 一括既読化 | FR-003 |
| GET | `/audit-logs` | 監査ログ検索 | FR-804 |
| GET | `/list-preferences/:screenKey` | 一覧設定の取得 | FR-005 |
| PUT | `/list-preferences/:screenKey` | 一覧設定の保存 | FR-005 |
| GET | `/record-locks` | 編集中インジケータの取得 | FR-307 |
| POST | `/record-locks/heartbeat` | 編集中の継続通知 | FR-307 |

### 2.8 管理（`/admin`）

| メソッド | パス | 説明 | FR |
|---------|------|------|-----|
| GET / POST / PUT | `/admin/users` | 社内ユーザー管理 | FR-104 |
| GET / PUT | `/admin/roles` | ロール・権限設定 | FR-104 |
| GET / PUT | `/admin/settings` | システム設定 | FR-201 |
| GET | `/admin/consistency-checks` | データ整合性検査の結果 | FR-803 |
| POST | `/admin/consistency-checks/run` | 検査の実行 | FR-803 |

---

## 3. 主要エンドポイントの詳細

### 3.1 GET /order-windows

締切と変更可能期間を解決して返す。FR-206。全注文画面が最初に呼ぶ。

**リクエスト**

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|------|------|
| `unitId` | string | — | ユニットID。省略時は施設全体 |
| `customerId` | string | — | 社内ユーザーが指定する場合 |
| `orderType` | string | ○ | `provisional` / `change` / `rice` / `allergen` / `new_year` / `special` |
| `from` | date | ○ | 対象喫食日の範囲 |
| `to` | date | ○ | — |

**レスポンス**

```json
{
  "data": {
    "orderType": "provisional",
    "nextDeadline": {
      "serviceDateFrom": "2026-08-17",
      "serviceDateTo": "2026-08-23",
      "deadlineAt": "2026-08-12T17:00:00+09:00",
      "remainingSeconds": 187200,
      "isException": false,
      "source": "global"
    },
    "windows": [
      {
        "serviceDate": "2026-08-17",
        "deadlineAt": "2026-08-12T17:00:00+09:00",
        "editable": true,
        "isException": false
      },
      {
        "serviceDate": "2027-01-01",
        "deadlineAt": "2026-12-20T10:00:00+09:00",
        "editable": true,
        "isException": true,
        "exceptionReason": "正月前倒し"
      }
    ],
    "changeWindow": {
      "serviceDateFrom": "2026-08-14",
      "serviceDateTo": "2026-08-19",
      "message": "8月14日 〜 8月19日 喫食分が変更可能です"
    }
  }
}
```

`message` は現行画面の表現をそのまま返し、フロントエンドで文言を組み立てない。締切の解決ロジックは `06_master_management_spec.md` §3.1 を参照。

### 3.2 GET /orders/weekly

週間注文入力画面のデータを取得する。FR-301。**行構成をマスタから動的に生成する**（REQ-09）。

**リクエスト**

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|------|------|
| `customerId` | string | — | 社内ユーザーが指定 |
| `weekStart` | date | ○ | 週の開始日（月曜） |
| `unitId` | string | — | 絞込 |

**レスポンス**

```json
{
  "data": {
    "weekStart": "2026-08-17",
    "dates": [
      { "date": "2026-08-17", "weekday": "月", "editable": true, "deadlineAt": "2026-08-12T17:00:00+09:00" },
      { "date": "2026-08-18", "weekday": "火", "editable": true, "deadlineAt": "2026-08-12T17:00:00+09:00" }
    ],
    "rows": [
      {
        "unitId": "501",
        "unitName": "Aユニット",
        "unitSortOrder": 1,
        "mealTypeId": "1",
        "mealTypeName": "朝食",
        "mealTypeSortOrder": 1,
        "menuKindId": "11",
        "menuKindName": "常食",
        "menuKindSortOrder": 1,
        "swallowCategory": null,
        "cells": [
          { "date": "2026-08-17", "orderId": "9001", "quantity": 12, "status": "confirmed", "version": 2 },
          { "date": "2026-08-18", "orderId": null, "quantity": null, "status": null, "version": null }
        ]
      },
      {
        "unitId": "501",
        "unitName": "Aユニット",
        "mealTypeId": "1",
        "menuKindId": "21",
        "menuKindName": "ソフト食",
        "swallowCategory": { "id": "1", "code": "soft", "name": "ソフト食", "sortOrder": 1 },
        "cells": []
      }
    ],
    "draft": {
      "savedAt": "2026-08-04T10:30:00+09:00",
      "cells": [{ "unitId": "501", "date": "2026-08-19", "mealTypeId": "1", "menuKindId": "11", "quantity": 13 }]
    }
  }
}
```

`rows` の並び順は `unitSortOrder` → `mealTypeSortOrder` → `menuKindSortOrder`（嚥下食は `swallowCategory.sortOrder`）で決まる。**フロントエンドは受け取った順序でそのまま描画し、並び順のロジックを持たない**（REQ-07 を全画面で一貫させるため）。

`quantity: null` は未入力、`0` は明示的なゼロを表す。

### 3.3 PUT /orders/weekly

週間注文の差分を保存する。FR-301。

**リクエスト**

```json
{
  "weekStart": "2026-08-17",
  "customerId": "361",
  "commit": true,
  "cells": [
    {
      "unitId": "501",
      "serviceDate": "2026-08-17",
      "mealTypeId": "1",
      "menuKindId": "11",
      "quantity": 13,
      "version": 2
    },
    {
      "unitId": "501",
      "serviceDate": "2026-08-18",
      "mealTypeId": "1",
      "menuKindId": "11",
      "quantity": 12,
      "version": null
    }
  ]
}
```

| フィールド | 説明 |
|-----------|------|
| `commit` | `false` は下書き保存（`status=draft`）、`true` は仮注文として確定（`status=provisional`） |
| `version` | 既存レコードの更新時は必須。`null` は新規作成 |

**処理**

```
BEGIN TRANSACTION
  1. 締切の再検証（クライアントの表示が古い可能性があるため必須）
     - 各セルの serviceDate について order_windows と同じロジックで判定
     - 超過している場合は該当セルを 410 で返す
  2. 楽観ロックの検証
     - version 指定のセルについて現在値と照合
     - 不一致は 409 で該当セルと現在値を返す
  3. UPSERT
     - INSERT ... ON DUPLICATE KEY UPDATE
  4. 監査ログの記録（FR-001）
  5. order_change_logs への記録（確定済みの変更の場合）
COMMIT
```

**レスポンス（成功）**

```json
{
  "data": {
    "saved": 14,
    "cells": [
      { "unitId": "501", "serviceDate": "2026-08-17", "mealTypeId": "1", "menuKindId": "11", "orderId": "9001", "quantity": 13, "version": 3 }
    ],
    "summary": {
      "byDate": [{ "date": "2026-08-17", "total": 18 }],
      "byUnit": [{ "unitId": "501", "total": 126 }]
    }
  }
}
```

**レスポンス（一部が締切超過）**

```json
{
  "error": {
    "code": "DEADLINE_EXCEEDED",
    "message": "一部の喫食日が締切を過ぎています",
    "details": [
      {
        "field": "cells[0]",
        "code": "DEADLINE_EXCEEDED",
        "message": "8月17日 喫食分は 8月12日 17:00 に締め切られました",
        "meta": { "serviceDate": "2026-08-17", "deadlineAt": "2026-08-12T17:00:00+09:00" }
      }
    ]
  }
}
```

締切超過が含まれる場合は**全体をロールバック**し、部分保存しない。締切を跨いだ意図しない保存を防ぐ。

### 3.4 GET /procurement/schedules

発注スケジュールのグリッドデータを取得する。FR-706。**NFR-01-4（P95 3秒）の対象**。

**リクエスト**

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|------|------|
| `supplierId` | string | ○ | 仕入業者。**ロック不要** |
| `deliveryDateFrom` | date | ○ | 納品日範囲。現行同様に必須 |
| `deliveryDateTo` | date | ○ | — |
| `itemQuery` | string | — | **商品名の部分一致（REQ-23）** |
| `categoryId` | string | — | **商品カテゴリ（REQ-23）** |
| `shortageOnly` | boolean | — | 不足のみ |
| `adjustSource` | string | — | `auto` / `manual` |
| `mode` | string | — | `detail`（既定） / `simple` |
| `page` | number | — | 商品行のページ番号 |
| `perPage` | number | — | 既定20 |

**レスポンス**

```json
{
  "data": {
    "supplier": { "id": "7", "name": "エスフーズ" },
    "dates": [
      { "date": "2026-08-03", "label": "8/3 (月) 納品", "weekday": "月" },
      { "date": "2026-08-04", "label": "8/4 (火) 納品", "weekday": "火" }
    ],
    "items": [
      {
        "stockItemId": "1201",
        "name": "豚ミンチ（フ）",
        "unit": "kg",
        "totalOrderQty": "217.000",
        "cells": [
          {
            "id": "88001",
            "deliveryDate": "2026-08-03",
            "preCalcRequiredQty": "31.500",
            "preCalcOrderMeals": 1260,
            "requiredQty": "31.000",
            "orderMeals": 1240,
            "orderQty": "31.000",
            "provisionalStock": "1.060",
            "expectedStock": "94.748",
            "actualStock": null,
            "adjustSource": "auto",
            "isShortage": false,
            "references": [
              { "serviceDate": "2026-08-10", "mealTypeName": "昼", "label": "[8/10 昼]" }
            ],
            "unenteredCustomerCodes": ["10234", "10891"],
            "version": 5
          }
        ]
      }
    ],
    "meta": { "page": 1, "perPage": 20, "totalCount": 119, "totalPages": 6 },
    "calculatedAt": "2026-08-04T06:00:00+09:00",
    "legend": {
      "auto": { "color": "red", "icon": "auto", "label": "自動調整" },
      "manual": { "color": "blue", "icon": "hand", "label": "手動更新" },
      "shortage": { "color": "yellow", "icon": "alert", "label": "不足" }
    }
  }
}
```

`legend` に色だけでなくアイコンとラベルを含める（NFR-19-2）。`calculatedAt` は事前計算の実行時刻で、取込後に再計算が必要かをフロントで判定できる。

`mode=simple` の場合、`preCalc*` と `provisionalStock`、`references` を省略してペイロードを削減する。

### 3.5 PATCH /procurement/schedules/:id

セルの発注数・実在庫を更新する。FR-706, FR-307。**業者ロックを取得せずに更新できる**（REQ-22）。

**リクエスト**

```json
{ "orderQty": "35.000", "actualStock": "2.500", "version": 5 }
```

**処理**

```
1. 権限検証（user_supplier_scopes による担当業者の制限）
2. 楽観ロックの検証（version）
3. orderQty が変更された場合 adjust_source = 'manual' に設定
4. 更新 + version++ + 監査ログ
5. 同一商品の見込み在庫を再計算（後続の納品日に波及）
```

**レスポンス**

```json
{
  "data": {
    "id": "88001",
    "orderQty": "35.000",
    "actualStock": "2.500",
    "adjustSource": "manual",
    "version": 6,
    "affectedCells": [
      { "id": "88002", "deliveryDate": "2026-08-04", "expectedStock": "98.248", "version": 4 }
    ]
  }
}
```

`affectedCells` により、在庫の波及計算の結果を画面に反映できる。

### 3.6 GET /procurement/schedules/:id/basis

発注量の計算根拠を返す。FR-703。現行にない機能で、REQ-21 の参照ロジックの適用結果を検証できる。

**レスポンス**

```json
{
  "data": {
    "scheduleId": "88001",
    "calculatedAt": "2026-08-04T06:00:00+09:00",
    "steps": [
      { "step": 1, "name": "食数の集計", "value": "1260", "unit": "食", "note": "喫食日 8/10 昼の全施設合計" },
      { "step": 2, "name": "参照ロジックによる補完", "value": "+40", "unit": "食",
        "note": "3施設が未登録。うち2施設は過去同一献立（8/3）、1施設は直近実績（7/28）を参照",
        "details": [
          { "customerCode": "10234", "ruleName": "基本パターン", "strategy": "same_menu_past", "sourceServiceDate": "2026-08-03", "value": 15 },
          { "customerCode": "10891", "ruleName": "直近の実績を参照", "strategy": "latest_actual", "sourceServiceDate": "2026-07-28", "value": 12, "fallbackReason": "過去同一献立が参照上限180日を超過" }
        ]
      },
      { "step": 3, "name": "食数補正の適用", "value": "-20", "unit": "食", "note": "施設10234 に -20食 の補正" },
      { "step": 4, "name": "必要量への換算", "value": "31.000", "unit": "kg", "note": "1食あたり0.025kg × 1240食" },
      { "step": 5, "name": "在庫の差引", "value": "-1.060", "unit": "kg", "note": "仮在庫 1.060kg" },
      { "step": 6, "name": "ロット補正", "value": "31.000", "unit": "kg", "note": "ロットサイズ 1.000kg で切り上げ" }
    ],
    "finalOrderQty": "31.000"
  }
}
```

`fallbackReason` により、REQ-21 のフォールバックが期待どおり動作しているかを画面で確認できる。

### 3.7 POST /procurement/imports

らくらく献立ファイルの取込を開始する。FR-701。非同期。

**リクエスト**

```json
{
  "importType": "cooking_sheet",
  "supplierId": "7",
  "fileId": "77001",
  "targetDateFrom": "2026-08-01",
  "targetDateTo": "2026-08-31",
  "skipDuplicateCheck": false
}
```

**レスポンス（202）**

```json
{
  "data": {
    "importId": "5501",
    "jobId": "8891",
    "status": "queued",
    "statusUrl": "/api/v1/jobs/8891"
  }
}
```

**重複検出時（409）**

```json
{
  "error": {
    "code": "DUPLICATE_RESOURCE",
    "message": "同じファイルが 2026-08-03 に取込済みです",
    "details": [{
      "message": "取込ID 5498（実施者: 近藤 志保）",
      "meta": { "existingImportId": "5498", "importedAt": "2026-08-03T14:20:00+09:00" }
    }]
  }
}
```

現行は期間を「1週間程度」に制限していたが、非同期化により1か月分を一度に取込できる（REQ-22, NFR-02-1）。

### 3.8 GET /jobs/:id

ジョブの進捗を取得する。FR-002。

**レスポンス**

```json
{
  "data": {
    "id": "8891",
    "jobType": "import_cooking_sheet",
    "status": "running",
    "progress": 45,
    "progressMessage": "調理表 14/31 日分を処理中",
    "queuedAt": "2026-08-04T10:00:00+09:00",
    "startedAt": "2026-08-04T10:00:05+09:00",
    "finishedAt": null,
    "resultFileId": null,
    "errorMessage": null,
    "requestedBy": { "id": "2", "name": "近藤 志保" }
  }
}
```

完了時は `status: "completed"` と `resultFileId` が設定され、通知が発行される（FR-003）。

### 3.9 PUT /masters/customers/:id/settings/:type

施設の設定を有効期間付きで更新する。FR-202。**REQ-16 の解決の中核**。

**リクエスト**

```json
{
  "value": { "dietTypeId": "3" },
  "validFrom": "2026-09-01",
  "reason": "施設からの依頼により汁無しへ変更"
}
```

**処理**

```
BEGIN TRANSACTION
  1. 既存の有効レコードを SELECT ... FOR UPDATE で取得
  2. 期間の重複を検証（422 VALID_PERIOD_OVERLAP）
  3. 既存レコードの valid_to を validFrom - 1日 に更新
  4. 新しいレコードを INSERT（valid_from = validFrom, valid_to = NULL）
  5. 監査ログの記録
COMMIT
```

**レスポンス**

```json
{
  "data": {
    "settingType": "diet_type",
    "history": [
      { "validFrom": "2026-01-01", "validTo": "2026-08-31", "value": { "dietTypeId": "1", "dietTypeName": "常食" } },
      { "validFrom": "2026-09-01", "validTo": null, "value": { "dietTypeId": "3", "dietTypeName": "汁無し" } }
    ],
    "impact": {
      "futureDocuments": 4,
      "futureOrders": 1204,
      "pastDocumentsAffected": 0
    }
  }
}
```

`pastDocumentsAffected: 0` が REQ-16 の解決を表す。過去の資料は生成時のスナップショットを参照するため影響を受けない。

### 3.10 POST /masters/{resource}/impact

マスタ変更の影響範囲を保存前に試算する。FR-201。

**リクエスト（締切ルールの変更を試算）**

```json
{
  "operation": "update",
  "id": "12",
  "payload": { "deadlineTime": "16:00:00" }
}
```

**レスポンス**

```json
{
  "data": {
    "affectedCustomers": 361,
    "affectedOrders": 5820,
    "warnings": [
      {
        "code": "DEADLINE_BECOMES_PAST",
        "message": "この変更により 2026-08-05 喫食分 12件 の締切が現在時刻より前になります",
        "count": 12
      }
    ],
    "canProceed": true,
    "requiresConfirmation": true
  }
}
```

### 3.11 POST /masters/reference-rules/preview

参照ロジックの適用結果を試算する。FR-704。REQ-21 の設定確認用。

**リクエスト**

```json
{ "serviceDate": "2026-08-20", "mealTypeId": "2", "customerIds": ["10234", "10891"] }
```

**レスポンス**

```json
{
  "data": {
    "serviceDate": "2026-08-20",
    "results": [
      {
        "customerCode": "10234",
        "ruleName": "基本パターン",
        "strategy": "same_menu_past",
        "sourceServiceDate": "2026-02-15",
        "sourceAgeDays": 186,
        "fallbackApplied": true,
        "fallbackRuleName": "直近の実績を参照",
        "finalSourceServiceDate": "2026-08-13",
        "finalValue": 12,
        "note": "過去同一献立が参照上限180日を超過したため直近実績にフォールバック"
      }
    ]
  }
}
```

REQ-21 の「1年に1回しか入っていない献立は直近を参照」が設定どおり動作するかを、発注量計算の実行前に確認できる。

### 3.12 POST /invoices/:id/corrections

請求書の訂正版を作成・発行する。FR-602。REQ-03 に対応。

**リクエスト**

```json
{
  "reason": "8月20日分の食数誤りを訂正",
  "lines": [
    { "operation": "remove", "invoiceLineId": "33012" },
    { "operation": "add", "unitId": "501", "serviceDate": "2026-08-20", "menuKindId": "11", "quantity": 10, "unitPrice": "520.00" },
    { "operation": "update", "invoiceLineId": "33015", "quantity": 8 }
  ],
  "notifyCustomer": true
}
```

**処理**

```
BEGIN TRANSACTION
  1. 元の請求書が issued であることを検証（draft は直接編集させる）
  2. 元の請求書を status = corrected に更新
  3. 新しい請求書を作成（version_no + 1, original_invoice_id = 元のID）
  4. 明細をコピーし、operation を適用
     - remove → line_type = correction_remove として保持（物理削除しない）
     - add    → line_type = correction_add
  5. 金額を再計算
  6. invoice_corrections に訂正履歴を記録
  7. PDF 生成ジョブをエンキュー
  8. 施設へ通知（notifyCustomer が true の場合）
COMMIT
```

**レスポンス（201）**

```json
{
  "data": {
    "id": "44012",
    "invoiceNo": "INV-2026-08-0361-2",
    "versionNo": 2,
    "originalInvoiceId": "44001",
    "status": "issued",
    "subtotal": "512000.00",
    "taxAmount": "40960.00",
    "total": "552960.00",
    "diff": { "subtotalDelta": "-5200.00", "totalDelta": "-5616.00" },
    "pdfJobId": "8905"
  }
}
```

### 3.13 GET /order-alerts

未入力施設アラートを取得する。FR-801。REQ-20 に対応。

**リクエスト**

| パラメータ | 型 | 説明 |
|-----------|----|------|
| `serviceDateFrom` | date | 対象喫食日 |
| `serviceDateTo` | date | — |
| `alertStatus` | string | `unhandled` / `contacted` / `not_required` |

**レスポンス**

```json
{
  "data": [
    {
      "customerId": "361",
      "customerCode": "10234",
      "customerName": "○○苑",
      "serviceDate": "2026-08-20",
      "deadlineAt": "2026-08-12T17:00:00+09:00",
      "remainingSeconds": 187200,
      "missingTypes": ["meal_count", "rice"],
      "previousOrderSummary": { "lastServiceDate": "2026-08-13", "totalQuantity": 126 },
      "alertStatus": "unhandled"
    }
  ],
  "meta": { "totalCount": 8 },
  "excluded": {
    "contractEnded": 12,
    "orderSuspended": 3,
    "longHoliday": 5,
    "weekdayNotApplicable": 47
  }
}
```

`excluded` は判定で除外した施設の内訳を返す。現行は終了施設が一覧に混在していたが（REQ-20）、除外内訳を明示することで「なぜ表示されないか」も確認できる。

---

## 4. 実装上の共通処理

### 4.1 ミドルウェア構成

```
Express アプリケーション
  ├── requestId          リクエストIDの付与（Cloud Logging と紐付け）
  ├── helmet             セキュリティヘッダー（NFR-11-8）
  ├── cors               同一ドメイン運用のため最小設定
  ├── rateLimit          レート制限（NFR-11-9）
  ├── bodyParser         JSON パース（サイズ上限あり）
  ├── session            セッション読み込み
  ├── csrf               状態変更メソッドの CSRF 検証
  ├── authenticate       認証必須ルートの検証
  ├── authorize          権限検証（NFR-10-6）
  ├── scopeGuard         施設・業者スコープの強制（NFR-10-7）
  ├── auditContext       監査ログ用のコンテキスト設定
  ├── [routes]
  ├── errorHandler       エラー形式の統一
  └── notFoundHandler
```

### 4.2 スコープ強制（NFR-10-7）

施設ユーザーのリクエストは、クエリ条件に必ず自施設の条件を注入する。URL に他施設の ID が指定されても 403 を返す。

```typescript
// リポジトリ層で強制する例
function customerScope(ctx: RequestContext) {
  if (ctx.userType === 'facility') {
    return { customerId: ctx.customerId };
  }
  if (ctx.impersonatingCustomerId) {
    return { customerId: ctx.impersonatingCustomerId };
  }
  return {};
}
```

コントローラ層の実装漏れを防ぐため、リポジトリ層で強制する設計とする。

### 4.3 バリデーション

`packages/shared` に Zod スキーマを置き、フロント・バックで同一のスキーマを使う（NFR-11-4, NFR-16-1）。

```typescript
// packages/shared/src/schemas/order.ts
export const weeklyOrderCellSchema = z.object({
  unitId: z.string(),
  serviceDate: z.string().date(),
  mealTypeId: z.string(),
  menuKindId: z.string(),
  quantity: z.number().int().min(0).max(9999),
  version: z.number().int().nullable(),
});

export const putWeeklyOrdersSchema = z.object({
  weekStart: z.string().date(),
  customerId: z.string().optional(),
  commit: z.boolean(),
  cells: z.array(weeklyOrderCellSchema).min(1).max(2000),
});
```

OpenAPI 3.1 は `zod-to-openapi` で生成する。

### 4.4 監査ログの自動記録

Prisma のミドルウェア（`$extends`）で更新系操作を捕捉し、`audit_logs` に記録する（FR-001）。成り代わり中は `impersonated_customer_id` を併記する（FR-105）。

### 4.5 有効期間の解決ヘルパー

```typescript
// packages/shared/src/settings/resolve.ts
export async function resolveSetting<T>(
  params: { customerId: bigint; settingType: string; asOf: Date }
): Promise<T | null>;
```

`asOf` に**業務基準日**（喫食日・納品日・請求対象日）を渡す。`new Date()` を既定値にしない。これが REQ-16 の再発防止策として重要であり、コードレビューの確認項目とする。

---

## 5. 関連ドキュメント

| 参照先 | 内容 |
|--------|------|
| `05_data_model.md` | 各エンドポイントが操作するテーブル |
| `06_master_management_spec.md` | 締切解決・参照ロジックのビジネスルール |
| `07_screen_spec.md` | 各エンドポイントを呼ぶ画面 |
| `10_auth_roles.md` | 権限・スコープの定義 |
