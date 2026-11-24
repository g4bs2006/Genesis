# Prompt: frontend do Genesis

> Cole este arquivo inteiro como primeira mensagem de uma sessão nova do Claude
> Code aberta no repositório `g4bs2006/Genesis`. Escrito em 2026-11-23, a partir
> da conversa em que o Gabriel aprovou os rascunhos das telas.

---

Você vai construir **todo o frontend do Genesis**, fase por fase. Este prompt
descreve o app inteiro, mesmo as partes que não serão feitas agora. Siga as
fases na ordem, pare nos pontos de aprovação e **não faça nada de backend**: o
backend (simulador em PyTorch, treino, banco, MQTT) é feito por outra frente.
O frontend fala com ele só por **contratos de dados** (seção 5), e até o
backend existir, por **fontes falsas** que você mesmo vai criar.

## 1. Antes de qualquer coisa

1. Leia, nesta ordem: `CLAUDE.md`, `docs/plano.md`, `estudo/README.md`. O plano
   explica o projeto (agente com rede neural controlando uma estufa hidropônica
   de alface, treinado por neuroevolução com currículo de 6 fases).
2. Base do trabalho: a branch `main`. Se ela ainda não tiver o `docs/plano.md`
   com a seção "A rede neural", use a branch `ccr-ab68ab61-y3zm9a`, que tem tudo
   o que foi conversado.
3. Todo o código do frontend fica em `dashboard/` (ver "Organização proposta" no
   plano). Não mexa em `estudo/`, `simulador/`, `treino/` nem `controle/`.

## 2. Como trabalhar com o Gabriel (obrigatório)

É a primeira vez do Gabriel num projeto assim. O `CLAUDE.md` do repositório
manda e vale para você:

- **Explique cada passo** antes ou junto com o código: o que está fazendo, por
  que, e onde se encaixa. Defina termo técnico na primeira vez que aparece
  (componente, hook, Web Worker, token, PWA…), em português simples.
- Passos pequenos que dê para rodar e ver. Nada de entregar uma fase inteira de
  uma vez sem mostrar nada no caminho.
- Comentários no código explicam o **porquê**.
- Converse em português. Código: domínio em português (`leituraAtual`,
  `estufas`), termos técnicos em inglês só quando não há tradução natural.
- No fim de cada fase, a descrição do PR tem uma seção **"Para o Gabriel"**: o
  que foi feito, por quê, como rodar, o que olhar na tela e o que aprender ali.

## 3. Economia de tokens e subagentes

O objetivo é gastar o mínimo de tokens sem perder qualidade. **Antes de começar
cada fase, decida se ela compensa ser feita por um subagente**, e escreva a
decisão em uma linha no começo do seu trabalho na fase (e no PR).

**Delegue a um subagente quando:**

- a fase (ou um pedaço dela) é **autocontida**, com entrada e critério de
  pronto claros: portar o simulador de `estudo/rede-da-estufa.html` para um
  Web Worker, gerar os dados de exemplo, escrever testes do domínio;
- o trabalho gera **muito material intermediário que você não precisa ver**:
  varrer a documentação do Astryx, procurar um componente, rodar e corrigir uma
  bateria de testes;
- dá para rodar **em paralelo** com o que você está fazendo, **sem tocar nos
  mesmos arquivos**.

**Faça você mesmo quando:**

- a fase depende de decisões de design ou de contexto acumulado nesta conversa
  (telas, alface, ajustes que o Gabriel pediu);
- é pequena: se escrever o briefing custa quase o mesmo que fazer, faça;
- precisa de idas e voltas com o Gabriel.

**Regras do briefing:** o subagente começa do zero. Mande o mínimo necessário:
objetivo, caminhos de arquivo, contrato (tipos), critério de pronto e "devolva
um resumo de no máximo 10 linhas". Para pesquisa, prefira um agente só de
leitura (Explore). Nunca dois subagentes no mesmo arquivo.

**Economia no seu próprio trabalho:**

- Leia só o trecho que precisa. Não releia arquivo que acabou de editar.
- Para o Astryx, use a CLI e os docs dele (`astryx docs …`, `AGENTS.md` gerado
  pelo `astryx init`) em vez de ler o código-fonte do pacote.
