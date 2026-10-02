import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // Linha de comando, não caixa: sem preenchimento nem contorno
        // fechado — só uma linha de base que acende âmbar em foco, como um
        // campo de prompt de terminal (ver DESIGN.md, "Fila de Créditos
        // Cracktro").
        "h-10 w-full min-w-0 [@media(hover:none)]:h-11 rounded-full border border-input bg-input/30 px-4 py-2 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
