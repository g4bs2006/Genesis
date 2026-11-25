# Prompt: correções visuais do dashboard (rodada 1)

Prompt para o agente que vai fazer a primeira rodada de correções visuais do
dashboard do Genesis. Escrito em 25/11/2026 a partir do pedido do Gabriel.

---

## Quem você é e o que vai fazer

Você vai corrigir o visual do dashboard do Genesis (`dashboard/`, React 19 +
Vite + Astryx + visx). O trabalho tem **três etapas, nesta ordem**:

1. **Correções:** fazer as 7 mudanças da seção "O que mudar".
2. **Revisão visual por subagente:** quando as 7 estiverem prontas, lance um
   subagente (ferramenta Agent) só para olhar o resultado e listar problemas.
   Ele **não edita código**: tira capturas de tela e devolve uma lista.
3. **Segunda rodada:** corrija o que o subagente achou, rode as verificações
   de novo e documente.

## Leia antes de tudo

- `CLAUDE.md` (raiz): como trabalhar com o Gabriel. É a primeira vez dele com
  redes neurais e frontend desse porte: **explique cada passo**, defina termos
  técnicos na primeira vez, converse em português, passos pequenos.
- `.claude/rules/documentar-cada-passo.md`: todo passo vira página HTML em
  `docs/passos/`. Esta rodada é o passo **07** (`docs/passos/07-visual.html`,
  ou nome curto parecido) e entra no mesmo commit/PR.
- `dashboard/AGENTS.md`: regras do Astryx (sem `<div>`, tokens em vez de
  hex/px, tema pelo editor de tema, `astryx component <Nome>` antes de usar um
  componente).
- `docs/plano.md`, `docs/prompt-frontend.md` (como o dashboard foi pensado),
  `docs/decisoes/0001-graficos.md` e `docs/decisoes/0002-tema.md`.
- Capturas antigas em `docs/revisao-visual/fase-*/` servem de "antes".

## O que mudar

### 1. Barra lateral colapsável

- Arquivo: `dashboard/src/shared/design-system/templates/CascaDesktop.tsx`
  (usa `AppShell` + `SideNav` do Astryx).
- A barra precisa recolher para uma faixa só de ícones e voltar, com um botão
  visível no topo da barra. No modo recolhido, cada ícone mostra o nome no
  hover (tooltip) e continua acessível por teclado (`aria-label`).
- A escolha fica salva em `usePreferencias`
  (`dashboard/src/shared/stores/preferencias.ts`), como modo e tema.
- Os blocos extras da barra (`ListaEstufasLateral`, `CardTreinoLateral`,
  seletor de modo no rodapé) precisam ter uma forma recolhida que faça
  sentido ou sumir quando recolhida. Não podem quebrar o layout.
- Antes de escrever do zero, veja se o `SideNav`/`AppShell` já tem suporte a
  recolher (`npx astryx component SideNav`, `npx astryx component AppShell`).
  Se tiver, use.
- Celular não muda (lá a navegação é a barra de abas embaixo).

### 2. Trocar claro/escuro com um clique

- Hoje o tema só muda em Ajustes (`dashboard/src/app/PaginaAjustes.tsx`).
- Coloque um botão de alternar (ícone sol/lua) sempre à vista: no topo ou
  rodapé da barra lateral no desktop e na casca do celular
  (`CascaCelular.tsx`). Um clique alterna entre claro e escuro.
- Se o tema atual for "sistema", o primeiro clique vai para o oposto do que
  está sendo exibido. A opção "sistema" continua existindo em Ajustes.
- Reaproveite `trocarTema` e a transição que `PaginaAjustes` já usa
  (`trocarComTransicao`).

### 3. O "?" funcionando direito

- As dicas "o que é isso?" vêm de `OQueEIsso`
  (`dashboard/src/modules/glossario/presentation/OQueEIsso.tsx`) e da função
  `Termo` em `dashboard/src/app/composicoes/PaginaModelo.tsx`; as duas usam
  `InfoTip` do Astryx.
- O Gabriel diz que essa parte **não funciona corretamente**. Primeiro
  reproduza no navegador e descubra o defeito exato (não abre? abre e fecha?
  fica cortada pela borda do card ou da barra? não abre no toque do celular?
  não fecha? fica atrás de outro elemento?). Escreva o que achou antes de
  corrigir.