- Diffs pequenos. Componentes reaproveitáveis em vez de copiar e colar telas.
- Uma olhada no navegador por tela (Playwright, captura em claro e escuro,
  desktop e celular) na revisão visual da fase, não a cada edição.

## 4. Stack e identidade visual

### Stack

| Camada | Escolha |
| --- | --- |
| Base | React 19 + TypeScript estrito + Vite |
| Componentes | **Astryx** (`@astryxdesign/core`), https://github.com/meta/astryx · docs https://astryx.atmeta.com |
| Visual | **Linguagem Lightfield do Tesserato**, aplicada como **tema do Astryx** (um tema do Astryx é um conjunto de variáveis CSS) |
| Gráficos | decidir na Fase 0 (ver lá) |
| Estado e dados | React Query para leituras assíncronas, Zustand para estado de tela, Zod nos contratos |
| App | PWA instalável (celular e desktop) |
| Testes | Vitest (domínio sempre testado), Playwright (fluxos e capturas) |

**Do Tesserato, reaproveite:** a arquitetura (monolito modular + clean
architecture, módulos com `domain/application/infrastructure/presentation` e
`index.ts` como API pública, regras de import travadas no ESLint), o PWA, o
modo demo, os tokens e as convenções (Conventional Commits em português, revisão
visual antes do merge). O Tesserato está em
`C:\Users\gabriel.silva\Desktop\Tesserato` no PC do Gabriel e no GitHub como
`g4bs2006/Tesserato` (privado). Arquivos de referência: `CLAUDE.md`,
`docs/decisoes/0001-arquitetura.md`, `docs/decisoes/0005-design-system.md` e
`src/shared/design-system/styles/globals.css`.

**Do Tesserato, NÃO reaproveite:** os componentes shadcn/Tailwind. O Genesis usa
os componentes do Astryx. Misturar os dois sistemas é proibido.

### Linguagem Lightfield (tokens)

Copie os tokens de `globals.css` do Tesserato, claro e escuro, e mapeie-os para
as variáveis do tema do Astryx:

- Superfícies: página `#F5F5F5`, painel `#F9F9F9`, card branco com borda preta
  a 12%. Raios de 5, 8 e 12px.
- Texto: preto em quatro opacidades (85/72/56/42%). Para texto pequeno, nunca
  abaixo de 56%, por contraste.
- **Cor só onde informa.** Semáforo: ok `#45B866`, atenção `#E2B23B`, risco
  `#E5534B` (texto de risco `#B8322B`).
- Cores de série (estufas e controladores nos gráficos): a paleta fixa de cores
  do Tesserato (azul `#4B9CF2`, verde `#45B866`, amarelo `#E2B23B`, roxo
  `#8B6FF0`, laranja `#EE8B45`, menta `#3FB8A8`, cinza `#8E8E93`). Nenhum hex
  solto em componente: tudo por token.
- Fontes: Geist para texto, Geist Mono para números, horários e rótulos de dado
  (algarismos tabulares).
- Celular: alvo de toque ≥ 44px, título de 28px, respeitar `safe-area`.
- Tema claro e escuro, os dois cuidados.

### Referências visuais

| Referência | O que tirar dela |
| --- | --- |
| Rascunho aprovado das telas: https://claude.ai/artifact/MZPxB5zyNEVtBGEazqw7p7 | Layout, hierarquia e conteúdo de 6 telas. É a referência principal. Leia com a ferramenta Artifact se tiver; se não, a seção 6 descreve tudo |
| Rede da Estufa: https://claude.ai/artifact/8djSdhjmXKEQiUa5SC6Uak e `estudo/rede-da-estufa.html` | O diagrama da rede neural (neurônios coloridos pelo valor, linhas pela força do sinal), o simulador de brinquedo em JS e o treino no navegador |
| Referência visual do Tesserato: https://claude.ai/artifact/N2MucgJECkk1PYFCvr4833 | A linguagem Lightfield aplicada a um app real |
| Lightfield (o app) | A inspiração original do Tesserato: calma, cinzas, cor contida |

Os artifacts são privados do Gabriel. Se você não conseguir abri-los, siga a
seção 6 e peça capturas a ele.

