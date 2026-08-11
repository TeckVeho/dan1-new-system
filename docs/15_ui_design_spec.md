# 15. UIデザイン仕様

作成日: 2026-08-04
参照元: `/Users/kohei/Projects/misaki-reports`（MKS Reports）の Web UI

本ドキュメントは、新システムの UI を **misaki-reports と同一のビジュアル言語・レイアウト構造** で構築するための仕様である。実装時は `misaki-reports/web` の `tailwind.config.ts`・`globals.css`・`components/layout`・`components/ui` をテンプレートとして移植する。

---

## 1. 方針

| 項目 | 内容 |
|------|------|
| デザイン参照 | misaki-reports（Linear / GitHub 系のクリーンな業務UI） |
| フレームワーク | Next.js App Router + Tailwind CSS + lucide-react |
| フォント | Inter（欧文）+ Noto Sans JP（日本語） |
| トーン | 白ベース・薄いグレー背景・インディゴのプライマリ。影は最小限 |
| 適用範囲 | 施設向け・社内向けの全画面（帳票PDF自体は対象外） |

**画面仕様（機能・遷移）は `07_screen_spec.md`、見た目・レイアウト・コンポーネントは本ドキュメントに分離する。**

---

## 2. デザイントークン

### 2.1 カラー（dan1 ブランド）

`tailwind.config.ts` / CSS 変数に同一値を定義する。Tailwind のアルファ修飾子（`bg-primary/10` 等）のため、CSS 変数は **R G B チャンネル値**（スペース区切り）で保持する。

| トークン | 値 | Tailwind | 用途 |
|---------|-----|----------|------|
| primary | `#704E30` | `primary` | 主ボタン、アクティブナビ、フォーカス、リンク |
| primary-hover | `#5A3C24` | `primary-hover` | 主ボタンホバー |
| primary-light | `#F3EBE4` | `primary-light` | 薄い強調背景・テーブル行ホバー |
| accent | `#E2A012` | `accent` | アクセント |
| accent-hover | `#C98E0F` | `accent-hover` | アクセントホバー |
| accent-light | `#FBF3E0` | `accent-light` | 薄いアクセント背景 |
| success | `#2DA44E` | `success` | 成功・確定 |
| warning | `#BF8700` | `warning` | 警告・締切接近 |
| danger | `#CF222E` | `danger` | エラー・削除・締切超過 |
| border | `#D9CDBF` | `border` | 境界線 |
| muted | `#7A6552` | `muted` | 補助テキスト・アイコン |
| surface | `#FFFFFF` | `surface` | カード・サイドバー・入力背景 |
| surface-subtle | `#FAF6F1` | `surface-subtle` | テーブルヘッダー・薄い背景 |
| bg | `#F4F7F2` | `bg` | ページ背景 |
| sidebar | `#FFFFFF` | `sidebar` | サイドバー背景 |
| text | `#704E30` | `text` | 本文 |

```css
:root {
  --color-primary: 112 78 48;
  --color-primary-hover: 90 60 36;
  --color-primary-light: 243 235 228;
  --color-accent: 226 160 18;
  --color-accent-hover: 201 142 15;
  --color-accent-light: 251 243 224;
  --color-bg: 244 247 242;
  --color-surface: 255 255 255;
  --color-surface-subtle: 250 246 241;
  --color-sidebar: 255 255 255;
  --color-text: 112 78 48;
  --color-muted: 122 101 82;
  --color-border: 217 205 191;
}
```

**コントラスト基準:** テーブルの罫線・ホバーは白背景に対して最低 1.4:1 以上、12px 以下のテキストは WCAG AA（4.5:1 以上）を確保する。

**状態色の併用ルール（NFR-19-2）:** 発注スケジュールの赤/青/黄など色分けには、必ずラベルまたはアイコンを併記する。色のみで意味を伝えない。

### 2.2 角丸

misaki-reports と同様、小さめの角丸を使う（`rounded-full` のピルは使わない）。

| トークン | 値 | 用途 |
|---------|-----|------|
| `rounded-sm` | 3px | バッジ・小さなチップ |
| `rounded-md` | 5px | ボタン・入力・ナビ項目・ブランドマーク |
| `rounded-lg` | 6px | カード・セクション・ログインカード |
| `rounded-xl` | 8px | ワークスペース枠（一覧+詳細の複合パネル） |

