"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUsuarioStore } from "@/store/usuario-store";
import { gerarCodigoDeSala } from "@/lib/gerar-codigo";

export function EntrarForm() {
  const router = useRouter();
  const nomeSalvo = useUsuarioStore((s) => s.nome);
  const definirNome = useUsuarioStore((s) => s.definirNome);
  const [nome, setNome] = useState(nomeSalvo);
  const [codigo, setCodigo] = useState("");

  function entrar(codigoDestino: string) {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;
    definirNome(nomeLimpo);
    router.push(`/sala/${codigoDestino.trim().toLowerCase()}`);
  }

  return (
    <form
      className="flex w-full flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        entrar(codigo || gerarCodigoDeSala());
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nome" className="text-xs font-medium text-muted-foreground">
          Seu nome
        </label>
        <Input
          id="nome"
          placeholder="Ex: Maria"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={30}
          required
          autoFocus
        />
      </div>

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
        />
      </div>

      <Button type="submit" size="lg" className="mt-1 gap-1.5">
        {codigo ? "Entrar na sala" : "Criar sala"}
        <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}
