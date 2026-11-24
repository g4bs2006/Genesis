# 0001 — Gráficos com visx

**Data:** 23/11/2026 · **Situação:** aceita

## Contexto

O dashboard precisa de três tipos de gráfico, repetidos em quase todas as telas:

1. linha de 24 h com eixo de tempo, a faixa boa sombreada atrás, a linha de
   dentro cheia e a de fora tracejada;
2. sparkline (minigráfico de ~120×32 px, sem eixos) nos cards de variável;
3. cores vindas dos tokens do tema (`var(--serie-azul)`…), nunca hex solto.

Candidatos: `@astryxdesign/charts` (do mesmo design system dos componentes) e
`visx` (Airbnb, peças de baixo nível sobre o d3). Fizemos um teste pequeno com
os três gráficos em cada um, em projetos separados.

## O que o teste mostrou

| | `@astryxdesign/charts` | `visx` |
| --- | --- | --- |
| Versão | só canary (`0.7.18-canary`) | estável |
| Exige | `@astryxdesign/core` **exatamente** no mesmo canary | nada do core |
| Linha 24 h + eixo de tempo | Datas viram categoria; com `xDomain` em ms o eixo é linear, ticks em 04:46, 10:20… Sem escala de tempo nem `tickValues` | `scaleTime`: ticks em 00:00, 03:00… 21:00 |
| Faixa sombreada | `referenceLine({y, y2})`, ok | um `<rect>`, ok |
| Linha tracejada | sem opção; precisou embrulhar o `render` | `strokeDasharray`, ok |
| Sparkline | ok | ok |
| Cor por `var(--…)` | ok | ok |
| `npm run build` | passa | passa |
| Tamanho (gzip) | 32,7 kB | 24,6 kB |

## Decisão

Usar **visx** (`@visx/shape`, `@visx/scale`, `@visx/axis`, `@visx/group` e
`@visx/responsive` para largura fluida).

- Funciona com o Astryx estável. Adotar o pacote de gráficos canary prenderia o
  app inteiro numa versão de teste que pode quebrar a cada publicação.
- Acerta o eixo de tempo, que aparece em todas as telas.
- É de baixo nível: nós desenhamos com SVG e tokens, então os gráficos seguem
  a linguagem Lightfield sem brigar com estilos prontos.

## Consequências

- Os gráficos são componentes nossos em `shared/design-system` (sparkline,
  série com faixa e ações), feitos uma vez e reaproveitados.
- Tooltip, legenda e acessibilidade (texto alternativo, tabela equivalente)
  são responsabilidade nossa.
- Rever quando `@astryxdesign/charts` sair do canary e tiver escala de tempo.