### 2.3 タイポグラフィ

| 項目 | 仕様 |
|------|------|
| 欧文 | Inter（`next/font/google` → `--font-inter`） |
| 日本語 | Noto Sans JP 400/500/600/700（`--font-noto-sans-jp`） |
| フォールバック | Hiragino Sans → ui-sans-serif → system-ui |
| 本文 | 14px / line-height 1.5 |
| アンチエイリアス | `-webkit-font-smoothing: antialiased` |

| 用途 | サイズ | ウェイト | 色 |
|------|--------|---------|-----|
| ページタイトル（PageHeader） | `text-xl`（20px） | `font-semibold` / `tracking-tight` | `text` |
| セクション見出し | `text-[15px]` | `font-semibold` | `text` |
| 本文・入力 | `text-sm`（14px） | regular | `text` |
| UIラベル・ナビ・ボタン・テーブル | `text-[13px]` | medium（操作系）/ regular | `text` / `muted` |
| 補助・メタ情報 | `text-[12px]` / `text-xs` | regular | `muted` |
| カテゴリ見出し（サイド内） | `text-[11px]` | `font-semibold` / `uppercase` / `tracking-wide` | `muted` |
| ブランドマーク内文字 | `text-[10px]`〜`text-xs` | `font-bold` | white |

### 2.4 データ密度（dan1 固有の例外）

発注スケジュール等の高密度グリッドのみ、misaki の標準より一段小さくする。

| 用途 | フォントサイズ | 行高 |
|------|--------------|------|
| 通常テキスト | 14px | 1.5 |
| 一覧テーブル | 13px | 1.4 |
| 高密度グリッド | 12px | 1.3 |
| 数値セル | 12px / `tabular-nums` / 右揃え | 1.3 |

### 2.5 影・モーション

| 項目 | 仕様 |
|------|------|
| 影 | 原則なし。ログインカード・複合ワークスペースのみ `shadow-sm` |
| フェードイン | `fade-in-up`（opacity 0→1、translateY 4px→0、0.2s ease-out）。ログイン等の初回表示に使用 |
| トランジション | `transition-colors` を基本。過度なアニメーションは禁止 |

---

## 3. レイアウト構造（misaki-reports 準拠）

### 3.1 アプリシェル

misaki-reports の `AppLayout` + `Sidebar` と同じ構造にする。

```
┌────────────┬──────────────────────────────────────────┐
│ Sidebar    │ main（flex-1 overflow-auto）              │
│ w-56       │                                          │
│ sticky     │  ┌────────────────────────────────────┐  │
│ h-screen   │  │ 成り代わりバー（該当時のみ・全幅）   │  │
│ border-r   │  ├────────────────────────────────────┤  │
│ bg-sidebar │  │ ユーティリティヘッダー h-12         │  │
│            │  ├────────────────────────────────────┤  │
│ [Brand]    │  │ content: px-5 py-6 lg:px-8         │  │
│ ---------- │  │  PageHeader                         │  │
│ Nav items  │  │  SectionNavTabs（該当画面のみ）      │  │
│ ...        │  │  本文（カード / テーブル / グリッド） │  │
│            │  └────────────────────────────────────┘  │
└────────────┴──────────────────────────────────────────┘
```

| 領域 | クラス相当 | 仕様 |
|------|-----------|------|
| 外側 | `flex min-h-screen bg-bg` | — |
| サイドバー | `sticky top-0 h-screen w-56 shrink-0 flex-col border-r border-border bg-sidebar` | 折りたたみは将来拡張。初期は固定幅 |
| メイン列 | `flex min-w-0 flex-1 flex-col` | 成り代わりバー・ヘッダー・コンテンツを縦積み |
| ユーティリティヘッダー | `h-12 shrink-0 border-b border-border bg-sidebar px-4` | 右寄せ。通知・問い合わせ・お知らせ・マニュアル・アカウント |
| コンテンツ | `flex-1 overflow-auto` | — |
| コンテンツ余白 | `w-full px-5 py-6 lg:px-8` | misaki と同値 |

**業務ナビはサイドバー、横断ユーティリティはヘッダー** に分離する。ブランドはサイドバー上部、ユーザー情報・設定・ログアウト・バージョンはヘッダー右端のアカウントメニューに集約する。

### 3.2 サイドバー詳細

