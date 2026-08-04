# 02. As-Is / To-Be 業務フロー

作成日: 2026-08-04

現行の業務フローを画面遷移とデータの流れから再構成し、新システムでのあるべき姿を定義する。現行フローで観測できていない部分は `[要確認]` を付す。

---

## 1. 全体像

### 1.1 As-Is（現行）

```mermaid
flowchart TB
    subgraph 施設["施設（361件）"]
        F1[仮注文入力<br/>週間] --> F2[仮注文後の食数変更]
        F3[混ぜご飯の合数指定]
        F4[アレルギー注文]
    end

    subgraph 基幹["基幹システム order.dan1.jp"]
        C1[(注文データ<br/>食数・合数)]
        C2[未発注施設アラート<br/>週次]
        C3[食数集計表出力]
        C4[献立資料登録・配布]
        C5[盛付指示書作成]
        C6[佐川伝票ファイル出力]
        C7[請求データ生成]
    end

    subgraph 外部["外部"]
        R1[らくらく献立<br/>献立作成ソフト]
        FAX[FAX<br/>おせち容器注文]
        SG[佐川急便]
    end

    subgraph 在庫["発注・在庫システム 35.75.152.221"]
        I0[業者ロック取得]
        I1[らくらく献立ファイル取込]
        I2[調理表取込]
        I3[最新食数取込]
        I4[発注スケジュール<br/>発注量計算]
        I5[食数補正]
        I6[棚卸入力]
    end

    F1 --> C1
    F2 --> C1
    F3 --> C1
    F4 --> C1
    C1 --> C2
    C1 --> C3
    R1 -->|Excel 手動DL| I1
    R1 -->|Excel 手動DL| I2
    C1 -->|手動実行<br/>1週間単位| I3
    I0 --> I4
    I1 --> I4
    I2 --> I4
    I3 --> I4
    I5 --> I4
    I6 --> I4
    I4 -->|発注| SUP[仕入業者 23社]
    C3 --> C5
    C4 --> 施設
    C5 --> 製造[製造工程]
    C6 -->|手動取込| SG
    FAX -->|手作業転記| C1
    C7 --> 請求[請求]
```

### 1.2 To-Be（新システム）

```mermaid
flowchart TB
    subgraph 施設["施設ポータル"]
        NF1[週間注文入力<br/>締切カウントダウン付]
        NF2[注文変更]
        NF3[合数・アレルギー・特別注文]
        NF4[資料・請求書閲覧]
    end

    subgraph 新システム["統合システム（単一ドメイン・HTTPS）"]
        direction TB
        M[(設定マスタ<br/>有効期間付き)]
        O[(注文データ<br/>楽観ロック・監査ログ)]
        J[非同期ジョブキュー]
        S[(帳票スナップショット<br/>版管理)]

        A1[注文義務判定<br/>→未入力アラート]
        A2[発注量計算<br/>事前計算・キャッシュ]
        A3[帳票生成<br/>製造・配送・請求]
    end

    subgraph 外部["外部連携"]
        R1[らくらく献立]
        SG[佐川急便 API]
        PR[ラベルプリンタ<br/>QR生成]
    end

    NF1 --> O
    NF2 --> O
    NF3 --> O
    M --> O
    M --> A1
    M --> A2
    M --> A3
    O --> A1
    O --> A2
    R1 -->|Excel取込<br/>非同期| J
    J --> A2
    A2 --> SUP[仕入業者]
    A3 --> J
    J --> S
    S --> NF4
    S --> 製造[製造工程]
    S --> PR
    A3 -->|API| SG
    棚卸[棚卸入力<br/>タブレット] --> A2
```

**主要な変更点**