**A alface do rascunho foi reprovada.** Ela é feita de elipses e parece balão.
Não copie. A Fase 2 explica o que fazer.

## 5. Contratos de dados (o que o backend vai entregar)

O frontend nunca sabe se os dados vêm do simulador, do treino ou da estufa real.
Tudo passa por **portas** (interfaces em `application/`) com **adaptadores**
trocáveis (em `infrastructure/`). Só a raiz de composição (`app/dependencias.ts`)
escolhe o adaptador.

Adaptadores que você vai fazer agora:

1. **`dadosExemplo`**: dados fixos em JSON, coerentes entre si (os números do
   rascunho servem de base). Usados no modo demo e nos testes.
2. **`simuladorBrinquedo`**: a estufa de brinquedo de `estudo/rede-da-estufa.html`
   (temperatura, exaustor, nebulização, rede de 146 pesos, evolução), portada
   para TypeScript e rodando num **Web Worker** (para não travar a tela). Ela
   alimenta as telas "ao vivo" e o treino no navegador até o backend existir.
   Nas variáveis que ela não simula (pH, EC, água…), use valores de exemplo
   marcados como tal.

Adaptadores reais (Supabase Realtime, arquivos do treino, MQTT) ficam para
quando o backend existir: **deixe só a porta**.

Os tipos abaixo são uma **proposta de contrato**: escreva-os com Zod em
`domain/`, documente em `docs/contrato-dados.md` e avise o Gabriel de que o
backend vai precisar segui-los (ou combinar mudanças).

```ts
// Uma leitura de sensores (o que ler_sensores() devolve no plano)
type Leitura = {
  estufaId: string; instante: string;               // ISO, fuso America/Sao_Paulo
  ar: { temperatura: number; umidade: number; vpd: number; co2: number; luz: number };
  solucao: { ph: number; ec: number; temperaturaAgua: number; nivel: number };
  fora: { temperatura: number; umidade: number; radiacao: number };
  tarifaKwh: number;
};
// O que o agente decidiu (acionar(acoes))
type Acoes = {
  exaustor: number; nebulizacao: number; sombreamento: number; luz: number;   // 0..1
  dosagemAB: number; dosagemAcido: number;                                  // ml no passo
  reposicaoAgua: boolean; bomba: boolean;
};
type Passo = { leitura: Leitura; acoes: Acoes; barradas: AcaoBarrada[] };
type AcaoBarrada = { atuador: keyof Acoes; pedido: number; motivo: string }; // camada de segurança

type Estufa = { id: string; nome: string; origem: 'simulada' | 'real'; controlador: Controlador;
                plantas: number; diaDoCiclo: number; diasDoCiclo: number; massaPorPe: number };
type Controlador =
  | { tipo: 'agente'; modeloId: string }
  | { tipo: 'regras' } | { tipo: 'pid' } | { tipo: 'nada' };

// Eventos para "o que acertou ou errou"
type Evento = { estufaId: string; instante: string;
  tipo: 'acerto' | 'erro' | 'barrado' | 'perturbacao';
  titulo: string; detalhe: string; variavel?: string; passo?: number };

// Treino
type Geracao = { numero: number; fase: 1|2|3|4|5|6; melhor: number; mediana: number;
                 regras: number; segundos: number };                         // notas em R$ por ciclo
type Modelo = { id: string; geracao: number; fase: number;
                arquitetura: number[];                                        // ex.: [20, 32, 32, 8]
                pesos: number[]; provaPorFase: Record<number, number> };    // 0..1, para o "esqueceu?"
type Gravacao = { id: string; semente: number; modeloId: string; passos: Passo[] }; // reprodução fiel

// Dinheiro
type Precos = { alfacePorPe: { baixo: number; medio: number; alto: number };
                tarifaKwh: number; nutrientePorKg: number; acidoPorL: number;
                aguaPorM3: number; mudaPorUnidade: number; fixosPorCiclo: number };
```

## 6. As telas

São **um app só**, com dois modos (**Produtor** e **Desenvolvedor**, trocados
por um seletor no rodapé da barra lateral) e três tamanhos (**celular**,
**desktop** e **visor**). O celular mostra só o crucial, o desktop mostra os
gráficos, e o visor é uma tela fixa na estufa.

