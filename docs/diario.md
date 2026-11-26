# Diário do Genesis

O que foi feito, em ordem, e onde está cada coisa. As decisões ficam no
[plano](plano.md) (tabela "Decisões tomadas") e em [`decisoes/`](decisoes/).

## 2026-11-23: o plano

- Conversado e escrito o [plano](plano.md): agente com rede neural controlando
  uma estufa hidropônica NFT de alface, simulador no lugar da estufa, dashboard
  com lucro × gasto, pronto para sensores físicos depois.
- **Currículo de 6 fases.** A tarifa de energia variável saiu da fase 7 e foi
  para a fase 3, junto com o clima real: a nota já desconta energia desde a
  fase 1, e a tarifa só muda o preço.
- **A rede e o treino explicados** no plano ("A rede neural" e "O treino, passo
  a passo"):
  - uma MLP 20 → 32 → 32 → 8, de ~2 mil pesos, com entradas e saídas fixas
    desde a fase 1;
  - treino por neuroevolução: população, elitismo, torneio, cruzamento e
    mutação.
- **[`CLAUDE.md`](../CLAUDE.md):** todo agente explica cada passo, porque é a
  primeira vez do Gabriel num projeto assim.

## 2026-11-23: o estudo

- [`estudo/`](../estudo/README.md) é uma estufa de brinquedo em NumPy, feita
  para aprender as ideias antes do projeto. Tem uma variável só (a temperatura),
  dois atuadores (exaustor e nebulização) e uma rede de 146 pesos.
- **Resultado** (média em 30 climas que a rede nunca viu):

  | Controlador | Nota |
  | --- | --- |
  | Não fazer nada | -1.201 |
  | Regras fixas | -49 |
  | Campeão da evolução | -9 |

  O campeão levou ~10 s de treino.
- **Lições para o projeto:**
  - **a rede faz o que a nota pede:** a nota não punia nada dentro da faixa,
    então o campeão ficou colado em 25,9 °C, logo abaixo do limite de 26 °C;
  - **a rede explora o simulador:** aqui a nebulização não tinha efeito
    colateral, e ele abusou dela.
- **[`estudo/rede-da-estufa.html`](../estudo/rede-da-estufa.html):** a versão
  interativa no navegador, com o diagrama da rede e treino do zero. Também
  está publicada como artifact (privado do Gabriel):
  https://claude.ai/artifact/8djSdhjmXKEQiUa5SC6Uak

## 2026-11-23: o frontend

- **Rascunho das telas aprovado.** É um canvas de design (privado):
  https://claude.ai/artifact/MZPxB5zyNEVtBGEazqw7p7. Tem Produtor no celular e
  no desktop, o visor da estufa e o modo Desenvolvedor (estufas lado a lado,
  treino e gerações).
- **Identidade visual:** a linguagem Lightfield do Tesserato, aplicada como
  tema do Astryx (o design system aberto da Meta).
- **Prompt do frontend:** [`prompt-frontend.md`](prompt-frontend.md). Outro
  agente construiu as **12 fases** a partir dele (PRs até o #27):
  - os contratos e os dados de exemplo;
  - a estufa de brinquedo num Web Worker;
  - as telas do Produtor (celular e desktop) e o Dinheiro;
  - o visor;
  - o modo Desenvolvedor: estufas lado a lado, treino, modelo e gravações;
  - o glossário e o "o que é isso?";
  - o polimento final.
- **Decisões do outro agente** ([`decisoes/`](decisoes/)):
  - os gráficos (0001);
  - o tema (0002);
  - a alface desenhada por IA (0003): a alface procedural não convenceu.
- **[`contrato-dados.md`](contrato-dados.md):** o formato exato que o
  backend (simulador e treino) precisa entregar ao dashboard.

## 2026-11-24: o treino no notebook

- **Diagnóstico do notebook:** Windows; Core Ultra 5 125H (14 núcleos); vídeo
  Intel Arc integrado, sem NVIDIA; 15 GB de RAM; Python 3.13.2; Git; PyTorch
  ainda não instalado. Detalhes em [Onde o treino roda](plano.md#onde-o-treino-roda).
- **Decisão:** a fase 1 do currículo treina no **processador** (PyTorch para
  CPU). A placa Intel fica para testar depois.
- **Prompt do agente local:** [`prompt-treino.md`](prompt-treino.md). Ele roda
  no notebook e cuida de quatro coisas:
  - preparar o ambiente;
  - escrever o simulador do ar (Van Henten), as regras fixas e a neuroevolução
    da fase 1;
  - deixar o treino rodando à noite;
  - ligar o dashboard aos resultados reais.

- **Acompanhar de longe (noite de 24/11):** o treino vai rodar num PC sem
  ninguém olhando, então ele passa a mandar os números para a nuvem e o
  dashboard mostra no celular. Ver [`nuvem.md`](nuvem.md).
  - **Supabase:** schema `genesis` dentro do projeto PequiDev (grátis; o plano
    grátis só deixa 2 projetos e os dois já estavam em uso). Separado do blog.
  - **Quem pode o quê:** qualquer um lê, só a conta do treino escreve (RLS).
  - **`treino/nuvem.py`:** olha `treino/saidas/<execucao>/` e manda o que
    mudou; se o treino ficar 15 min quieto, avisa que parou.
  - **Dashboard no Vercel** (plano Hobby, grátis), ao vivo pelo Realtime.
  - **Correção:** a placa do PC é uma **RX 7600** (não a XT), e o PC não é o
    notebook.

## 2026-11-24: Fases A e B do treino, no notebook

- **Fase A (ambiente):** venv com PyTorch 2.15 para CPU (`requirements.txt`).
  O estudo leva 15 s aqui, contra ~10 s na nuvem, com as mesmas notas. O cano
  até o celular foi testado com a demo do `treino/nuvem.py`: chegou ao Supabase
  e foi lido sem login, como faz o celular.
- **Fase B (simulador do ar):** `simulador/`, com o Van Henten (1994) vetorizado
  em PyTorch. Os 34 coeficientes foram conferidos em duas fontes. A adaptação
  ganhou fonte para cada número: exaustor, névoa, sombra, LED, matéria seca e
  pés por m². Detalhes na [decisão 0004](decisoes/0004-simulador-van-henten.md).
  - **Lição:** o modelo puro cultivava ~1,8 vez a alface brasileira, e a
    receita do dashboard satura em 242 g por pé. A rede não teria motivo para
    cuidar do crescimento. Um coeficiente foi calibrado (`c_alfa_beta` 0,544 →
    0,307) contra Santos et al. (2023): ~230 g no dia 30.
- **Fase C (controle):** `controle/`, com Nada, Regras fixas, PID (split range
  exaustor → névoa), a camada de segurança, o `ResumoCiclo` e a nota em R$.
  A punição começa no meio da faixa (lição do estudo). Em 35 dias: regras fixas
  ~R$ 380, PID ~R$ 700, não fazer nada ~R$ −8.000. Ver a
  [decisão 0005](decisoes/0005-controle-e-nota.md).

## 2026-11-25: o dashboard só com dado real (passos 08 a 14)

- **Pedido do Gabriel:** nenhum número inventado na tela, e o app organizado
  pelo que cada pessoa precisa: o **Produtor** (quem cultiva) e o
  **Desenvolvedor** (quem treina a rede). Cada passo tem página em
  [`passos/`](passos/index.html).
- **Limpeza (08):** saíram os "?", o Glossário, o Currículo, "Ele esqueceu
  algo?", as perturbações, o Agente × regras do Produtor e o simulador de
  brinquedo. Foco padrão do navegador; grades na largura toda.
- **Dados que faltavam (09):** o treino grava as regras fixas e "sem
  controle" no mesmo clima, a massa por dia e o resumo de cada ciclo. As 3
  execuções da noite foram reavaliadas **sem retreinar** (`treino/reavaliar.py`):
  a geração 1 refeita bateu com o `geracoes.json`, e cada gravação refeita foi
  conferida contra a original. Sem acesso ao projeto PequiDev desta máquina, os
  campos novos foram num índice no Storage, sem migração.
- **O Produtor reproduz uma gravação real (10, decisão
  [0007](decisoes/0007-produtor-alimentado-por-gravacao.md)):** a estufa do
  app é um ciclo gravado no simulador, tocado em ciclo e com pausa; a **Vitrine
  do produtor** escolhe qual e em que velocidade. Agora ganhou a Colheita no
  lugar do Agente × regras; o Histórico mostra o ciclo inteiro e os alertas.
- **Dinheiro como planilha (11, decisão
  [0008](decisoes/0008-dinheiro-como-planilha.md)):** a conta do ciclo linha a
  linha, cada número com a origem, o ponto de equilíbrio numa frase e os
  lançamentos reais com CSV.
- **Desenvolvedor (12):** Estufas lado a lado com N gravações, "o que o modelo
  aprendeu" por geração e o Modelo explicado em frases.
- **Revisão visual (13):** um subagente tirou 44 capturas e apontou 30
  problemas; os altos e médios foram corrigidos.
- **Números para o artigo:** o campeão final ganha das regras fixas na nota
  (~R$ 1.080 contra R$ 420 no clima da gravação) e fica menos tempo fora da
  faixa (~49% contra 75,5%), mas gasta 2,4 a 4 vezes a energia (370 a 630 kWh
  contra 157). "Sem controle" termina com 7,8 g por pé.
- **Entrega (14):** PR para a `main`, CI verde, merge e deploy no Vercel.

## Onde está cada coisa

| O quê | Onde |
| --- | --- |
| Plano e decisões | [`docs/plano.md`](plano.md), [`docs/decisoes/`](decisoes/) |
| Regras para agentes | [`CLAUDE.md`](../CLAUDE.md), [`dashboard/AGENTS.md`](../dashboard/AGENTS.md) |
| Estudo (estufa de brinquedo) | [`estudo/`](../estudo/README.md) |
| Dashboard | [`dashboard/`](../dashboard/README.md) |
| Contrato backend → dashboard | [`docs/contrato-dados.md`](contrato-dados.md) |
| Treino na nuvem (Supabase, Vercel) | [`docs/nuvem.md`](nuvem.md), [`supabase/`](../supabase/), [`treino/nuvem.py`](../treino/nuvem.py) |
| Prompts dos agentes | [`docs/prompt-frontend.md`](prompt-frontend.md), [`docs/prompt-treino.md`](prompt-treino.md) |
| Revisão visual (capturas) | [`docs/revisao-visual/`](revisao-visual/) |
| Passo a passo (uma página por passo) | [`docs/passos/`](passos/index.html) |
| Reavaliar uma execução antiga | [`treino/reavaliar.py`](../treino/reavaliar.py) |
