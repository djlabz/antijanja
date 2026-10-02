"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gerarCodigoDeSala, normalizarCodigo } from "@/lib/gerar-codigo";

/**
 * Só decide o código da sala aqui — o nome é sempre perguntado dentro da
 * própria sala (`EscolherNomeSala`), pra evitar uma condição de corrida
 * real entre esta página e a da sala (ver docs/decisions.md, ADR 016).
 */
export function EntrarForm() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const campoRef = useRef<HTMLInputElement>(null);

  // Foco automático só onde tem teclado de verdade: no celular ele abriria o
  // teclado virtual por cima da tela antes de a pessoa ler qualquer coisa.
  useEffect(() => {
    if (window.matchMedia("(hover: hover)").matches) campoRef.current?.focus();
  }, []);

  return (
    <form
      className="flex w-full flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        // Tratado: `a/b` ou `oi?` quebrariam a URL (ver `normalizarCodigo`).
        router.push(`/sala/${normalizarCodigo(codigo) || gerarCodigoDeSala()}`);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="codigo" className="font-mono text-xs text-muted-foreground">
          código&gt; (opcional)
        </label>
        <Input
          id="codigo"
          placeholder="deixe em branco pra criar uma sala nova"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          maxLength={20}
          ref={campoRef}
        />
      </div>

      <Button type="submit" size="lg" className="mt-1 gap-1.5">
        {codigo ? "Entrar na sala" : "Criar sala"}
        <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}
