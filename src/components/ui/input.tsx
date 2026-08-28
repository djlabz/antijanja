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
        "h-8 w-full min-w-0 rounded-none border-0 border-b border-input bg-transparent px-0.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-b-primary focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-b-destructive md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