| 観点 | As-Is | To-Be |
|------|-------|-------|
| システム境界 | 2システム（別ドメイン・別UI） | 1システム（単一ドメイン） |
| 業者ロック | ログイン後に必須取得 | 廃止。レコード単位の楽観ロック |
| データ取込 | 手動・同期・1週間制限 | 非同期ジョブ・期間制限なし |
| 発注量計算 | 画面表示時に都度計算 | 取込完了時に事前計算・キャッシュ |
| 帳票 | 参照時に現在の設定で描画 | 生成時点のスナップショットを保存 |
| 締切 | コード内固定（17:00）＋担当者依頼 | マスタ設定＋例外日設定 |
| おせち容器注文 | FAX → 手作業転記 | 施設ポータルの特別注文枠 |
| 佐川伝票 | ファイル出力 → 手動取込 | API 連携 |

---

## 2. 受注業務フロー

### 2.1 As-Is: 仮注文から確定まで

```mermaid
sequenceDiagram
    participant F as 施設ユーザー
    participant S as 基幹システム
    participant A as 社内担当者

    Note over F,S: 締切: 17:00固定（画面表示なし）
    F->>S: /order/ 仮注文・週間入力
    Note right of S: 現在500エラーで使用不可
    S-->>F: 登録完了

    Note over F,S: 変更可能期間: 喫食日ベース
    F->>S: /order-change-list/ 食数変更
    S-->>F: 「8/14〜8/19 喫食分が変更可能です」

    F->>S: /order-rice/ 合数指定（初期4行・最大1000行）
    F->>S: /order-allergen/ アレルギー注文（初期7行・カスケード選択）

    Note over A,S: 週次
    S->>A: 未発注施設アラート（終了施設も混在）
    A->>F: 電話・チャットで催促

    Note over A,S: 正月・長期休暇時
    A->>S: 加藤氏に依頼して締切を前倒し
```

**確認された制約**

| 制約 | 内容 | 根拠 |
|------|------|------|
| 締切時刻が非表示 | 元旦注文（10時）以外は締切時刻が画面に出ない | REQ-13 |
| 変更可能期間の表示 | 「8月14日 〜 8月19日 喫食分が変更可能です」は実装済み | `05_order_ui_facility_99999.md` §3.1 |
| 週間入力画面が停止 | `/order/` が HTTP 500 | REQ-04 |
| 締切前倒しが手作業 | 社内担当者への依頼が必要 | REQ-13 |
| アラートの精度不足 | 終了施設が残り続ける | REQ-20 |

### 2.2 To-Be: 受注フロー

```mermaid
sequenceDiagram
    participant F as 施設ユーザー
    participant W as 施設ポータル
    participant API as API
    participant DB as MySQL
    participant SCH as Cloud Scheduler
    participant A as 社内担当者

    Note over W: 締切ルールをマスタから取得
    F->>W: 週間注文入力画面
    W->>API: GET /api/v1/order-windows?unit_id=...
    API->>DB: 締切ルール + 例外日を有効期間で解決
    API-->>W: 締切日時・残り時間・編集可否
    W-->>F: 「次回締切: 8/12(火) 17:00まで（残り 2日 4時間）」

    F->>W: 週間グリッドに食数入力（マスタ由来の動的列）
    W->>API: PUT /api/v1/orders/weekly（楽観ロック version付）
    API->>DB: トランザクション内で締切再検証 + UPSERT + 監査ログ
    API-->>W: 保存結果（差分ハイライト）

    Note over SCH,A: 締切1時間前
    SCH->>API: 未入力施設判定バッチ
    API->>DB: 注文義務のある施設のみ抽出<br/>（契約期間・注文停止・長期休暇を除外）
    API->>F: 未入力施設へ自動リマインド通知
    API->>A: 社内ダッシュボードにアラート表示

    Note over A,API: 締切変更が必要な場合
    A->>API: 締切例外日を登録（マスタ画面）
    API->>DB: deadline_exceptions に登録
    Note right of DB: 開発者依頼不要
```

**新フローで解決される課題**

