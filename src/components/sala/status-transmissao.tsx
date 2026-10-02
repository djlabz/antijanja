"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { EstadoConexao, LimiteEnvio, SaudeSaida } from "@/lib/conexoes-webrtc";
import type { ParticipantId } from "@/lib/socket-events";

interface StatusTransmissaoProps {
  /** Lê a saúde de cada conexão de saída (ver `saude` em `conexoes-webrtc`). */
  ler: () => Promise<SaudeSaida[]>;
  nomeDe: (id: ParticipantId) => string;
  /** Limite configurado por espectador, em Mbps (`null` = sem limite). */
  bitrateMbps: number | null;
}

interface Linha extends SaudeSaida {
  /** Vazão atual pra esse espectador, em Mbps (null até ter duas leituras). */
  mbps: number | null;
}

const ROTULO_ESTADO: Record<EstadoConexao, string> = {
  conectando: "conectando",
  conectado: "recebendo",
  instavel: "instável",
  falhou: "não conectou",
};

const ROTULO_LIMITE: Record<Exclude<LimiteEnvio, "none">, string> = {
  bandwidth: "limitado pelo seu envio de internet",
  cpu: "limitado pelo processador",
  other: "qualidade reduzida",
};

/** Problema = não conectou/instável, ou o encoder está abrindo mão de qualidade. */
function comProblema(l: SaudeSaida) {
  return l.estado === "falhou" || l.estado === "instavel" || l.limite === "bandwidth" || l.limite === "cpu";
}

/**
 * Pra quem está transmitindo: quantos recebem, quem está com problema e quanto
 * de upload sai. Antes só o espectador via que estava travando — quem
 * transmite ficava no escuro (ADR 027). Faz uma leitura a cada 2,5s enquanto
 * a aba está visível.
 */
export function StatusTransmissao({ ler, nomeDe, bitrateMbps }: StatusTransmissaoProps) {
  const [aberto, setAberto] = useState(false);
  const [linhas, setLinhas] = useState<Linha[]>([]);

  useEffect(() => {
    let ativo = true;
    let anterior = new Map<ParticipantId, { bytes: number; em: number }>();

    async function atualizar() {
      if (document.hidden) return;
      const leituras = await ler().catch(() => null);
      if (!ativo || !leituras) return;
      const proximo = new Map<ParticipantId, { bytes: number; em: number }>();
      setLinhas(
        leituras.map((l) => {
          const antes = anterior.get(l.id);
          proximo.set(l.id, { bytes: l.bytes, em: l.em });
          const mbps =
            antes && l.em > antes.em ? ((l.bytes - antes.bytes) * 8) / ((l.em - antes.em) * 1000) : null;
          return { ...l, mbps };
        })
      );
      anterior = proximo;
    }

    atualizar();
    const id = setInterval(atualizar, 2500);
    return () => {
      ativo = false;
      clearInterval(id);
    };
  }, [ler]);

  if (linhas.length === 0) return null;

  const problemas = linhas.filter(comProblema).length;
  const totalMbps = linhas.reduce((soma, l) => soma + (l.mbps ?? 0), 0);
  const faltaBanda = linhas.some((l) => l.limite === "bandwidth");

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger
        render={<Button variant="outline" size="sm" className="hidden gap-1.5 md:inline-flex" />}
      >
        <Radio className="size-3.5" />
        {linhas.length} assistindo
        {problemas > 0 && <span className="text-destructive">· {problemas} com problema</span>}
      </PopoverTrigger>
      {/* Montado só aberto — mesmo motivo dos outros popovers (ADR 012). */}
      {aberto && (
        <PopoverContent align="end" className="w-80">
          <PopoverHeader>
            <PopoverTitle>Quem está recebendo sua tela</PopoverTitle>
            <PopoverDescription>
              Atualiza a cada poucos segundos.
            </PopoverDescription>
          </PopoverHeader>

          <ul className="flex flex-col gap-2 pt-1">
            {linhas.map((l) => (
              <li key={l.id} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      l.estado === "conectado" && "bg-primary",
                      l.estado === "conectando" && "animate-pulse bg-muted-foreground",
                      l.estado === "instavel" && "bg-muted-foreground",
                      l.estado === "falhou" && "bg-destructive"
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{nomeDe(l.id)}</span>
                  <span className="text-xs text-muted-foreground">{ROTULO_ESTADO[l.estado]}</span>
                  {l.mbps !== null && l.estado === "conectado" && (
                    <span className="w-16 text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {l.mbps.toFixed(1).replace(".", ",")} Mbps
                    </span>
                  )}
                </div>
                {l.limite !== "none" && l.estado === "conectado" && (
                  <p className="pl-4 text-xs text-destructive">{ROTULO_LIMITE[l.limite]}</p>
                )}
              </li>
            ))}
          </ul>

          <p className="border-t border-border/40 pt-2 text-xs text-muted-foreground">
            Saindo agora: <span className="font-mono text-foreground">{totalMbps.toFixed(1).replace(".", ",")} Mbps</span>
            {bitrateMbps !== null && <> · máximo de {bitrateMbps} Mbps por pessoa</>}
          </p>
          {faltaBanda && (
            <p className="text-xs text-muted-foreground">
              Seu envio de internet não está dando conta de todo mundo. Baixe a
              qualidade na engrenagem (menos Mbps ou menos fps) pra todos
              receberem sem travar.
            </p>
          )}
        </PopoverContent>
      )}
    </Popover>
  );
}