Linguagem: quem usa o modo Produtor pode ser um produtor rural ou a banca do
TCC. Frases curtas, sem jargão, e jargão inevitável (VPD, EC) sempre
acompanhado de explicação ("VPD 0,9 kPa · a sede do ar").

### Produtor · celular (rascunho: "Produtor · celular · Agora")

Barra de abas embaixo: **Agora, Ciclo, Dinheiro, Ajustes**.

- **Agora:**
  - cabeçalho com o nome da estufa, o selo "simulada" e a hora;
  - **frase de estado** de 28px ("Quase tudo na faixa") e uma linha de apoio ("O agente está no controle. 1 ponto pede atenção.");
  - card da **alface** com dia do ciclo, barra de progresso, massa por pé contra a meta e data prevista da colheita;
  - grade 2×2 com **Ar, pH, Nutrientes (EC) e Água**: valor, faixa e bolinha de estado, com a borda em amarelo se pede atenção;
  - **alerta** em linguagem humana, dizendo o que o agente já fez;
  - lucro previsto do ciclo.
- **Ciclo:** a alface por dia (linha do tempo dos estágios), a curva de crescimento estimada e o histórico de alertas.
- **Dinheiro:** a versão curta do Lucro × gasto (abaixo).
- **Ajustes:** preços, estufa, tema, instalar o app.

### Produtor · desktop (rascunho: "Produtor · desktop · Painel")

Barra lateral: **Agora, Histórico, Ciclo, Dinheiro, Agente × regras**, a lista de estufas e, no rodapé, o seletor Produtor | Desenvolvedor.

- **Agora:**
  - à esquerda, o card da alface com massa, meta, colheita e a curva de crescimento: linha cheia até hoje, tracejada até o dia 35;
  - à direita, 8 cards de variável (ar, umidade/VPD, CO₂, luz, pH, EC, água, reservatório), cada um com valor, sparkline de 24 h em cinza (colorida só se fora do normal) e faixa;
  - embaixo dos cards, o alerta explicado;
  - **Últimas 24 horas:** gráfico com abas (Temperatura · pH e EC · Água · Luz e CO₂), a faixa boa sombreada, a linha de dentro, a de fora tracejada e, embaixo, faixas com **as ações do agente** (exaustor, nebulização, doses como pontos);
  - **Agente × regras fixas:** a mesma estufa e o mesmo clima, numa tabela de massa, energia, água, tempo fora da faixa e resultado em R$, com a frase-resumo ("O agente rende R$ 46 a mais por ciclo").
- **Histórico:** o gráfico de 24 h em escala maior, com intervalo escolhível (dia, semana, ciclo) e exportação de CSV.
- **Ciclo:** a alface estágio por estágio, a curva de crescimento e a colheita prevista.
- **Dinheiro:** Lucro × gasto completo:
  - barra empilhada dos custos (energia, nutrientes, água, mudas, fixos) e do lucro;
  - cenários de preço baixo, médio e alto;
  - ponto de equilíbrio;
  - valores por ciclo, mês e ano;
  - botão **Editar preços**, que abre o formulário de `Precos`.

  Fontes de preço: CEAGESP / Conab Prohort para a alface, ANEEL para a tarifa. As contas ficam no `domain`, com testes.
- **Agente × regras:** comparação detalhada, ciclo a ciclo.

Em todo o modo Produtor, um selo "estufa simulada · dados de exemplo" enquanto os dados não forem reais.

### Visor (rascunho: "Visor · tela fixa na estufa")

Rota `/visor`, tela cheia, **escura**, para TV ou tablet na estufa, lida de longe e sem toque.

- No topo, a estufa, o dia do ciclo, "colheita em N dias" e a hora grande.
- À esquerda, a alface grande e a massa por pé.
- À direita, 4 cards grandes (Ar, pH, EC, Água) e a barra do reservatório.
- Embaixo, a faixa de alerta.

Comportamento:
- usa *wake lock* (a tela não apaga);
- reconecta sozinho;
- mostra a hora da última leitura se os dados pararem de chegar;
- não tem nenhum controle.

### Alface (rascunho: "Alface · estágios e estados", só a ideia, não o desenho)