| REQ | 解決方法 |
|-----|---------|
| REQ-04 | 週間グリッドUIを新規設計。列構成をマスタから動的生成 |
| REQ-09 | 嚥下食追加時、マスタに区分を追加すれば注文画面の列が自動で増える |
| REQ-13 | 締切ルール・例外日をマスタ化。全画面に締切カウントダウンを表示 |
| REQ-20 | 未入力判定を「注文義務のある施設」に限定。契約終了・注文停止・長期休暇を除外 |

---

## 3. 発注・在庫業務フロー

### 3.1 As-Is: 発注量計算まで

```mermaid
sequenceDiagram
    participant U as 栄養士/事務
    participant R as らくらく献立
    participant I as 在庫システム
    participant C as 基幹システム

    U->>I: ログイン（社員番号=パスワード）
    I-->>U: /lock-supplier へ強制リダイレクト
    U->>I: 業者を1つ選択してロック
    Note right of I: 他ユーザーがロック中の業者は編集不可<br/>一般社員は解除できない

    U->>R: 納品日別発注書・食数月報・調理表を出力
    Note right of R: 3ファイルは同一タイミング出力が必須
    U->>I: /order-file/import 発注書アップロード
    U->>I: /cooking-file/import 調理表アップロード（1か月分）
    I-->>U: エラー食材一覧（商品マスタ未紐付け 10件）

    U->>I: /orders_counts 最新食数取込
    I->>C: 喫食日を指定して食数を取得
    Note right of I: 「1週間程度を目安」<br/>長期間指定でエラーの可能性

    U->>I: /import-status 取込状況を確認
    U->>I: /schedule 納品日範囲を指定して検索
    Note right of I: 未指定時はグリッド非表示<br/>寿屋・ショクカイの1週間分は極端に遅い
    I-->>U: 商品×納品日マトリクス<br/>（1セル7行以上、色分け: 赤=自動調整/青=手動/黄=不足）

    U->>I: /orders/adjust 食数補正（朝/昼/夕単位で±食数）
    U->>I: 実在庫を入力して「更新」
    I-->>U: 発注数・実在庫数を一括登録
```

**確認された制約**

| 制約 | 内容 | 根拠 |
|------|------|------|
| 業者ロック必須 | 未選択時は `/lock-supplier` へリダイレクト | `02_screen_inventory_inventory.md` 制約1 |
| 3ファイル同時出力 | 発注書・食数月報・調理表は同一タイミング出力が前提 | 同 §3 |
| 食数取込の期間制限 | 1週間程度を推奨（画面注意書き） | 同 制約2 |
| 納品日必須 | `/schedule` は納品日範囲未指定でグリッド非表示 | `07_schedule_grid_survey.md` §1 |
| 商品絞込なし | 特定材料のみの出力ができない | REQ-23 |

### 3.2 To-Be: 発注・在庫フロー

```mermaid
sequenceDiagram
    participant U as 栄養士/事務
    participant W as 社内ポータル
    participant API as API
    participant Q as Cloud Tasks
    participant JOB as Cloud Run Jobs
    participant DB as MySQL
    participant GCS as Cloud Storage

    Note over U,W: 業者ロック不要。全業者を横断で閲覧可能
    U->>W: ログイン（MFA）
    W-->>U: ダッシュボード（取込状況・不足アラート・自分の作業中レコード）

    U->>W: らくらく献立ファイルをまとめてアップロード
    W->>GCS: 署名付きURLで直接アップロード
    W->>API: POST /api/v1/imports
    API->>Q: 取込ジョブをエンキュー
    API-->>W: 202 Accepted（job_id）
    W-->>U: 進捗バー表示（ポーリング）

    Q->>JOB: 取込ジョブ実行
    JOB->>DB: 発注書・食数月報・調理表を取込
    JOB->>DB: 最新食数を基幹データから同期（期間制限なし）
    JOB->>DB: 発注量を事前計算してキャッシュ
    JOB->>DB: エラー食材を記録
    JOB-->>W: 完了通知（WebSocket or ポーリング）

    U->>W: 発注スケジュール（業者・納品日範囲・商品絞込）
    W->>API: GET /api/v1/order-schedules?supplier_id&from&to&item_q&page
    API->>DB: 事前計算済みデータをサーバーサイドページングで取得
    API-->>W: グリッドデータ（1ページ分）
    Note right of API: 目標 P95 3秒以内（NFR-01）

    U->>W: セルの発注数を手動修正
    W->>API: PATCH /api/v1/order-schedules/{id}（version付き）
    API->>DB: 楽観ロック検証 → 更新 → 監査ログ
    Note right of DB: 同一業者を複数人が同時編集可能<br/>競合時は409 + 差分表示

    U->>W: 全件Excel出力
    W->>API: POST /api/v1/exports
    API->>Q: 出力ジョブをエンキュー
    JOB->>GCS: Excel生成
    JOB-->>U: ダウンロードリンク通知
```

