import { EntrarForm } from "./_components/entrar-form";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-10%] left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/12 blur-[120px]"
      />

      <div className="relative flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Tela Junto</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Compartilhe sua tela com quem estiver na mesma sala. Sem cadastro,
          sem servidor pago — roda direto do seu computador.
        </p>
      </div>

      <div className="relative mt-8 w-full max-w-sm rounded-2xl border border-border bg-card/60 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm">
        <EntrarForm />
      </div>
    </main>
  );
}