| 要素 | 仕様 |
|------|------|
| ブランド行 | `border-b border-border px-4 py-3`。ロゴ + `業務システム` サブタイトル |
| ナビ | `flex flex-col gap-px px-2 py-2`。項目は `rounded-md px-2.5 py-1.5 text-[13px]` + lucide アイコン `h-4 w-4` |
| アクティブ | `bg-primary/8 font-medium text-primary`（タブ配下 URL も親項目をアクティブにする） |
| 非アクティブ | `text-muted hover:bg-bg hover:text-text` |
| カテゴリ見出し | `text-[11px] font-semibold uppercase tracking-wide text-muted` |

サイドバー下部のユーザー表示・ログアウト・バージョンは **ヘッダーのアカウントメニューへ移行** した。

#### 社内向けサイドバー構成

```
ダッシュボード
── 受注 ──
注文 / 未入力アラート
── 献立・盛付 ──
献立資料 / 盛付指示書 / 帳票出力
── 発注・在庫 ──
データ取込 / 発注スケジュール / 棚卸 / 食数調整
── 請求 ──
請求 / 売価計算
── 管理 ──
マスタ管理 / システム管理
```

#### 施設向けサイドバー構成

```
ダッシュボード / 注文
── 資料 ──
献立資料 / 盛付指示書 / 請求
```

#### ヘッダー（ユーティリティ）

| 項目 | 配置 | 備考 |
|------|------|------|
| 通知 | ヘッダー右 | 未読バッジ付き |
| 問い合わせ | ヘッダー右 | `inquiry.read` 権限 |
| お知らせ | ヘッダー右 | `announcement.read` 権限 |
| 操作マニュアル | ヘッダー右 | 全ユーザー |
| アカウントメニュー | ヘッダー右端 | ユーザー名・設定・ログアウト・バージョン |

#### ページ内タブ（SectionNavTabs）

サイドバーから畳んだサブ画面は、PageHeader 直下にタブナビで切り替える。

| 親画面 | タブ |
|--------|------|
| 注文 | 注文一覧 / 注文食数の確認 / 合数ログ |
| データ取込 | データ取込 / 取込状況カレンダー |
| 発注スケジュール | 発注スケジュール / 計算根拠の確認 |
| 食数調整 | 食数補正 / 食数データの同期 |

URL は既存ルートを維持する（リダイレクトなし）。配送日プレビューはマスタ管理ハブ配下へ移動。

#### 旧サイドバー構成（参考・廃止）

```
ダッシュボード
── 受注 ──
注文一覧 / 未入力アラート / 特別注文 / 試食会
── 発注・在庫 ──
発注スケジュール / データ取込 / 棚卸 / 食数補正
── 帳票・配送 ──
帳票生成 / 盛付指示書 / 献立資料 / 佐川伝票
── 請求 ──
請求書 / 売価計算
── マスタ ──
施設 / 締切 / 嚥下食 / 定型文 / …（ハブへ集約可）
── 管理 ──
ユーザー / 監査ログ / ジョブ / 設定
```

#### 施設向けナビ構成（例）

```
ダッシュボード
週間注文 / 注文変更 / 注文履歴
合数指定 / アレルギー / 元旦注文 / 特別注文
献立資料 / 盛付指示書
請求書
お知らせ
操作マニュアル
```

### 3.3 PageHeader

misaki の `PageHeader` をそのまま採用する。

```
タイトル（text-xl font-semibold）
説明文（text-[13px] text-muted、任意）
                              [アクション群]
```

| props | 内容 |
|-------|------|
| `title` | 必須 |
| `description` | 任意。1行の説明 |
| `actions` | 任意。右上の Button 群 |

ページ先頭にパンくずは置かない（misaki 準拠）。階層はサイドバーのアクティブ状態と PageHeader タイトルで示す。深い階層が必要な画面のみ、タイトル上に `text-[12px] text-muted` の簡易パスを置いてよい。

### 3.4 ログイン画面

misaki の `LoginForm` レイアウトを踏襲する。

| 項目 | 仕様 |
|------|------|
| 背景 | `bg-bg`、画面中央配置 |
| カード | `max-w-[380px]`、`rounded-lg border border-border bg-white p-8 shadow-sm` |
| ブランド | 中央に `h-8 w-8 rounded-md bg-primary` のマーク + アプリ名 |
| 説明 | `text-[13px] text-muted` |
| エラー | `border-danger/20 bg-danger/5 text-danger` + AlertCircle アイコン |
| 送信ボタン | primary 全幅。矢印アイコンはホバーでわずかに右へ |
| アニメーション | カードに `animate-fade-in-up` |
| フッター | カード外にコピーライト `text-xs text-muted` |

