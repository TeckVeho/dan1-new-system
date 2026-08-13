import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Download } from "lucide-react";
import { downloadManualPdf } from "@/lib/api";

export default function ManualPage() {
  return (
    <div>
      <PageHeader
        title="操作マニュアル"
        description="注文画面の操作方法を確認できます"
        actions={
          <Button type="button" onClick={() => downloadManualPdf()}>
            <Download className="h-3.5 w-3.5" />
            PDF をダウンロード
          </Button>
        }
      />
      <Alert variant="info" className="mb-4">
        PDF に主要な操作手順をまとめています。ログインできない場合は管理者にお問い合わせください。
      </Alert>
      <div className="rounded-lg border border-border bg-white px-4 py-6 text-[13px] text-text">
        <p className="mb-2">よく使う画面:</p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li><Link href="/orders/weekly" className="text-primary hover:underline">週間注文入力</Link></li>
          <li><Link href="/orders/rice" className="text-primary hover:underline">合数指定</Link></li>
          <li><Link href="/orders/allergen/new" className="text-primary hover:underline">アレルギー注文</Link></li>
          <li><Link href="/orders/deadlines" className="text-primary hover:underline">締切カレンダー</Link></li>
        </ul>
      </div>
    </div>
  );
}
