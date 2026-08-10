import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ customerId?: string }> };

export default async function WeeklyOrdersRedirect({ searchParams }: Props) {
  const sp = await searchParams;
  const params = new URLSearchParams({ tab: "entry" });
  if (sp.customerId) params.set("customer", sp.customerId);
  redirect(`/orders?${params}`);
}
