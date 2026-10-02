import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Sinal",
  description: "Compartilhe sua tela com seus amigos, sem servidor pago no meio.",
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
