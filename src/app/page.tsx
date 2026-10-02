import { EntrarForm } from "./_components/entrar-form";

export default function Home() {
  return (
    <main className="campo-poeira relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-10%] left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
      />

      {/* Sem cartão ao redor do formulário — a home é um prompt de boot, não
          um cadastro de SaaS (ver DESIGN.md, "Fila de Créditos Cracktro"). */}
      <div className="relative flex w-full max-w-sm flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="cursor-terminal font-heading text-4xl tracking-wide text-dust-4">
            SINAL
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Compartilhe sua tela com quem estiver na mesma sala. Sem
            cadastro, sem servidor pago — o vídeo vai direto entre vocês.
          </p>
        </div>

        <EntrarForm />
      </div>
    </main>
  );
}