**新フローで解決される課題**

| REQ | 解決方法 |
|-----|---------|
| REQ-21 | 参照ロジックに「直近の合数を参照」を追加。フォールバック順序も設定可能 |
| REQ-22 | 業者ロック廃止 + 楽観ロック、サーバーサイドページング、発注量の事前計算 |
| REQ-23 | 商品名・カテゴリでの絞込、絞込条件の保存（ビュー）、大量出力の非同期化 |
| A-06 | エラー食材を取込時に検出し、商品マスタへの紐付けを画面から実施 |
| A-07 | 3ファイルを個別に取込可能にし、揃った時点で計算を実行 |

---

## 4. 献立資料・帳票フロー

### 4.1 As-Is: 資料生成と配布

```mermaid
flowchart LR
    R[らくらく献立] -->|Excel| U1[CP: 献立資料登録<br/>/documents-upload/]
    U1 --> D[(献立資料)]
    D --> V1[CP: 献立資料一覧<br/>/document-files]
    D --> V2[CP: 施設確認用<br/>/documents-check/]
    D --> V3[施設: 献立資料一覧<br/>/cooking-documents/]

    M[施設マスタ<br/>食種設定] -.->|参照時に結合| V1
    M -.->|参照時に結合| V2
    M -.->|参照時に結合| V3

    style M fill:#fdd
```

**問題の構造。** 施設マスタの食種設定が、資料の**参照時**に結合されていると推定される。そのため食種を「汁無し」に変更すると、過去に生成した資料の表示内容まで汁無しに変わる（REQ-16）。CP 側の献立資料管理に薄味が混入する事象（REQ-17）も同根と考えられる。

### 4.2 To-Be: 資料の版管理

```mermaid
flowchart LR
    R[らくらく献立] -->|Excel| IMP[取込ジョブ]
    IMP --> GEN[資料生成ジョブ]

    M[(設定マスタ<br/>valid_from / valid_to)] -->|生成時点の値を解決| GEN
    GEN --> SNAP[(資料スナップショット<br/>generated_at<br/>settings_snapshot JSON<br/>gcs_path<br/>version)]

    SNAP --> V1[社内: 資料一覧]
    SNAP --> V2[施設: 資料一覧]
    SNAP --> V3[帳票再出力]

    style SNAP fill:#dfd
```

**設計方針**

| 方針 | 内容 |
|------|------|
| 設定に有効期間を持たせる | 施設の食種・献立種類・アレルギー設定に `valid_from` / `valid_to` を持たせ、「いつ時点の設定か」を解決できるようにする |
| 生成時点の設定を保存 | 資料・帳票の生成時に、適用した設定内容を `settings_snapshot`（JSON）として保存する |
| 参照時に再計算しない | 一度生成した資料は GCS 上のファイルとスナップショットのみを参照し、現在のマスタを結合しない |
| 再生成は明示操作 | 過去分を作り直す場合は「再生成」を明示的に実行し、新しいバージョンとして追加する（旧版は保持） |
| 食種変更は将来分のみ影響 | 食種を変更しても、変更日以降の喫食日を対象とする資料にのみ反映される |

