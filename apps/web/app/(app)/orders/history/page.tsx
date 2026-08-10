import { redirect } from "next/navigation";

export default function HistoryRedirect() {
  redirect("/orders?tab=content");
}
