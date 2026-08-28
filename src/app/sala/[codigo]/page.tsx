import { SalaClient } from "@/components/sala/sala-client";

export default async function SalaPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  return <SalaClient codigo={codigo.toLowerCase()} />;
}