- Tem que funcionar com mouse (hover e clique), teclado (Tab + Enter/Espaço,
  Esc fecha) e toque no celular, nos dois temas, sem ser cortada.
- Corrija na causa, uma vez, no componente compartilhado. Junte `Termo` e
  `OQueEIsso` se fizer sentido (um jeito só de mostrar dica).
- Deixe um teste e2e (Playwright, `dashboard/e2e/`) abrindo e fechando uma
  dica.

### 4. Menos texto explicativo nas páginas

- As páginas têm parágrafos longos explicando o que se vê. Tire das páginas.
- Regra: a página mostra **dado e gráfico**; a explicação mora no "?" (item 3)
  e no glossário (`/glossario`). Fica no máximo um subtítulo de uma linha por
  página ou por card.
- Não apague o conteúdo didático: se um texto removido explica algo que não
  está no glossário (`dashboard/src/modules/glossario/domain/termos.ts`),
  mova para lá ou para um "?".
- Faça uma lista, página por página, do que saiu e para onde foi. Ela entra na
  página do passo 07.

### 5. Gráficos de linha em primeiro plano

- O objetivo é **acompanhar o projeto** (o treino e as estufas) olhando
  tendências no tempo. Os gráficos de linha passam a ser o centro das páginas
  de acompanhamento: Histórico, Ciclo, Agente × regras, Treino e gerações,
  Estufas lado a lado.
- Componentes que já existem: `GraficoSerie`, `CurvaAprendizado`,
  `CurvaCrescimento`, `Sparkline` em
  `dashboard/src/shared/design-system/graficos/`. Use e melhore esses, não
  crie biblioteca nova.
- Gráfico de linha bom aqui: maior (ocupa a largura), eixo com unidade, linha
  de referência quando existe (faixa ideal, regras fixas), dica com o valor
  exato ao passar o mouse, e legenda só quando há mais de uma linha.
- Onde hoje há números soltos ou barras que contam uma história no tempo,
  troque por linha. Onde a comparação é entre categorias, barra continua
  valendo.
- Antes de mexer em gráfico, leia a skill `dataviz` e
  `docs/decisoes/0001-graficos.md`.

### 6. Sair um pouco do Lightfield e refazer os ícones

- Hoje o tema segue a linguagem Lightfield do Tesserato
  (`dashboard/src/shared/design-system/tema/genesisTheme.ts`,
  `docs/decisoes/0002-tema.md`). O Gabriel quer **se afastar um pouco** dela:
  identidade própria do Genesis (estufa, alface, rede neural), sem jogar fora
  o que funciona (legibilidade, contraste, calma).
- Proponha a direção nova em poucas linhas e mostre ao Gabriel **antes** de
  aplicar em tudo (cores de destaque, cantos, densidade). Mudanças de tema vão
  pelo editor de tema do Astryx (ver `dashboard/AGENTS.md`), nunca por
  sobrescrita em `:root`.
- Ícones: hoje são Heroicons genéricos (`dashboard/src/app/navegacao.ts`:
  casinha, relógio, brilho, dinheiro...). Refaça os ícones das páginas e dos
  módulos para cada um dizer o que a página é no contexto do Genesis (ex.:
  Ciclo = alface crescendo, Modelo = rede, Gravações = reprodução,
  Treino = curva subindo). Use um conjunto só, com o mesmo traço e tamanho;
  pode ser SVG próprio em `shared/design-system/atoms/` ou outra biblioteca de
  ícones se o traço combinar melhor (justifique). Mantenha a versão cheia
  para a aba ativa no celular.
- Registre a decisão em `docs/decisoes/0006-visual-proprio.md`, dizendo o que
  da 0002 continua e o que muda.

### 7. Rede neural pequena ao lado da gravação

- Página: Gravações (`dashboard/src/app/composicoes/PaginaGravacoes.tsx`).
  Hoje ela reproduz as **ações gravadas** e a rede não roda ali.
- Coloque ao lado de cada gravação um diagrama **pequeno** da rede que mostre,
  no passo atual da reprodução, as entradas acesas, os caminhos mais fortes e
  as saídas (atuadores), para ver a decisão e o fluxo andando junto com o
  relógio.
