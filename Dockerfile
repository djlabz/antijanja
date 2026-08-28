# Sinal roda com um servidor customizado (Next.js + Socket.IO no mesmo
# processo, ver server.ts e docs/decisions.md ADR 002) — por isso a imagem
# final ainda precisa do `tsx` e do código-fonte em tempo de execução, não só
# do build do Next. Pra manter isso simples (zero chance de faltar um
# arquivo que o servidor customizado importe em runtime), o estágio final
# copia o projeto inteiro do builder — incluindo devDependencies — em vez de
# podar pra um `node_modules` só de produção. Trocamos alguns MB de imagem
# por zero surpresa; ver docs/decisions.md (ADR 010).

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder /app ./

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
