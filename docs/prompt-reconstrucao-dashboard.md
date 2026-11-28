# Prompt: reconstrução do dashboard com dados reais (rodada 2)

Escrito em 25/11/2026 a partir da revisão do Gabriel, tela por tela. Para usar
com `/goal`: o agente trabalha sozinho até cumprir todas as fases.

---

## Objetivo

Deixar o dashboard do Genesis **mostrando só dado real** e **organizado pelo
que cada pessoa precisa**:

- **Produtor:** quem cultiva. Pensar no **pequeno produtor de alface
  hidropônica**: o que ele acompanha no dia a dia e o que hoje ele faz em
  planilha. Ele não sabe o que é "agente", "regras fixas" ou "geração".
- **Desenvolvedor:** quem treina a rede. Ele quer ver o que o modelo aprendeu,
  comparar gerações e escolher o que o produtor vê.

Por enquanto não existe login: produtor e desenvolvedor são a mesma pessoa, e
o uso é teórico e para **apresentação pública** do projeto. Ainda não existe
estufa real. O "ao vivo" do Produtor passa a ser a **reprodução de uma
gravação real do treino** (um campeão cultivando 35 dias), escolhida pelo
Desenvolvedor.

O foco do projeto continua sendo o treino. Você tem autonomia para mexer no
dashboard, no exportador do treino, no contrato de dados e no banco (dentro
das permissões abaixo), e deve **ir até o deploy em produção**.

## Leia antes

- `CLAUDE.md` (raiz) e `.claude/rules/documentar-cada-passo.md`: explicar ao
  Gabriel, português, e **uma página HTML por passo** em `docs/passos/`.
- `dashboard/AGENTS.md` (regras do Astryx), `dashboard/README.md`.
- `docs/plano.md`, `docs/contrato-dados.md`, `docs/nuvem.md`.
- `docs/decisoes/0006-visual-proprio.md` e `docs/passos/07-visual.html` (a
  rodada visual anterior).
- `dashboard/src/app/dependencias.ts`: o único lugar que escolhe de onde vêm
  os dados (portas e adaptadores).

## O que o Gabriel decidiu (não reabra)

**Regras para o app inteiro**
- Os dois modos (Produtor e Desenvolvedor) **ficam**.
- **Sai:** todos os "?" (InfoTip, `OQueEIsso`, `Termo`), o módulo e a página
  do Glossário, o bloco Currículo, "Ele esqueceu algo?", "Injetar
  perturbação", "Como lidou com a perturbação" e qualquer tela de algo que só
  vai existir no futuro.
- **Sem espaço vazio na horizontal:** cards e grades ocupam a largura toda do
  conteúdo. Nada de card de largura fixa com a direita vazia.
- **Foco padrão do navegador:** tire o anel de foco verde e arredondado dos
  itens (barra lateral e o resto). Use o `outline` padrão do navegador. O
  foco continua visível, por acessibilidade.
- **Nenhum número inventado na tela.** O simulador de brinquedo
  (`modules/estufa/infrastructure/simuladorBrinquedo/`) é **apagado**. Os
  dados de exemplo (`dadosExemplo/`) só ficam se forem fixture de teste ou do
  `npm run demo`. Nesse caso, gere-os a partir de uma gravação real (recorte
  pequeno), não à mão.

**Produtor**
- **Agora:** está ótimo, **não mude**: a alface, o dia do ciclo, os cards de
  umidade, CO₂, luz, pH, nutrientes, água e reservatório, os alertas e o lucro
  previsto do ciclo. Mudanças só estas:
  - tirar o bloco **Agente × regras fixas** e pôr no lugar algo útil ao
    produtor (proposta: quantos dias faltam para colher e o peso esperado por
    pé, ou o gasto de energia e água do dia; escolha uma e justifique);
  - **Últimas 24 horas:** gráficos maiores. pH e EC não podem ficar
    espremidos: eixo com escala da faixa boa e folga, não de 0 ao máximo. E
    mostre **o que está acontecendo**: marcas no gráfico quando o exaustor, a
    névoa, a sombra ou a luz ligam e desligam (as ações estão na gravação);
  - os dados vêm da gravação escolhida pelo Desenvolvedor, reproduzida
    acelerada do dia 0 ao fim, em ciclo, com o relógio da reprodução. Para a
    apresentação, ela fica andando; deixe pausar.
- **Histórico:** hoje repete as últimas 24 h num gráfico maior. Passa a ser
  **o ciclo inteiro com filtro de período** (hoje, esta semana, um intervalo
  de dias, o ciclo todo), e recebe o **histórico de alertas** que hoje está em
  Ciclo. A exportação CSV continua.
- **Ciclo:** fica só **a alface dia a dia** e a **curva de crescimento
  estimada** (gramas por pé). O histórico de alertas sai daqui.
