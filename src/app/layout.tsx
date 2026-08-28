import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Tela Junto",
  description: "Compartilhe sua tela com seus amigos, sem servidor pago no meio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      // Sempre escuro — sem alternância de tema (ver ADR 007 em
      // docs/decisions.md). A classe "dark" também liga as variantes com
      // mais contraste que os componentes Shadcn já trazem prontas.
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
        <TooltipProvider delay={300}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
