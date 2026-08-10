import { redirect } from "next/navigation";

export default function DeadlinesRedirect() {
  redirect("/orders?tab=calendar");
}
