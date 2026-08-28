"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfigTransmissaoStore } from "@/store/config-transmissao-store";
import {
  BITRATE_OPCOES,
  FPS_OPCOES,
  RESOLUCOES,
  type ResolucaoId,
} from "@/lib/qualidade-transmissao";

interface ConfigTransmissaoPopoverProps {
  /** Chamado depois de qualquer mudança — pra reaplicar na hora se já estiver compartilhando. */
  aoMudar?: () => void;
}

export function ConfigTransmissaoPopover({ aoMudar }: ConfigTransmissaoPopoverProps) {
  // Controlado e desmontado quando fechado — mesmo bug visto no
  // CompartilharSalaDialog (ADR 012 em docs/decisions.md): sem isso, fechar
  // deixa o painel visualmente preso na tela (aqui não trava clique porque
  // não tem um overlay atrás, mas ainda é um bug visível).
  const [aberto, setAberto] = useState(false);
  const resolucao = useConfigTransmissaoStore((s) => s.resolucao);
  const fps = useConfigTransmissaoStore((s) => s.fps);
  const bitrateMbps = useConfigTransmissaoStore((s) => s.bitrateMbps);
  const definirResolucao = useConfigTransmissaoStore((s) => s.definirResolucao);
  const definirFps = useConfigTransmissaoStore((s) => s.definirFps);
  const definirBitrate = useConfigTransmissaoStore((s) => s.definirBitrate);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger
        render={<Button variant="outline" size="icon" aria-label="Qualidade da transmissão" />}
      >
        <Settings className="size-4" />
      </PopoverTrigger>
      {aberto && (
      <PopoverContent align="end">
        <PopoverHeader>
          <PopoverTitle>Qualidade da transmissão</PopoverTitle>
          <PopoverDescription>
            Vale pra próxima vez que você compartilhar a tela — se já
            estiver compartilhando, aplica na hora.
          </PopoverDescription>
        </PopoverHeader>

        <div className="flex flex-col gap-3 pt-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">Resolução</span>
            <Select
              value={resolucao}
              onValueChange={(valor) => {
                definirResolucao(valor as ResolucaoId);
                aoMudar?.();
              }}
            >
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RESOLUCOES).map(([id, r]) => (
                  <SelectItem key={id} value={id}>
                    {r.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">Taxa de quadros</span>
            <Select
              value={String(fps)}
              onValueChange={(valor) => {
                definirFps(Number(valor));
                aoMudar?.();
              }}
            >
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FPS_OPCOES.map((valor) => (
                  <SelectItem key={valor} value={String(valor)}>
                    {valor} fps
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">Bitrate máximo</span>
            <Select
              value={String(bitrateMbps)}
              onValueChange={(valor) => {
                definirBitrate(valor === "null" ? null : Number(valor));
                aoMudar?.();
              }}
            >
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BITRATE_OPCOES.map((opcao) => (
                  <SelectItem key={String(opcao.valor)} value={String(opcao.valor)}>
                    {opcao.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
      )}
    </Popover>
  );
}