A alface é **desenhada a partir do estado**:
- o tamanho vem da massa;
- a cor e a postura vêm das variáveis (saudável; calor ou ar seco: murcha e opaca; falta de nutriente: amarelando de fora para dentro; pH fora ou solução parada: bordas queimadas).

Ver Fase 2.

### Desenvolvedor · Estufas lado a lado (rascunho: "Desenvolvedor · Estufas lado a lado")

Barra lateral do modo Desenvolvedor: **Estufas lado a lado, Treino e gerações, Modelo, Gravações**, o card "Treino rodando" (onde, fase e geração) e o seletor de modo.

- **Cabeçalho:** "o mesmo clima para todos" (semente, estação do INMET, dia), escolher o clima, **+ Estufa** e **Rodar ciclo acelerado**.
- **Cards de estufa** (campeão da fase 6, campeão da fase 3, PID, regras fixas…): posição no ranking, alface pequena, resultado em R$, massa, energia, % fora da faixa e ações barradas pela segurança.
- **Onde cada um erra:** mapa de calor de % do tempo fora da faixa por variável e por controlador.
- **Injetar perturbação:** onda de calor, sensor de pH descalibra, bomba trava, queda de energia, ruído nos sensores, tarifa de pico. A perturbação acontece em todas as estufas no mesmo instante e vira `Evento`.
- **Gráfico comparado** de uma variável nas N estufas. Arrastar no gráfico move o instante, e todas as alfaces mudam junto.

### Desenvolvedor · Treino e gerações (rascunho: "Desenvolvedor · Treino e gerações")

- **Números do topo:** geração, segundos por geração, tempo rodando e melhor nota.
- **Currículo:** 6 cards de fase (feita ✓ com o intervalo de gerações, a atual em destaque com o critério de passagem, as futuras tracejadas).
- **Curva de aprendizado:**
  - melhor rede e rede mediana por geração, linha das regras fixas;
  - faixas de fundo marcando cada fase;
  - uma frase explicando que a queda ao entrar numa fase é esperada.
- **"Ele esqueceu algo?"** O campeão atual refaz a prova de cada fase anterior (barras em %), com alerta abaixo de 90% e sugestão (por exemplo, aumentar a mistura de cenários daquela fase).
- **Comparar gerações:** duas gerações escolhidas e as métricas lado a lado, com um link para vê-las em Estufas lado a lado.
- **Configuração do treino** (só leitura): população, elite, torneio, mutação, mistura de fases, arquitetura e passo do simulador, cada um com "o que é isso?".

### Desenvolvedor · Modelo (sem rascunho; siga esta descrição)

- **Seletor de modelo:** o campeão de cada fase (Fase 1 · g 140 … Fase 4 · g 812).
- **A rede por dentro:** o diagrama no estilo da Rede da Estufa, para a arquitetura real (ex.: 20→32→32→8):
  - entradas agrupadas (ar, solução, fora, tempo, tarifa, tendência) e as 8 saídas com nome;
  - neurônios coloridos pelo valor e linhas pela força do sinal no instante escolhido;
  - modos "seguir a estufa" e "mexer nas entradas".
- **O que mais pesou nesta decisão:** a contribuição de cada entrada para a ação escolhida (atribuição simples: gradiente × entrada, ou perturbar uma entrada e ver a saída), como barras positivas e negativas.
- **Acertos e erros:** linha do tempo de `Evento`s com selo por tipo (acerto, erro, barrado, perturbação), filtros e "ver no replay". Exemplos:
  - "Abriu o sombreamento 40 min antes das regras";
  - "Ar a 27,1 °C por 20 min";
  - "Tentou dosar ácido com pH real 5,6: a segurança barrou";
  - "Adiou a reposição de água para depois do horário de pico".
- **Como lidou com cada perturbação:** tabela com a perturbação, o que o agente fez e o resultado comparado às regras. Fases ainda não treinadas aparecem como tal ("ainda não treinado para isto"), sem esconder os erros.

### Desenvolvedor · Gravações

- Lista de gravações (semente, modelo, data).
- **Reprodução acelerada** de um ciclo a partir das ações gravadas (não recalcula a rede: o plano explica que a GPU e o navegador arredondam diferente).
- Até 4 gravações lado a lado (campeões de gerações diferentes, agente × regras), com a alface crescendo, os medidores mexendo e os atuadores ligando.
- Velocidade, pular para um evento e copiar o link de um instante.

