# Genesis · dashboard

O app (PWA) que mostra a estufa, o ciclo da alface, o dinheiro e, no modo
Desenvolvedor, o treino da rede neural. Só frontend: o backend (simulador em
PyTorch, treino, banco, MQTT) é outra frente e conversa com este app por
contratos de dados (`docs/contrato-dados.md`, Fase 1).

## Comandos

Rode dentro de `dashboard/`.

| Comando                                        | O que faz                                                   |
| ---------------------------------------------- | ----------------------------------------------------------- |
| `npm install`                                  | Instala as dependências (uma vez)                           |
| `npm run dev`                                  | Sobe o app em http://localhost:5173                         |
| `npm run demo`                                 | Sobe o app com os dados de exemplo (o que vai para a banca) |
| `npm test`                                     | Testes unitários (Vitest)                                   |
| `npm run e2e`                                  | Testes de ponta a ponta (Playwright, desktop e celular)     |
| `npm run typecheck` / `npm run lint`           | Qualidade                                                   |
| `npm run tema`                                 | Recompila o tema depois de mexer em `genesisTheme.ts`       |
| `npm run icones`                               | Regera os ícones do PWA                                     |
| `CAPTURAS=fase-N npx playwright test capturas` | Capturas da revisão visual em `docs/revisao-visual/fase-N`  |

Antes de abrir PR: `npm run typecheck && npm run lint && npm test && npm run build`.

## Rotas

| Rota                                                                     | Tela                                               |
| ------------------------------------------------------------------------ | -------------------------------------------------- |
| `/`, `/historico`, `/ciclo`, `/dinheiro`, `/agente-x-regras`, `/ajustes` | Produtor                                           |
| `/dev`, `/dev/treino`, `/dev/modelo`, `/dev/gravacoes`                   | Desenvolvedor                                      |
| `/visor`                                                                 | Tela fixa na estufa (sempre escura, sem controles) |

## Arquitetura

Monolito modular com clean architecture, igual ao Tesserato:

```
src/
  app/                 raiz de composição: rotas, moldura, dependencias.ts
  modules/<modulo>/    estufa, treino, dinheiro, alface, glossario
    domain/            tipos (Zod) e regras puras, com teste
    application/       portas (interfaces) e casos de uso
    infrastructure/    adaptadores (dados de exemplo, simulador de brinquedo...)
    presentation/      páginas, componentes e hooks
    index.ts           API pública do módulo
  shared/
    design-system/     tema, atoms, molecules, organisms, templates (cascas)
    hooks/ stores/
```

- Um módulo só importa outro pelo `index.ts` (ou `dominio.ts`); `shared` não
  importa módulos; `domain` não importa React. O ESLint barra.
- Componentes: só Astryx (`AGENTS.md` tem o guia da CLI dele). Cor só por token.
- Decisões: `docs/decisoes/` na raiz do repositório.
