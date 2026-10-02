/**
 * O que dizer quando compartilhar a tela não funciona. Sem imports de DOM/React
 * pra poder ser testado direto no Node.
 *
 * Antes disso o botão engolia qualquer erro como "a pessoa cancelou o seletor":
 * no celular (que não tem a API) e em quem abre a sala por `http://IP-da-rede`
 * (o navegador só libera captura em https ou localhost) nada acontecia, sem
 * aviso nenhum.
 */

export type DiagnosticoCaptura = "ok" | "inseguro" | "sem-suporte";

interface Ambiente {
  mediaDevices?: { getDisplayMedia?: unknown } | null;
  isSecureContext?: boolean;
}

function ambienteDoNavegador(): Ambiente {
  if (typeof navigator === "undefined") return {};
  return {
    mediaDevices: navigator.mediaDevices,
    isSecureContext: typeof window === "undefined" ? undefined : window.isSecureContext,
  };
}

/** Este navegador, neste endereço, consegue pedir a tela? */
export function diagnosticarCaptura(ambiente: Ambiente = ambienteDoNavegador()): DiagnosticoCaptura {
  if (typeof ambiente.mediaDevices?.getDisplayMedia === "function") return "ok";
  // Sem `mediaDevices` por causa do http é um caso à parte: a pessoa PODE
  // resolver (abrindo o link https), então a mensagem tem que dizer isso.
  if (ambiente.isSecureContext === false) return "inseguro";
  return "sem-suporte";
}

export const MENSAGEM_SEM_CAPTURA: Record<Exclude<DiagnosticoCaptura, "ok">, string> = {
  inseguro:
    "O navegador só libera compartilhar a tela em endereços https (ou localhost), e este é http. Abra a sala pelo link https que o anfitrião mandou.",
  "sem-suporte":
    "Este navegador não consegue compartilhar a tela (a maioria dos celulares não consegue). Você ainda pode assistir quem compartilha, conversar e colocar vídeos.",
};

/**
 * Mensagem pra um erro do `getDisplayMedia`, ou `null` quando a pessoa só
 * cancelou o seletor (aí não há o que avisar).
 */
export function explicarErroDeCaptura(erro: unknown): string | null {
  const nome = (erro as { name?: string } | null)?.name;
  const mensagem = (erro as { message?: string } | null)?.message ?? "";

  if (nome === "AbortError") return null;
  if (nome === "NotAllowedError") {
    // Cancelar o seletor e negar a permissão caem aqui igual; só o bloqueio do
    // próprio sistema (ex.: "Gravação de tela" desligada no macOS) diz isso.
    return /system/i.test(mensagem)
      ? "O sistema bloqueou a captura de tela. Libere o navegador nas configurações de privacidade do computador e tente de novo."
      : null;
  }
  if (nome === "NotFoundError") return "Não há nenhuma tela ou janela disponível pra compartilhar.";
  if (nome === "NotReadableError") {
    return "Não deu pra capturar essa tela ou janela (outro programa pode estar usando). Escolha outra e tente de novo.";
  }
  if (nome === "SecurityError") return "O navegador bloqueou a captura de tela nesta página.";
  return "Não foi possível começar a compartilhar. Recarregue a página e tente de novo.";
}