### 4.3 To-Be: 配送帳票と QR

```mermaid
flowchart TB
    O[(確定注文)] --> CALC[配送単位の集約<br/>製造パターン D0-D3<br/>集荷日・着日を算出]
    M[(製造パターンマスタ<br/>顧客別割当)] --> CALC

    CALC --> SG[佐川伝票データ生成]
    SG -->|API| SGAPI[佐川急便<br/>e飛伝/Webサービス]
    SG -->|フォールバック| CSV[CSV出力]

    CALC --> LBL[ラベル・シールデータ生成]
    QRM[(QRレイアウトマスタ<br/>9分割の面割当<br/>分割キー設定)] --> LBL
    LBL --> QR[QRコード生成<br/>味噌汁本体と具材を別レコード]
    QR --> PDF[PDF/CSV出力<br/>ラベルプリンタ]

    style QRM fill:#dfd
```

**QR の分割単位。** 現行は味噌汁と味噌汁具が同一 QR になっている（REQ-15）。新システムでは QR に載せる情報の分割キーをマスタで設定し、料理の構成要素（本体・具材）を別レコードとして扱う。9分割は1シートに9面のラベルを配置する印刷レイアウトを指し、面ごとにどのレコードを割り当てるかもマスタで設定する。`[要確認]` 現行の QR ペイロード仕様とラベルプリンタの機種。

---

## 5. 請求業務フロー

### 5.1 As-Is

```mermaid
flowchart LR
    O[(注文データ)] --> INV[CP: 請求データ一覧<br/>/invoice-files]
    UP[CP: 請求書一括登録<br/>/invoice-upload/] --> INV
    P[マスタ: 単価情報<br/>/master/new-price-list/] --> INV
    T[マスタ: 税率<br/>/master/tax] --> INV
    D[マスタ: 出荷・お届け・売上日設定<br/>/master/delivery_days-settings] --> INV
    INV --> F[施設: 請求書一覧<br/>リンク未設定 href=#]

    style F fill:#fdd
```

施設側の「請求書一覧」メニューは `href="#"` でリンクが設定されておらず、施設が請求書を閲覧できる状態か確認できなかった。社内から施設ごとの請求書発行状況を確認する手段も不明（REQ-03）。

### 5.2 To-Be

```mermaid
sequenceDiagram
    participant A as 社内担当者
    participant W as 社内ポータル
    participant API as API
    participant DB as MySQL
    participant F as 施設ユーザー

    A->>W: 請求締め処理（対象月・対象施設）
    W->>API: POST /api/v1/invoices/close
    API->>DB: 単価・税率を有効期間で解決 → 請求明細生成
    API->>DB: invoices（status=draft）+ 設定スナップショット
    API-->>W: プレビュー（施設別・合計）

    A->>W: 内容確認 → 発行
    W->>API: POST /api/v1/invoices/{id}/issue
    API->>DB: status=issued, issued_at 記録
    API->>F: 施設ポータルに公開

    Note over A,W: 発行後の訂正（REQ-03）
    A->>W: 施設ビュー切替（成り代わり）
    W->>API: GET /api/v1/invoices?customer_id=...&as_customer=true
    API-->>A: 施設が見ている請求書を表示

    A->>W: 明細の追加・削除・修正
    W->>API: POST /api/v1/invoices/{id}/corrections
    API->>DB: 訂正レコードを追加（元の請求書は保持）
    API->>DB: status=corrected, 訂正版を新バージョンとして発行
    API->>F: 訂正通知
```

**設計方針**

| 方針 | 内容 |
|------|------|
| 発行済み請求書は不変 | 訂正は元データを書き換えず、訂正レコード＋新バージョンとして記録する |
| 成り代わり閲覧 | 社内担当者が施設ユーザーの画面を代理で確認できる。操作は監査ログに「代理操作」として記録 |
| 訂正履歴の可視化 | 施設側でも訂正前後の差分を確認できる |

