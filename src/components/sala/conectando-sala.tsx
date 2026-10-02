"use client";

import { useEffect, useState } from "react";

/** Depois de quanto tempo conectando vale explicar que está demorando. */
const DEMORA_MS = 8000;

/**
 * Mostrado no lugar da sala vazia enquanto a primeira conexão não termina.
 * Antes a sala dizia "Você está sozinho por aqui" nesse intervalo, o que é
 * falso (a lista de participantes ainda nem chegou) e confunde quem entra por
 * uma rede lenta ou num servidor gratuito que estava dormindo.
 */
export function ConectandoSala() {
  const [demorando, setDemorando] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDemorando(true), DEMORA_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      className="campo-poeira flex h-full flex-col items-center justify-center gap-3 rounded-3xl bg-white/[0.03] p-6 text-center md:p-10"
    >
      <p className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
        <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden />
        Conectando à sala…
      </p>
      {demorando && (
        <p className="max-w-sm text-sm text-muted-foreground">
          Está demorando mais que o normal. Se o servidor é de hospedagem gratuita ele pode
          estar acordando, o que leva até um minuto. É só esperar: a sala abre sozinha.
        </p>
      )}
    </div>
  );
}