ソーシャルログイン UI は置かない（現行 A-05 の解消）。

### 3.5 成り代わりバー（dan1 固有）

misaki にない要素。シェル最上部（サイドバーの右・メイン領域の上端）に固定表示する。

| 項目 | 仕様 |
|------|------|
| 背景 | `bg-warning/10 border-b border-warning/30` または `bg-primary/5` |
| 文言 | `○○苑 として表示中（閲覧のみ / 操作可）` |
| 操作 | 右端に「終了」secondary ボタン |
| 高さ | コンパクト（`py-2 px-4 text-[13px]`） |

---

## 4. コンポーネント仕様

実装は `packages/ui`（または `apps/web/components/ui`）に置き、misaki の `Button` / `Input` を起点に拡張する。

### 4.1 Button

| variant | 見た目 |
|---------|--------|
| `primary`（既定） | `bg-primary text-white hover:bg-primary-hover` |
| `secondary` | `border border-border bg-white text-text hover:bg-bg` |
| `danger`（追加） | secondary ベース + `text-danger hover:bg-danger/5` |
| `ghost`（追加） | 枠なし `text-muted hover:bg-bg hover:text-text` |

| 項目 | 仕様 |
|------|------|
| 高さ | 既定 `h-8`。強調時のみ `h-9` |
| 文字 | `text-[13px] font-medium` |
| 角丸 | `rounded-md` |
| フォーカス | `focus-visible:ring-1 focus-visible:ring-primary/40` |
| loading | スピナー（`border-2 border-current border-t-transparent animate-spin`）+ disabled |

### 4.2 Input / Select / Textarea

| 項目 | 仕様 |
|------|------|
| ラベル | `mb-1.5 block text-[13px] font-medium text-muted`（または `text-[12px] text-muted`） |
| フィールド | `rounded-md border border-border bg-white px-3 py-2 text-sm` |
| フォーカス | `focus:border-primary/60 focus:ring-1 focus:ring-primary/20` |
| エラー | `border-danger` + 下に `text-xs text-danger` |
| プレースホルダ | `placeholder:text-muted/50` |

検索ボックスは misaki 帳票一覧と同様、左に Search アイコン（`absolute left-2.5`）を置いた `pl-9` 入力でもよい。

### 4.3 Card / Section

| 項目 | 仕様 |
|------|------|
| コンテナ | `rounded-lg border border-border bg-white px-4 py-3` または `py-4` |
| セクション見出し | `text-[15px] font-semibold text-text` |
| 統計カード | 同上。ラベル `text-xs text-muted`、数値 `text-xl font-semibold` |

多重のカードネストや大きなドロップシャドウは使わない。

### 4.4 Table

| 項目 | 仕様 |
|------|------|
| 文字 | `text-[13px]`。ヘッダーは `text-[12px] text-muted font-medium` |
| ヘッダー | `sticky top-0 border-b border-border bg-surface-subtle backdrop-blur` |
| 行 | `border-b border-border/80`。`hover:bg-primary-light` |
| 選択行 | `bg-primary/10` |
| 空状態 | 中央寄せの短文 + 必要ならクリア操作（misaki の EmptyState） |

一覧の外側を `rounded-xl border border-border bg-surface shadow-sm` のワークスペース枠で包むパターン（misaki 帳票画面）を、マスタ一覧・注文一覧など「左サブナビ + 右リスト」型に再利用する。

### 4.5 FilterChip / Badge

| 項目 | 仕様 |
|------|------|
| Chip | `rounded-md`（フルピルにしない）。アクティブ時は `bg-primary/10 text-primary` |
| Badge | `rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary` |

### 4.6 Alert / Banner

| 種別 | クラス |
|------|--------|
| エラー | `rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-[13px] text-danger` |
| 情報・成功メッセージ | `rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-[13px]` |
| 警告（開発モード等） | `rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900` |
| 締切バナー | 通常は `border-border bg-white` 内に時計アイコン + 文言。締切1時間前は warning、超過は danger 系 |

### 4.7 アイコン