### Desenvolvedor · celular

Só o resumo: o treino está rodando? Em que fase e geração? Melhor nota, último evento importante. Nada de gráfico grande.

### Didática na própria interface

Todo número técnico tem um **"o que é isso?"** (ícone ⓘ com explicação de 2 ou 3 linhas). Um glossário central (VPD, EC, pH, elitismo, mutação, geração, fase, PID…) alimenta esses textos. O modo Desenvolvedor tem um tour curto na primeira visita.

## 7. Fases

Cada fase: **issue → branch → PR que fecha a issue**, Conventional Commits em
português, `typecheck + lint + test + build` passando, e **revisão visual**
(capturas em desktop e celular, claro e escuro, anexadas ao PR) nas fases com
tela. Pare onde está escrito **APROVAÇÃO**: mostre ao Gabriel e espere.

Prioridade: **agora** = fazer já; **depois** = fazer quando o Gabriel pedir
(o prompt descreve para você já desenhar a arquitetura pensando nelas).

| Fase | Entrega | Prioridade | Subagente? (sugestão; decida você) |
| --- | --- | --- | --- |
| 0 | Fundação | agora | Não: decisões de base. Pesquisa nos docs do Astryx pode ir para um Explore |
| 1 | Contratos e fontes falsas | agora | Sim, em dois: portar o simulador para Worker; gerar dados de exemplo e testes |
| 2 | A alface | agora | Não: exige iteração visual com o Gabriel |
| 3 | Produtor · celular | agora | Não |
| 4 | Produtor · desktop | agora | Não; os gráficos repetitivos podem ir para um subagente depois do primeiro pronto |
| 5 | Dinheiro | agora | Sim para o domínio (contas e testes); você faz a tela |
| 6 | Visor | agora | Sim: tela autocontida em cima dos componentes já prontos |
| 7 | Dev · Estufas lado a lado | agora | Não |
| 8 | Dev · Treino e gerações | depois | Avaliar |
| 9 | Dev · Modelo | depois | Avaliar; o diagrama da rede é bom candidato |
| 10 | Dev · Gravações | depois | Avaliar |
| 11 | Didática na interface | depois | Sim para o glossário (texto); você faz os componentes |
| 12 | Polimento | depois | Sim para auditorias (acessibilidade, desempenho) |

### Fase 0: Fundação

1. Criar `dashboard/` com Vite + React 19 + TypeScript estrito.
2. Instalar o Astryx e rodar `npx @astryxdesign/cli init`. Criar o **tema
   Genesis** com os tokens da seção 4, claro e escuro. Fontes Geist e Geist Mono.
3. Arquitetura do Tesserato: `src/app`, `src/modules/<modulo>`, `src/shared`,
   regras de import no ESLint. Módulos iniciais: `estufa`, `treino`, `dinheiro`,
   `alface`, `glossario`.
4. Rotas e moldura:
   - casca do celular com abas;
   - casca do desktop com barra lateral;
   - casca do visor;
   - o seletor de modo Produtor | Desenvolvedor.
5. PWA, modo demo (`npm run demo` abre com `dadosExemplo`), Vitest, Playwright
   e CI no GitHub Actions.
6. **Decisão dos gráficos (pequeno teste):** experimente `@astryxdesign/charts`
   (só existe em versão canary, ainda não estável). Se ele fizer uma linha com
   faixa sombreada, sparkline e eixo de tempo sem brigar, use. Senão, escolha
   uma biblioteca estável (visx é a candidata natural por ser de baixo nível e
   aceitar os tokens). Registre a escolha em `docs/decisoes/0001-graficos.md`,
   no formato das decisões do Tesserato.
7. **APROVAÇÃO:** mostre a moldura rodando (celular, desktop e visor, claro e
   escuro) e a decisão dos gráficos.

### Fase 1: Contratos e fontes falsas

1. Tipos da seção 5 com Zod, `docs/contrato-dados.md`.
2. Portas: `FonteEstufa` (assinar leituras, histórico, eventos), `FonteTreino`,
   `FonteGravacoes`, `RepositorioPrecos`.
