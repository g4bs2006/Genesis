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
