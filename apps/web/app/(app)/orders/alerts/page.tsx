import { redirect } from "next/navigation";

export default function OrderAlertsRedirect() {
  redirect("/dashboard/alerts");
}
