"use client";

import { Info, MonitorUp, MonitorX, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SaudeSaida } from "@/hooks/use-sala";
import type { ParticipantId } from "@/lib/socket-events";
import { StatusTransmissao } from "./status-transmissao";

interface ControlesTransmissaoProps {
  estouCompartilhando: boolean;
  /** O navegador consegue capturar a tela? Se não, nem o botão aparece (ver `captura-de-tela.ts`). */
  podeCompartilhar: boolean;
  aoCompartilhar: () => void;
  aoParar: () => void;
  audio: { existe: boolean; ligado: boolean; alternar: () => void };
  lerSaude: () => Promise<SaudeSaida[]>;
  nomeDe: (id: ParticipantId) => string;
  bitrateMbps: number | null;
}

/**
 * O lado de quem transmite no cabeçalho: começar/parar, a dica sobre áudio do
 * Discord, ligar/desligar o áudio da transmissão e o painel de quem está
 * recebendo.
 */
export function ControlesTransmissao({
  estouCompartilhando,
  podeCompartilhar,
  aoCompartilhar,
  aoParar,
  audio,
  lerSaude,
  nomeDe,
  bitrateMbps,
}: ControlesTransmissaoProps) {
  return (
    <>
      {estouCompartilhando ? (
        <Button variant="destructive" size="sm" className="gap-1.5" onClick={aoParar}>
          <MonitorX className="size-3.5" />
          <span className="max-sm:sr-only">Parar compartilhamento</span>
        </Button>
      ) : podeCompartilhar ? (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={aoCompartilhar}>
            <MonitorUp className="size-3.5" />
            <span className="max-sm:sr-only">Compartilhar tela</span>
          </Button>
          <Tooltip>
            {/* Botão de verdade (não um `span`): assim o teclado alcança a
                dica, e o foco é o que abre o tooltip. */}
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label="Dica sobre áudio ao compartilhar"
                  className="hidden size-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring sm:flex"
                />
              }
            >
              <Info className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent className="max-w-64">
              Pra levar o áudio de um vídeo sem pegar a voz do Discord, escolha
              compartilhar uma aba do navegador ou uma janela (não a tela toda)
              quando ele perguntar o quê compartilhar. Dá pra ligar e desligar o
              áudio durante a transmissão.
            </TooltipContent>
          </Tooltip>
        </div>
      ) : null}

      {estouCompartilhando && audio.existe && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={audio.alternar}
          aria-pressed={audio.ligado}
          title={audio.ligado ? "Tirar o áudio da transmissão" : "Voltar a enviar o áudio"}
        >
          {audio.ligado ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
          <span className="max-sm:sr-only">{audio.ligado ? "Áudio ligado" : "Sem áudio"}</span>
        </Button>
      )}

      {estouCompartilhando && (
        <StatusTransmissao ler={lerSaude} nomeDe={nomeDe} bitrateMbps={bitrateMbps} />
      )}
    </>
  );
}
