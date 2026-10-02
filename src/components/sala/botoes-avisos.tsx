"use client";

import type { ReactNode } from "react";
import { Bell, BellOff, PanelLeftClose, PanelLeftOpen, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Avisos } from "@/hooks/use-avisos";
import { CopiarLinkButton } from "./copiar-link-button";

/** Botão de ícone do cabeçalho, com dica no hover. */
export function BotaoCabecalho({
  rotulo,
  onClick,
  children,
}: {
  rotulo: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onClick}
            aria-label={rotulo}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{rotulo}</TooltipContent>
    </Tooltip>
  );
}

interface BotoesAvisosProps {
  cinema: boolean;
  alternarCinema: () => void;
  avisos: Avisos;
  linkPublico: string | null;
}

/**
 * Os ícones de "como eu acompanho a sala" no cabeçalho: modo cinema (esconde a
 * lista de participantes), avisos sonoros, notificações do sistema e copiar o
 * link. Só do `md` pra cima (no celular não há onde pô-los).
 */
export function BotoesAvisos({ cinema, alternarCinema, avisos, linkPublico }: BotoesAvisosProps) {
  const {
    somLigado,
    alternarSom,
    notificacaoDisponivel,
    notificacaoLigada,
    notificacaoBloqueada,
    alternarNotificacao,
  } = avisos;

  return (
    <div className="hidden items-center gap-0.5 md:flex">
      <BotaoCabecalho
        rotulo={cinema ? "Mostrar participantes (C)" : "Modo cinema (C)"}
        onClick={alternarCinema}
      >
        {cinema ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
      </BotaoCabecalho>
      {/* Som, sino e copiar link só de 1024px pra cima: em tablet o cabeçalho
          já quebra em duas linhas (o link sai pelo botão "Compartilhar sala").
          O modo cinema fica: é a única forma de trazer a lista de
          participantes de volta. */}
      <span className="hidden items-center gap-0.5 lg:flex">
        <BotaoCabecalho
          rotulo={somLigado ? "Silenciar avisos sonoros" : "Ligar avisos sonoros"}
          onClick={alternarSom}
        >
          {somLigado ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        </BotaoCabecalho>
        {notificacaoDisponivel && (
          <BotaoCabecalho
            rotulo={
              notificacaoBloqueada
                ? "Notificações bloqueadas — libere nas configurações do site no navegador"
                : notificacaoLigada
                  ? "Desligar notificações do sistema"
                  : "Ligar notificações do sistema (mensagens e transmissões quando você estiver em outra janela)"
            }
            onClick={alternarNotificacao}
          >
            {notificacaoLigada ? <Bell className="size-4" /> : <BellOff className="size-4" />}
          </BotaoCabecalho>
        )}
        <CopiarLinkButton linkPublico={linkPublico} />
      </span>
    </div>
  );
}