| 項目 | 仕様 |
|------|------|
| ライブラリ | `lucide-react`（misaki と同じ） |
| ナビ・インライン | `h-4 w-4` |
| 小さめ | `h-3.5 w-3.5` |
| カード装飾 | `h-9 w-9` の `rounded-md bg-primary/10 text-primary` 内に `h-4 w-4` |

絵文字は使わない。

---

## 5. 画面タイプ別のレイアウト適用

| 画面タイプ | レイアウト | 参照する misaki パターン |
|-----------|-----------|------------------------|
| ダッシュボード | PageHeader + 統計カードグリッド + セクション | `dashboard/page.tsx` |
| 一覧（単一） | PageHeader + 絞込 + テーブル/リストカード | `users/page.tsx` |
| 一覧（サブナビ付き） | ワークスペース枠 + 左サブナビ + リスト + 任意で詳細パネル | `ReportsWorkspace.tsx` |
| マスタ編集 | PageHeader + タブ（下線 or セグメント）+ フォームカード | users のセクション分割を拡張 |
| 注文グリッド | PageHeader + 締切バナー + 高密度テーブル | dan1 固有（密度トークン §2.4） |
| 発注スケジュール | 同上。簡易/詳細モード切替 | dan1 固有 |
| ログイン | 中央カード | `LoginForm.tsx` |
| モーダル | `rounded-lg border bg-white shadow-sm`。オーバーレイは薄い黒 | `AiReportModal.tsx` の構造を参考 |

---

## 6. 実装配置

```
apps/web/
├── app/
│   ├── globals.css          # misaki の CSS 変数・fade-in-up を移植
│   ├── layout.tsx           # Inter + Noto_Sans_JP
│   ├── (auth)/login/
│   ├── (facility)/...
│   └── (internal)/...
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx    # misaki から移植
│   │   ├── Sidebar.tsx      # ナビ項目を dan1 用に拡張
│   │   ├── PageHeader.tsx   # そのまま移植
│   │   └── ImpersonationBar.tsx
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── alert.tsx
│       └── ...
└── tailwind.config.ts       # misaki の colors / borderRadius / fontFamily を移植
```

Phase 0 のタスク「デザイントークン・共通UIコンポーネント」（`13_phase_plan.md` 0-8）の成果物は本仕様に従う。

---

## 7. アクセシビリティ・品質ルール

| 項目 | 仕様 |
|------|------|
| フォーカス | キーボードフォーカスを `ring` で明示（Button/Input の仕様どおり） |
| コントラスト | 本文 `text` on `bg` / `surface` は十分なコントラストを維持 |
| 色依存の禁止 | 状態は色 + テキスト/アイコン（NFR-19-2） |
| 破壊的操作 | 確認ダイアログ。danger スタイルのボタンを使用 |
| ローディング | 1秒超はスピナー。5秒超の処理は非同期ジョブ UI へ（NFR-18-8） |

---

## 8. misaki-reports からの差分（意図的なもの）

| 項目 | misaki | dan1 |
|------|--------|------|
| プロダクト名 / マーク文字 | MKS Reports / `R` | 談向け名称 / `[要確認]`（例: `談`） |
| ナビ規模 | 4項目 | カテゴリ分けした多階層 |
| 成り代わりバー | なし | あり |
| バージョン表示 | なし | ヘッダーアカウントメニュー内 |
| 高密度グリッド | なし | 発注・注文で 12px 例外 |
| 通知 | なし | ヘッダー右の通知アイコン |
| グローバルヘッダー | なし | ユーティリティ専用ヘッダーあり（業務ナビはサイドバー） |
| Button danger/ghost | なし（ページ内で都度指定） | `packages/ui` に variant として定義 |

ビジュアルの色・角丸・余白・コンポーネント形状は揃える。業務固有の情報設計のみ dan1 側で拡張する。

---

## 9. 関連ドキュメント

| 参照先 | 内容 |
|--------|------|
| `07_screen_spec.md` | 画面一覧・機能仕様。レイアウト方針は本ドキュメントへ委譲 |
| `04_non_functional_requirements.md` | NFR-17〜19（対応環境・操作性・アクセシビリティ） |
| `13_phase_plan.md` | Phase 0-8 で本仕様に基づく UI 基盤を実装 |
| misaki-reports `web/tailwind.config.ts` | トークンの正本 |
| misaki-reports `web/components/layout/*` | シェル実装の正本 |