- **Dinheiro:** repaginar. Hoje nem o Gabriel entende "R$ 35 por ciclo, R$ 30
  por mês, R$ 365 por ano, venda de R$ 233 − gastos de R$ 198, margem de
  15%". A pergunta que guia: **o que o pequeno produtor faz hoje em planilha
  que o app pode fazer por ele?** Mínimo esperado:
  - a conta do ciclo em linguagem simples, de cima para baixo: quantos pés,
    quanto pesam, por quanto vende, quanto entra; cada gasto em linha própria
    (energia em kWh × tarifa, adubo, água, mudas, embalagem se houver); o que
    sobra. Cada número diz de onde veio;
  - o ponto de equilíbrio numa frase ("abaixo de R$ 1,70 o pé, você perde
    dinheiro");
  - os **preços editáveis** saem de Ajustes e vêm para cá;
  - **lançamentos reais**: o produtor registra vendas e gastos de verdade e
    vê previsto × real no ciclo. Salve no navegador (sem login ainda), com
    exportar CSV.
  Antes de desenhar, pesquise (fontes citadas na página do passo) o que
  pequenos produtores de hidroponia controlam em planilha.
- **Agente × regras:** a página **sai do Produtor**.
- **Ajustes:** vira uma página simples dizendo que os ajustes vão chegar
  aqui. Saem de lá: instalar app, modo, tema (tem o botão de sol e lua),
  glossário e preços (vão para Dinheiro). Se o "instalar app" for necessário
  no celular, ele pode ficar só no celular.

**Desenvolvedor**
- **Vitrine do produtor (novo):** um painel onde o Desenvolvedor escolhe
  **qual gravação** alimenta o modo Produtor (Agora, Histórico, Ciclo,
  Dinheiro e o Visor) e a velocidade da reprodução. O padrão é o campeão mais
  recente. A escolha fica salva no navegador (`usePreferencias`), **não** no
  banco: o banco não aceita escrita anônima e deve continuar assim. Pode ser
  uma página própria ou um bloco em Estufas lado a lado.
- **Estufas lado a lado:** comparar **várias** estufas, não três: a geração
  1, campeões intermediários, o campeão final, regras fixas e sem controle,
  em grade que ocupa a largura. Todas as gravações de campeão usam o mesmo
  clima (`SEMENTE_GRAVACAO` em `treino/treinar.py`), então a comparação é
  justa. O gráfico "Uma variável nas N estufas" é o ponto forte da página:
  melhore-o (uma linha por estufa, escolher quais aparecem, faixa boa,
  balão com o valor exato, largura total).
- **Treino e gerações:** tirar Currículo e "Ele esqueceu algo?". Entra **o que
  o modelo aprendeu** ao longo das gerações, em gráficos de linha: tempo fora
  da faixa, energia gasta, massa colhida e nota, por geração, com regras
  fixas como referência. "Comparar gerações" ocupa a largura.
- **Modelo:** o diagrama da rede fica. Reestruturar **acertos e erros** e **o
  que pesou mais na decisão** para ficarem claros. Tirar "como lidou com a
  perturbação".
- **Gravações:** é a parte mais legal do app. Mantenha; só ajuste ao resto.

## Dados que faltam (backend)

1. **Regras fixas e sem controle no clima da gravação.** Hoje a gravação só
   tem o campeão. Faça o treino (`treino/treinar.py`) gravar também
   `RegrasFixas` e `Nada` (de `controle/`) no mesmo clima e exportar no
   formato `Gravacao`. Para as 3 execuções da noite de 24/11
   (`treino/saidas/fase1-semente{7,8,9}-20261124`), gere essas gravações com
   um script que não retreina nada e envie pelo `treino/nuvem.py`.
2. **Métricas por geração** para "o que o modelo aprendeu": fração do tempo
   fora da faixa, energia (kWh), massa (g/pé) do campeão de cada geração. Se
   não dá para refazer as gerações antigas, calcule para os campeões salvos
   em `modelos/` e mostre só os pontos que existem. Não invente.
3. **Contrato:** toda mudança de formato vai junto em `docs/contrato-dados.md`,
   nos esquemas Zod (`dashboard/src/modules/treino/domain/contrato.ts`), em
   `dashboard/scripts/validar-treino.mjs` e no `treino/nuvem.py`.
4. **Banco:** se precisar de tabela ou coluna nova, crie uma migração em
   `supabase/migrations/` (mesmo padrão de
   `20261124230000_genesis_treino.sql`) e aplique no Supabase.

## Fases (cada uma termina verde antes da próxima)

Cada fase: código, testes, uma página em `docs/passos/` e um commit. A
numeração das páginas continua da última existente em `docs/passos/index.html`
no momento (se o número já estiver ocupado, use o próximo).

1. **Limpeza.** Apagar "?", Glossário, Currículo, "Ele esqueceu algo?",
   perturbações, a página Agente × regras do Produtor, o simulador de
   brinquedo e o que só servia a eles. Ajustes vira a página simples. Foco
   padrão do navegador. Corrigir o espaço vazio horizontal em todas as
   páginas. *Pronto quando:* nenhuma rota mostra os itens removidos, nenhum
   import morto (`npm run lint`, `tsc`), e as capturas não têm a direita
   vazia.
2. **Dados reais.** Backend dos itens 1 e 2 acima, contrato, migração se
   precisar, envio dos dados das 3 execuções. *Pronto quando:*
   `validar-treino.mjs` passa nas 3 pastas, os testes Python passam
   (`.venv\Scripts\python.exe -m pytest treino controle simulador`) e os
   dados estão no Supabase.
3. **Produtor alimentado pela gravação.** Adaptador novo de `FonteEstufa` que
   reproduz uma gravação (ligado em `dependencias.ts`), a Vitrine do
   produtor, e as mudanças de Agora, Histórico e Ciclo. *Pronto quando:*
   Agora, Histórico, Ciclo e o Visor mostram o campeão escolhido, e trocar a
   gravação na Vitrine muda o Produtor.
4. **Dinheiro.** A pesquisa, a repaginação, os preços e os lançamentos com
   CSV. *Pronto quando:* cada número da página diz de onde veio, e um
   lançamento sobrevive a recarregar a página.
5. **Desenvolvedor.** Estufas lado a lado com N estufas, Treino com "o que
   aprendeu", Modelo reestruturado. *Pronto quando:* a comparação mostra pelo
   menos geração 1, um campeão intermediário, o final, regras fixas e sem
   controle, todos com dado real.
6. **Revisão visual por subagente.** Lance um subagente que **não edita
   código**. Ele sobe o app e tira capturas de todas as rotas em desktop
   (1440×900) e celular (375×812), claro e escuro, em
   `docs/revisao-visual/fase-14/`, e devolve uma lista de problemas com rota,
   tela, tema, o problema e a gravidade. Procure em especial: espaço vazio na
   horizontal, "?" que sobrou, texto técnico no Produtor ("agente",
   "geração"), eixo espremido, número sem origem. Corrija os de gravidade
   alta e média.
7. **Entrega.** Rode tudo (abaixo), commit, push, PR para `main`, espere o CI
   ficar verde, faça o merge e confira o deploy de produção do Vercel (status
   do commit de merge = sucesso). Atualize `docs/diario.md` e
   `docs/plano.md` (a tabela de Etapas) com o que mudou.

## Como verificar (em `dashboard/`, antes de cada commit)

```
npm run typecheck
npm run lint
npm run format:check
npm test
npm run e2e
npm run build
npx astryx doctor --built dist
```

O CI do GitHub roda `format:check`: rode o Prettier antes do push. Os e2e
dependem dos dados de exemplo: atualize-os junto. Teste que falha é falha:
diga qual, com a saída.

## Permissões

**Pode, sem perguntar:**
- editar tudo em `dashboard/`, `docs/`, `supabase/migrations/`, e o
  exportador e scripts em `treino/` (sem mudar a evolução, a nota nem o
  simulador);
- criar e aplicar migrações **só no schema `genesis`** do Supabase;
- rodar scripts que leem `treino/saidas/` e enviar dados com `treino/nuvem.py`
  (a conta do treino está no `.env` da raiz; nunca imprima nem commite o
  `.env`);
- criar branch a partir de `main` (ex.: `dashboard-dados-reais`), commitar,
  dar push, abrir PR, fazer merge na `main` com o CI verde e conferir o deploy.

**Não pode:**
- mexer em qualquer schema do Supabase que não seja `genesis` (o projeto
  PequiDev é dividido com o blog);
- abrir escrita anônima no banco ou afrouxar RLS;
- apagar ou sobrescrever `treino/saidas/`, checkpoints ou modelos;
- rodar treino novo (só reavaliar campeões salvos);
- mudar a nota, a evolução, o simulador (`simulador/`) ou a segurança
  (`controle/seguranca.py`);
- force-push, mudar configuração do Vercel ou do GitHub, mexer em
  configurações do Windows.

Se algo exigir o que está em "não pode", pare essa parte, siga com o resto e
diga no fim o que ficou parado e por quê.

## O que entregar

- As 7 fases feitas e verificadas, em produção.
- Uma página por fase em `docs/passos/`, com antes e depois em captura, o que
  saiu e por quê (decisões do Gabriel marcadas como dele), números reais e
  como reproduzir.
- Uma decisão nova em `docs/decisoes/` para o "Produtor alimentado por
  gravação" e outra para o Dinheiro.
- No fim, um resumo curto ao Gabriel: o que mudou, o link do PR, o que não
  foi verificado e o que ficou em aberto.