- Peças que já existem:
  - `DiagramaRede` (`shared/design-system/graficos/DiagramaRede.tsx`): hoje
    tem largura mínima de 640 px e rótulos longos. Crie uma variante compacta
    (sem rótulos longos, poucos neurônios por camada visíveis ou camadas
    resumidas) em vez de copiar o componente.
  - `propagar`, `normalizarEntradas`, `ENTRADAS`, `SAIDAS`
    (`dashboard/src/modules/treino/domain/rede.ts`): calculam as ativações a
    partir do modelo e dos passos.
  - A gravação tem `modeloId`; o `Modelo` tem `arquitetura` e `pesos`
    (`docs/contrato-dados.md`).
- Atenção: o contrato diz que o dashboard **não recalcula a rede** porque GPU
  (float32) e navegador arredondam diferente. Então: **as ações mostradas
  continuam sendo as gravadas**; o diagrama recalculado é só ilustração do
  fluxo. Mostre isso com uma marca discreta e, se a saída recalculada divergir
  da ação gravada além de uma tolerância, sinalize no diagrama. Explique a
  escolha na página do passo.
- Com várias gravações lado a lado, cada uma tem seu mini-diagrama. Não pode
  travar a reprodução: meça (o relógio continua liso na velocidade máxima de
  `VELOCIDADES`) e, se precisar, atualize o diagrama em menos quadros que a
  animação.

## Como verificar

Rode em `dashboard/` antes de dizer que terminou, e de novo depois da segunda
rodada:

```
npm run typecheck
npm run lint
npm test
npm run e2e
npm run build
npx astryx doctor --built dist
```

Olhe no navegador (`npm run dev`, ou `npm run demo` para dados de exemplo) em
desktop e celular, claro e escuro. Teste que falha é falha: diga qual e com a
saída.

## Etapa 2: o subagente de revisão visual

Quando os 7 itens estiverem prontos e verificados, lance **um** subagente com
este pedido (ajuste os caminhos se mudarem):

> Você é revisor visual do dashboard do Genesis. Não edite código. Suba o app
> com `npm run demo` em `dashboard/` e, com o navegador (Playwright), tire
> capturas de todas as rotas dos modos Produtor e Desenvolvedor, em desktop
> (1440×900) e celular (375×812), claro e escuro, mais a barra lateral
> recolhida e aberta. Salve em `docs/revisao-visual/fase-13/`. Teste também:
> recolher a barra, o botão de tema, abrir e fechar três dicas "?" com mouse,
> teclado e toque, e uma gravação rodando na velocidade máxima com o
> mini-diagrama da rede. Devolva uma lista de problemas, um por linha, com
> rota, tamanho de tela, tema, o que está errado, a captura e a gravidade
> (alta: quebra ou ilegível; média: feio ou confuso; baixa: detalhe). Procure
> em especial: texto cortado ou sobreposto, contraste baixo, dica cortada,
> ícone desalinhado ou de traço diferente, gráfico sem unidade ou com eixo
> ilegível, rolagem horizontal no celular, texto explicativo longo que
> sobrou, travadas na reprodução.

## Etapa 3: segunda rodada

Corrija os problemas de gravidade alta e média. Os de baixa, corrija se forem
rápidos; os que ficarem vão para "Em aberto" na página do passo. Rode as
verificações de novo.

## Regras

- Trabalhe num branch próprio a partir de `main` (ex.:
  `dashboard-correcoes-visuais`). Commit e PR só quando o Gabriel pedir.
- Comentários no código explicam o porquê, em português.
- Mudanças pequenas e que rodam: depois de cada item, mostre ao Gabriel o que
  mudou (captura ou descrição curta) antes de passar ao próximo.
- Não mexa no treino (`treino/`, `controle/`) nem no contrato de dados.
- Se um item exigir uma escolha que é do Gabriel (direção visual do item 6,
  biblioteca de ícones nova, mudar o contrato de dados), pergunte.

## O que entregar

- Os 7 itens feitos e verificados, mais a segunda rodada.
- `docs/passos/07-visual.html` (e o item em `docs/passos/index.html`), com
  antes e depois em captura, a lista de textos removidos e para onde foram, o
  defeito do "?" e a causa, a decisão do visual e dos ícones, e como o
  mini-diagrama lida com a diferença GPU × navegador.
- `docs/decisoes/0006-visual-proprio.md`.
- Capturas em `docs/revisao-visual/fase-13/`.
