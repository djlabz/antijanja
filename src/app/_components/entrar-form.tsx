"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gerarCodigoDeSala } from "@/lib/gerar-codigo";

/**
 * Só decide o código da sala aqui — o nome é sempre perguntado dentro da
 * própria sala (`EscolherNomeSala`), pra evitar uma condição de corrida
 * real entre esta página e a da sala (ver docs/decisions.md, ADR 016).
 */
export function EntrarForm() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");

  return (
    <form
      className="flex w-full flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/sala/${(codigo || gerarCodigoDeSala()).trim().toLowerCase()}`);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="codigo" className="text-xs font-medium text-muted-foreground">
          Código da sala <span className="opacity-70">(opcional)</span>
        </label>
        <Input
          id="codigo"
          placeholder="Deixe em branco pra criar uma sala nova"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          maxLength={20}
          autoFocus
        />
      </div>

      <Button type="submit" size="lg" className="mt-1 gap-1.5">
        {codigo ? "Entrar na sala" : "Criar sala"}
        <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}
