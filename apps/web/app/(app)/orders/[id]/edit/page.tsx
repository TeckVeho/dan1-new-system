import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function OrderEditRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/orders?tab=content&focus=${id}`);
}
