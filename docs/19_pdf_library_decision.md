# 19. PDF 生成ライブラリ選定

作成日: 2026-08-10  
対象: 請求書 PDF（FR-601 / FR-603）、将来の配送ラベル PDF

---

## 結論

**採用: [PDFKit](https://pdfkit.org/)（`pdfkit` npm パッケージ）**

日本語フォントは **Noto Sans JP**（または IPAex フォント）を `apps/api/assets/fonts/` に配置し、`PDF_FONT_PATH` 環境変数で参照する。

---

## 選定理由

| 観点 | PDFKit | Puppeteer / Playwright | pdfmake |
|------|--------|------------------------|---------|
| 依存サイズ | 小（純 Node.js） | 大（Chromium 300MB 級） | 中 |
| 非同期ジョブとの相性 | Buffer 直出力で既存ジョブ基盤にそのまま接続 | ブラウザ起動コスト・メモリ消費が大きい | 良好 |
| 表形式帳票（請求明細） | 座標指定で実装（exceljs と同様の命令型） | HTML/CSS テンプレートが書きやすい | 宣言的だがカスタムレイアウトがやや制約 |
| 日本語 | フォント埋め込み必須（1 回設定） | ブラウザフォントで自然 | フォント設定必要 |
| Docker / CI | 追加ランタイム不要 | `--no-sandbox` 等の運用配慮が必要 | 追加ランタイム不要 |
| 既存スタックとの整合 | exceljs 帳票と同様「サーバー側で Buffer 生成 → File 保存 → ジョブ結果」 | 別テンプレート体系（HTML）が増える | 新 API の学習コスト |

請求書 PDF は **明細テーブル＋合計行＋固定ヘッダ** の構造が主で、レイアウト変更頻度も帳票 Excel より低い。非同期ジョブで大量生成する前提では、**軽量・安定・Buffer 直結** の PDFKit が最適。

---

## 不採用とした選択肢

### Puppeteer / Playwright

- HTML/CSS でデザインしやすい反面、本番コンテナに Chromium が必要
- 請求書 1 件ごとの生成コスト（起動・メモリ）が PDFKit より高い
- 将来「ラベル面付け」など複雑レイアウトが必要になった段階で、**帳票種別ごとに再検討**する

### @react-pdf/renderer

- React コンポーネント前提のため API サーバー（Express）からの利用に不向き

---

## 実装方針

```
請求発行 / 訂正
    ↓
invoice.generate_pdf ジョブ（既存 jobs 基盤）
    ↓
invoice-pdf.service.ts（PDFKit で Buffer 生成）
    ↓
saveGeneratedFile → invoices.pdf_file_id を更新
    ↓
GET /invoices/:id/download（署名付き URL）
```

### フォント

| 項目 | 内容 |
|------|------|
| 推奨フォント | Noto Sans JP Regular（SIL Open Font License） |
| 配置 | `apps/api/assets/fonts/NotoSansJP-Regular.otf` |
| 環境変数 | `PDF_FONT_PATH`（未設定時は Helvetica。日本語は化けるため本番では必須） |

### テスト

- ユニットテスト: 生成 Buffer が `%PDF` で始まること、明細行数が反映されること
- 結合テスト: 発行ジョブ完了後に `pdf_file_id` が設定されること（後続タスク）

---

## 影響範囲

| ファイル | 変更 |
|---------|------|
| `apps/api/package.json` | `pdfkit` 追加 |
| `apps/api/src/lib/pdf.ts` | PDFKit ラッパー |
| `apps/api/src/services/invoice-pdf.service.ts` | 請求書レイアウト |
| `packages/database/prisma/schema.prisma` | `invoices.pdf_file_id` 追加 |

---

## 関連資料

- `docs/08_api_spec.md` — `GET /invoices/:id/download`
- `docs/03_functional_requirements.md` — FR-601, FR-603