3. `dadosExemplo`: JSON coerente com o rascunho (estufa no dia 23 de 35, 182 g,
   4 controladores, 812 gerações em 4 fases, eventos de exemplo).
4. `simuladorBrinquedo`: porte do núcleo de `estudo/rede-da-estufa.html` para
   TypeScript num Web Worker, com relógio controlável (pausar, acelerar, pular).
   Teste: o campeão embutido tira nota média melhor que as regras fixas em 20
   climas (no estudo: -5 contra -49).
5. **APROVAÇÃO** curta: explique ao Gabriel o contrato, porque o backend vai
   ter que segui-lo.

### Fase 2: A alface

A do rascunho foi reprovada. Elipses giradas parecem balões e folhas de árvore,
sem nada de alface. O que se quer:

- **Alface crespa verde** (a mais comum na hidroponia NFT no Brasil), vista de
  lado em 3/4, saindo do perfil NFT: um cano retangular branco com o furo e o
  copinho, e raízes aparecendo na lâmina de água quando fizer sentido.
- **Folhas de verdade:**
  - cada folha é um caminho com nervura central clara e larga na base, que afina até a ponta;
  - **borda franzida** (ondulada, crespa), com o franzido mais forte perto da ponta;
  - degradê da base (verde-claro amarelado) para a ponta (verde mais escuro);
  - nervuras secundárias finas;
  - sombra leve onde uma folha cobre a outra.
- **Disposição em roseta:** folhas externas maiores, mais abertas e mais
  escuras; internas menores, claras e fechadas formando o miolo. Ângulos pela
  filotaxia (ângulo áureo, ~137,5°) com pequena variação aleatória.
- **Determinística:** a mesma semente gera sempre a mesma alface; estufas
  diferentes podem ter sementes diferentes.
- **Parâmetros:** `massa` (g) → número de folhas e escala; `turgor` (0–1) →
  folhas eretas ou murchas e caídas (calor, VPD alto, falta de água);
  `clorose` (0–1) → amarelamento, das folhas velhas (de fora) para dentro (EC
  baixa); `necrose` (0–1) → bordas queimadas (pH fora, salinidade, solução
  parada). As transições entre estados são suaves e respeitam
  `prefers-reduced-motion`. Fica bonita no tema claro e no escuro.
- **Como fazer:** uma função pura `gerarAlface(parametros, semente)` que
  devolve a descrição das formas (caminhos SVG, cores), testada no Vitest (mesma
  entrada, mesma saída), e um componente que só desenha. Uma página de
  laboratório `/laboratorio/alface` com controles deslizantes para cada
  parâmetro, mostrando a grade de estágios (dias 5, 12, 20, 28, 35) e os
  quatro estados.
- **Plano B:** se o procedural não chegar a uma alface convincente num esforço
  razoável (duas ou três rodadas com o Gabriel), proponha folhas desenhadas à
  mão em SVG (6 a 8 formas de folha base) montadas e coloridas pelo mesmo
  `gerarAlface`. Avise antes de mudar de caminho.
- **APROVAÇÃO** obrigatória: nenhuma tela usa a alface antes de o Gabriel aprovar
  o laboratório.

### Fases 3 a 7

Construa cada tela como descrito na seção 6, na ordem da tabela, reaproveitando
componentes: card de variável, sparkline, gráfico de série com faixa e ações,
card de alerta, card de estufa, alface, selo de estado. Cada componente novo
entra no design system (`shared/design-system`) com a variante clara e a
escura. Faça a primeira tela de cada fase, mostre, e só então siga.
**APROVAÇÃO** no fim de cada fase.

### Fases 8 a 12

Só quando o Gabriel pedir. Siga a seção 6. Na Fase 9, reaproveite o diagrama da
Rede da Estufa, mas generalizado para qualquer `arquitetura`.

## 8. O que NÃO fazer

- Nada de backend: nada de PyTorch, treino, banco real, autenticação, MQTT ou
  ESP32. Só as portas e os adaptadores falsos.
- Não usar shadcn/Tailwind nem copiar componentes do Tesserato.
- Não copiar a alface do rascunho.
- Não inventar dado apresentado como real: tudo o que for exemplo leva o selo
  "dados de exemplo".
- Não pular as aprovações.
