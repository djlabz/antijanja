"use client";

import { useState } from "react";
import { ArrowRight, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EscolherNomeSalaProps {
  codigo: string;
  aoEscolherNome: (nome: string) => void;
  aoEscolherConvidado: () => void;
}

/**
 * Tela mostrada quando alguém abre o link de uma sala sem ter passado pela
 * home (então não tem nome salvo) — antes disso a pessoa caía num redirect
 * pra "/" que perdia o código da sala e, dependendo do momento, deixava a
 * tela preta parada (bug real reportado, ver docs/decisions.md ADR 014 e,
 * pra causa raiz do "preso na tela preta", ADR 016).
 * Agora resolve isso na própria página da sala.
 */
export function EscolherNomeSala({ codigo, aoEscolherNome, aoEscolherConvidado }: EscolherNomeSalaProps) {
  const [nome, setNome] = useState("");

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-10%] left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/12 blur-[120px]"
      />

      <div className="relative flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Você foi convidado pra sala{" "}
          <span className="font-mono text-primary">{codigo}</span>
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Escolha um nome pra entrar, ou continue como convidado.
        </p>
      </div>

      <form
        className="relative mt-8 flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-border bg-card/60 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const limpo = nome.trim();
          if (limpo) aoEscolherNome(limpo);
        }}
      >
        <label htmlFor="nome-convite" className="text-xs font-medium text-muted-foreground">
          Seu nome
        </label>
        <Input
          id="nome-convite"
          placeholder="Ex: Maria"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={30}
          autoFocus
        />

        <div className="mt-1 grid grid-cols-2 gap-2">
          <Button type="submit" disabled={!nome.trim()} className="gap-1.5">
            Entrar
            <ArrowRight className="size-4" />
          </Button>
          <Button type="button" variant="outline" onClick={aoEscolherConvidado} className="gap-1.5">
            <UserRound className="size-4" />
            Convidado
          </Button>
        </div>
      </form>
    </main>
  );
}
