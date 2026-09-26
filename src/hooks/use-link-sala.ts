"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Link que leva direto pra sala. O caminho vem de `usePathname()` — NÃO de
 * `window.location.href` direto: numa navegação client-side do Next o
 * componente pode montar num instante em que `location.href` ainda reflete
 * a rota anterior (ADR 009). A origem local não muda durante a sessão, então
 * ler uma vez no mount é seguro; `linkPublico` (túnel do Cloudflare), quando
 * existe, ganha dela — quem hospeda costuma abrir `localhost` (ADR 011).
 */
export function useLinkSala(linkPublico?: string | null) {
  const caminho = usePathname();
  const [origemLocal] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : ""
  );
  const origem = linkPublico ?? origemLocal;
  return origem ? `${origem}${caminho}` : "";
}

/** Copia `texto` e mantém `copiado` ligado por 2s pra dar retorno visual. */
export function useCopiar(texto: string) {
  const [copiado, setCopiado] = useState(false);

  const copiar = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard indisponível (ex: http sem permissão) — nada a mostrar.
    }
  }, [texto]);

  return { copiado, copiar };
}
