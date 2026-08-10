import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ customerId?: string }> };

export default async function NewYearRedirect({ searchParams }: Props) {
  const sp = await searchParams;
  const params = new URLSearchParams({ tab: "entry", span: "new_year" });
  if (sp.customerId) params.set("customer", sp.customerId);
  redirect(`/orders?${params}`);
}
