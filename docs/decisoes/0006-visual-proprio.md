# 0006 — Visual próprio: verde-estufa e ícones do Genesis

**Data:** 25/11/2026 · **Situação:** aceita · **Substitui em parte:** [0002](0002-tema.md)

## Contexto

O tema seguia a linguagem Lightfield do Tesserato (0002): cinza puro, botão de
ação preto, cantos de 5/8/12 px. Funcionava (legível, calmo), mas não dizia
nada sobre o Genesis. Os ícones eram Heroicons genéricos (casinha, relógio,
brilho, dinheiro) que não contavam o que cada página é.

O Gabriel pediu para se afastar um pouco do Lightfield. Foram mostradas três
direções (só o destaque; verde-estufa; mais ousada) e duas formas de refazer os
ícones (SVG próprio; Lucide; Phosphor). **O Gabriel escolheu o verde-estufa e
os ícones em SVG próprio.**

## Decisão

### Cores e forma (`dashboard/src/shared/design-system/tema/genesisTheme.ts`)

| Token | Antes (Lightfield) | Agora (verde-estufa) |
| --- | --- | --- |
| página | `#F5F5F5` / `#151515` | `#F4F3EF` / `#121513` (papel; folha à noite) |
| painel | `#F9F9F9` / `#1A1A1A` | `#F8F7F4` / `#171A18` |
| cartão | `#FFFFFF` / `#202020` | `#FFFFFF` / `#1B1F1C` |
| destaque (`--color-accent`) | preto `#0E0E0E` / `#F2F2F2` | verde-pinho `#1F6B57` / `#7CCFAF` |
| seleção (`--color-neutral`, `--selecao`) | preto/branco a 6% | véu do verde-pinho (11% / 14%) |
| anel de foco | azul `#2F6FC4` / `#6AAEF5` | o próprio destaque |
| fundo das dicas (`--color-background-inverted`) | padrão do Astryx (azulado) | `#16201B` / `#E9EEEA` |
| cantos | 5 / 8 / 12 px | 6 / 10 / 14 px |

Contrastes medidos (WCAG, conta em `docs/passos/07-visual.html`): destaque sobre
a página 5,7:1 (claro) e 10:1 (escuro); letra sobre o destaque 6,4:1 e 9,7:1;
dica 15,6:1 e 14,9:1; `--ok-texto` sobre a página nova 4,58:1 (passa, no limite).

O verde-pinho é mais escuro e mais azulado que o verde "ok" do semáforo
(`#45B866`): botão não se confunde com "está tudo bem".

### Ícones (`dashboard/src/shared/design-system/atoms/Icones.tsx`)

Um conjunto próprio, no mesmo traço do broto da marca: grade de 24, traço 1,6,
pontas e cantos redondos, `currentColor`. Cada ícone diz o que a página é:

| Página | Ícone |
| --- | --- |
| Agora | a estufa (arco) com o broto dentro |
| Histórico | seta voltando no tempo em volta de uma curva |
| Ciclo | a alface crescendo, da muda à cabeça |
| Dinheiro | a nota com uma folha |
| Agente × regras | a balança |
| Ajustes | controles deslizantes |
| Estufas lado a lado | quatro estufas |
| Treino e gerações (e o Resumo no celular) | a curva subindo, com os pontos das gerações |
| Modelo | a rede: entradas, camada do meio, saída |
| Gravações | play com a barra do tempo |
| Tema | sol e lua no mesmo traço |

Cada um tem a versão cheia (aba ativa no celular): o corpo é pintado e os
detalhes de dentro viram recorte na cor do fundo da barra.

**Por que SVG próprio e não uma biblioteca:** são 12 desenhos; uma dependência
nova para isso pesaria mais que o código. O traço fica igual ao do broto (que
já era nosso). Lucide não tem versão cheia; Phosphor tem, mas o traço difere do
broto.

## O que da 0002 continua

- Só componentes do Astryx; nada de shadcn, Tailwind ou cópia do Tesserato.
- O tema é a fonte única: `genesisTheme.ts` → `npm run tema` → `genesis.css`/`genesis.js`.
  Nada de sobrescrita em `:root`.
- Texto em preto/branco com opacidade (85/72/56/42%), Geist e Geist Mono, título de 28 px.
- O semáforo e as versões só para texto (`--ok-texto`, `--atencao-texto`).
- As cores de série (`--serie-*`) e os tempos de movimento.

## Como o tema foi mudado

O `AGENTS.md` do dashboard prefere o editor de tema experimental do Astryx. Ele
guarda o tema numa estrutura própria (`themes/<nome>/`) e, nesta versão, recusa
até perguntas (`editor how`) sem o pacote `@astryxdesign/theme-neutral`. Migrar
a estrutura e acrescentar uma dependência só para isso ficou fora do passo: a
mudança foi feita no `genesisTheme.ts`, que já é um tema do Astryx compilado
pelo CLI dele (`astryx theme build`), e conferida por capturas do app real nos
dois temas.

## Consequências

- Ícones de página e módulo saem de `atoms/Icones.tsx`; Heroicons ficam só para
  glifos de ação (baixar, editar, confirmar).
- Os ícones do PWA (`scripts/gerar-icones.mjs`) ainda usam o fundo cinza do
  Lightfield: em aberto.
