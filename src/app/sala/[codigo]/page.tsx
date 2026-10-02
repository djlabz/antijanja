import type { Metadata } from "next";
import { SalaClient } from "@/components/sala/sala-client";

/**
 * Título e prévia do link de convite. `noindex`: o código da sala é o único
 * "segredo" dela, então a página não deve aparecer em busca.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ codigo: string }>;
}): Promise<Metadata> {
  const { codigo } = await params;
  const descricao = "Você foi convidado pra assistir junto. Entre com um nome ou como convidado — sem cadastro.";
  return {
    title: `Sala ${codigo.slice(0, 30)}`,
    description: descricao,
    robots: { index: false, follow: false },
    openGraph: { title: "Entre na sala", description: descricao },
  };
}

export default async function SalaPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  return <SalaClient codigo={codigo.toLowerCase()} />;
}
