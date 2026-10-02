import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Pixelify_Sans } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fonte bitmap do mundo "Fila de Créditos Cracktro" (ver DESIGN.md) — só pra
// título/rótulos/wordmark, nunca pra texto corrido (chat, descrições): a
// legibilidade em português acentuado em tamanho pequeno vem primeiro que a
// literalidade do mundo visual.
const pixelifySans = Pixelify_Sans({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const DESCRICAO = "Compartilhe sua tela com seus amigos, sem servidor pago no meio.";

/**
 * Endereço público do app, pra montar as URLs absolutas da prévia do link
 * (a imagem do WhatsApp precisa de URL completa). Ordem: a URL do túnel que o
 * `server.ts` descobriu, a do Render, e por fim o que o próprio pedido diz.
 * Os dois primeiros existem porque, atrás de um túnel, o `Host` que chega
 * aqui costuma ser `localhost` — e o robô do WhatsApp não alcança isso.
 */
async function urlBase() {
  const fixa = process.env.URL_PUBLICA ?? process.env.RENDER_EXTERNAL_URL;
  try {
    if (fixa) return new URL(fixa);
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return new URL(`${proto}://${host}`);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: await urlBase(),
    // "Sala abc" nas páginas de sala vira "Sala abc · Sinal"; a home fica "Sinal".
    title: { default: "Sinal", template: "%s · Sinal" },
    description: DESCRICAO,
    // A imagem vem de `opengraph-image.tsx` (raiz e por sala).
    openGraph: { siteName: "Sinal", locale: "pt_BR", type: "website", title: "Sinal", description: DESCRICAO },
    twitter: { card: "summary_large_image" },
  };
}

// Barra do navegador no celular combina com o fundo (e `colorScheme` evita o
// flash branco ao abrir).
export const viewport: Viewport = {
  themeColor: "#020203",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      // Sempre escuro — sem alternância de tema (ver ADR 007 em
      // docs/decisions.md). A classe "dark" também liga as variantes com
      // mais contraste que os componentes Shadcn já trazem prontas.
      className={`dark ${geistSans.variable} ${geistMono.variable} ${pixelifySans.variable} h-full antialiased`}
      // Algumas extensões de navegador (ex: Monica, Grammarly) injetam
      // atributos no <html>/<body> antes do React hidratar, gerando um
      // aviso de "hydration mismatch" que não é bug do app — ver
      // docs/decisions.md (ADR 013).
      suppressHydrationWarning
    >
      <body
        className="flex h-dvh flex-col overflow-y-auto bg-background text-foreground"
        suppressHydrationWarning
      >
        {/*
          THESIS: A lista de quem está na sala é uma fila de créditos de
          crack rodando às 2h da manhã — não uma lista de contatos.
          OWN-WORLD: vazio preto emissivo, poeira cinza em 4 tons pra
          profundidade, um único sinal âmbar, tipografia bitmap (Pixelify
          Sans) pra rótulos e Geist pro corpo — sem cards nem bordas;
          separação por brilho e linha de base, nunca por caixa.
          STORY: amigos entram sem conta; quem compartilha fica na frente,
          brilhante; quem só assiste fica atrás, na penumbra; um cursor
          âmbar pisca esperando o código da sala.
          FIRST VIEWPORT: a home como um prompt de boot — "SINAL" em bitmap
          grande, campo de nome com cursor piscando, sem cartão nem sombra.
          FORM: Fila de Créditos Cracktro, venceu "Painel de Controle
          Comunitário" no confronto de 6 desafiantes (seed 22df9449).
        */}
        <TooltipProvider delay={300}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