---

## 6. 新規業務フロー

### 6.1 おせち容器注文（REQ-19）

```mermaid
flowchart LR
    A[社内: 特別注文枠を作成<br/>商品・受付期間・対象施設] --> M[(特別注文マスタ)]
    M -->|受付期間内のみ表示| F[施設: 特別注文画面]
    F --> O[(特別注文データ)]
    O --> AGG[社内: 特別注文集計]
    AGG --> ORD[容器発注]
```

現行は FAX 受信 → 手作業転記。新システムでは期間限定の注文枠を社内が作成し、受付期間中のみ施設ポータルに注文欄が表示される。おせち容器はこの枠組みの一例として扱う。

### 6.2 試食会対応（REQ-24）

```mermaid
flowchart TB
    A[社内: 試食会を登録<br/>開催日・対象・食数] --> T[(試食会注文<br/>order_type=tasting)]

    T -->|連携する| P1[食数集計表]
    T -->|連携する| P2[調理表]
    T -->|連携する| P3[計量表]
    T -->|連携する| P4[盛付指示書]
    T -->|連携する| P5[ピッキング指示書]

    T -.->|連携しない| X1[佐川伝票]
    T -.->|連携しない| X2[配送ラベル]
    T -.->|連携しない| X3[請求データ]
    T -.->|連携しない| X4[売価計算]

    style X1 fill:#eee,stroke-dasharray: 5 5
    style X2 fill:#eee,stroke-dasharray: 5 5
    style X3 fill:#eee,stroke-dasharray: 5 5
    style X4 fill:#eee,stroke-dasharray: 5 5
```

注文に区分（`order_type`）を持たせ、帳票生成時に区分ごとの連携可否をマスタで制御する。試食会は「製造帳票のみ連携」の区分として定義する。

---

## 7. 業務カレンダーと締切（To-Be）

```mermaid
gantt
    dateFormat YYYY-MM-DD
    axisFormat %m/%d
    title 喫食日を基準とした業務スケジュール（例: 8/20 喫食分）

    section 受注
    仮注文受付期間        :a1, 2026-08-05, 7d
    仮注文締切（マスタ設定）:milestone, m1, 2026-08-12, 0d
    食数変更可能期間       :a2, 2026-08-12, 3d
    変更締切              :milestone, m2, 2026-08-15, 0d

    section 発注
    らくらく献立取込       :b1, 2026-08-13, 1d
    発注量計算（自動）      :b2, 2026-08-13, 1d
    発注確認・調整         :b3, 2026-08-14, 2d
    仕入業者へ発注         :milestone, m3, 2026-08-16, 0d

    section 製造・配送
    製造（D0）            :c1, 2026-08-18, 1d
    集荷（D0〜D3）        :c2, 2026-08-18, 2d
    着荷（D1〜D3）        :c3, 2026-08-19, 2d
    喫食日                :milestone, m4, 2026-08-20, 0d

    section 請求
    月次締め              :d1, 2026-09-01, 2d
    請求書発行            :milestone, m5, 2026-09-03, 0d
```

`[要確認]` 上記の日数関係は現行画面のメッセージ（「8月14日 〜 8月19日 喫食分が変更可能です」など調査日 8/4 時点の表示）から逆算した推定値。実際のリードタイム（仮注文締切から喫食日までの日数、変更可能期間の長さ）はクライアント確認が必要。

---

## 8. 関連ドキュメント

| 参照先 | 内容 |
|--------|------|
| `03_functional_requirements.md` | 各フローを機能要件に分解したもの |
| `06_master_management_spec.md` | 締切ルール・製造パターン・参照ロジックの設定仕様 |
| `07_screen_spec.md` | 各フローに対応する画面仕様 |
| `09_integration_spec.md` | らくらく献立・佐川急便・QR/ラベルの連携仕様 |
