import { applyPdfFont, createPdfBuffer } from "../lib/pdf.js";

const SECTIONS: Array<{ title: string; lines: string[] }> = [
  {
    title: "1. ログイン",
    lines: [
      "施設コード（または登録メール）とパスワードでログインします。",
      "パスワードを忘れた場合は、社内管理者にお問い合わせください。",
    ],
  },
  {
    title: "2. 週間注文入力",
    lines: [
      "メニュー「注文」→「週間注文入力」から、1週間分の食数を入力します。",
      "画面上部に次回締切の日時が表示されます。締切後は保存できません。",
      "入力後は「確認して確定」で合計食数を確認してから確定してください。",
      "確定前は下書きとして保存できます。",
    ],
  },
  {
    title: "3. 合数指定",
    lines: [
      "メニュー「注文」→「合数指定」から、混ぜご飯の合数を登録します。",
      "同一内容の二重登録はできません。",
    ],
  },
  {
    title: "4. アレルギー注文",
    lines: [
      "メニュー「注文」→「アレルギー注文」から、アレルギー対応の食数を入力します。",
      "新規登録と変更は別画面で行います。",
    ],
  },
  {
    title: "5. 締切カレンダー",
    lines: [
      "メニュー「注文」→「締切カレンダー」で、月間の締切日を確認できます。",
    ],
  },
  {
    title: "6. 問い合わせ",
    lines: [
      "画面右上のユーザーメニュー「問い合わせ」から、社内への質問・連絡ができます。",
      "返信があると通知が届きます。",
    ],
  },
  {
    title: "7. 困ったときは",
    lines: [
      "ログインできない、パスワードを忘れた等の場合は、社内管理者にお問い合わせください。",
    ],
  },
];

export function buildManualPdfBuffer(): Promise<Buffer> {
  return createPdfBuffer((doc) => {
    applyPdfFont(doc);
    doc.fontSize(18).text("談 業務システム 操作マニュアル（施設向け）", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#666666").text("注文入力の基本操作", { align: "center" });
    doc.fillColor("#000000");
    doc.moveDown(1.5);

    for (const section of SECTIONS) {
      doc.fontSize(13).text(section.title);
      doc.moveDown(0.3);
      doc.fontSize(10);
      for (const line of section.lines) {
        doc.text(`・${line}`, { indent: 12 });
      }
      doc.moveDown(0.8);
    }
  });
}
