# Genesis: plano

Um agente treinado com redes neurais que controla uma estufa hidropônica de
alface, um simulador que faz o papel da estufa enquanto não há hardware, e um
dashboard (celular e desktop) que mostra a estufa e projeta lucro e gasto.

O nome vem do dispositivo Gênesis de *Star Trek II*, que transforma um planeta
morto em vida. Escolhido pelo Gabriel em 2026-11-23, no estilo do Tesserato.

Este documento é o plano, conversado em 2026-11-23. **Nada foi implementado
ainda.**

## De onde veio

1. O Gabriel queria estudar redes neurais treinadas de verdade (não só usar uma
   pronta, como a Lixeira do Pequi faz com MobileNet e KNN). A primeira ideia
   foi o **Pequi Corre**, no PequiDev: uma população de agentes aprendendo um
   jogo de corredor com obstáculos acrescentados aos poucos (ver
   `docs/pequi-corre.md` no repositório PequiDev). Esse estudo continua lá, em
   paralelo.
2. O orientador do Gabriel pediu um tema ligado ao **agro**. Das opções
   conversadas (irrigação, adubação, visão para pragas, robô na lavoura,
   estufa), o Gabriel escolheu **estufa com hidroponia**.
3. Decidido em 2026-11-23: **projeto separado do PequiDev**, com interface
   própria e mais séria.

## Decisões tomadas

| Decisão | Escolha | Por quê |
| --- | --- | --- |
| Cultura | Alface | Ciclo curto (30 a 45 dias), a mais estudada em modelos de estufa |
| Sistema | Hidroponia NFT (lâmina de solução nutritiva em canais) | O mais comum no Brasil para alface |
| Foco agora | Só software | Sensores físicos ficam para depois, mas o desenho já prevê |
| Onde mora | Repositório próprio, `g4bs2006/Genesis`, fora do PequiDev | Precisa de interface mais séria e identidade própria |
| Interface | Dashboard informativo, bom no celular e no desktop | Pedido do Gabriel |
| Financeiro | Projeção de lucro × gasto no dashboard | Pedido do Gabriel |
| Treino | Na placa do Gabriel (AMD Radeon RX 7600 XT) | Ver [Treino na GPU](#treino-na-gpu) |
| Tarifa de energia variável | Entra na fase 3 do currículo, junto com o clima real | A nota já desconta energia desde a fase 1; a tarifa variável só muda o preço. O fim do currículo fica só com o mundo "sujo" |
| Jeito de trabalhar | Explicar cada passo | É a primeira vez do Gabriel implementando algo assim. Ver [CLAUDE.md](../CLAUDE.md) |

## O problema

**O que o agente vê:**

- Ar: temperatura, umidade (e dela o VPD, a "sede" do ar), CO₂, luz.
- Solução: pH, condutividade elétrica (EC), temperatura da água, nível do
  reservatório.
- Fora e relógio: clima externo, hora do dia, dia do ciclo.

**O que ele controla:** ventilação/exaustor, nebulização, sombreamento, luz
suplementar, dosagem de nutriente (A/B), dosagem de ácido (pH), reposição de
água, bomba de circulação.

**A nota (recompensa):** massa de alface na colheita, menos o custo de energia,
nutriente e água, com punição por tempo fora da faixa segura.

Faixas de referência para alface (a confirmar com literatura e orientador):

| Variável | Faixa |
| --- | --- |
| pH da solução | 5,5 a 6,5 |
| EC | ~1,2 a 1,8 mS/cm |
| Temperatura da água | 18 a 24 °C |

## O simulador (o "jogo")

Enquanto não há estufa, um simulador faz o papel dela. Escrito em **PyTorch**,
com tensores, para rodar **milhares de estufas ao mesmo tempo** na GPU.

- **Clima e crescimento da alface:** modelo de **Van Henten (1994)**, clássico,
  pequeno (umas quatro equações), muito usado em controle de estufa, inclusive
  com aprendizado por reforço.
- **Solução nutritiva:** balanço simples, escrito por nós:
  - a planta consome nutriente → EC cai;
  - a água evapora → EC sobe;
  - a absorção de nitrato puxa o pH para cima;
  - o reservatório esquenta com o sol.
- **Clima de fora:** dados horários reais do **INMET** da região.
- **Referências para comparar:**
  - **GreenLight**, modelo de estufa mais completo e aberto;
  - resultados publicados do **Autonomous Greenhouse Challenge** (Wageningen),
    competição de estufas controladas por IA.

Passo de tempo: alguns minutos (5 a 15). Um ciclo de 35 dias fica entre 3 mil
e 10 mil passos.

## Como o agente aprende

**Neuroevolução com aprendizado por currículo**, o mesmo método do Pequi Corre:

- Uma população de agentes, cada um com sua rede neural, controla uma estufa
  simulada cada.
- No fim do ciclo, os melhores passam intactos (elitismo), os outros nascem do
  cruzamento dos bons com mutação nos pesos.
- **A rede tem entradas e saídas fixas desde a primeira fase**, para caber em
  todas as fases sem trocar de rede.
- **Esquecimento catastrófico:** ao aprender uma fase nova, o agente não pode
  desaprender as anteriores. Solução: sempre misturar cenários das fases
  anteriores.
- **Justiça na nota:** na mesma geração, todos enfrentam o mesmo clima
  (semente); cada geração ganha clima novo; o campeão é testado em vários.

### O currículo

| Fase | "Obstáculo" novo | O que ele aprende |
| --- | --- | --- |
| 1 | Só clima do ar, sensores perfeitos, dias amenos | Ventilar e nebulizar na hora certa |
| 2 | Solução nutritiva entra no jogo | Manter pH e EC na faixa |
| 3 | Clima real sorteado do histórico do INMET e tarifa de energia variando | Ondas de calor, dias nublados; economizar no horário caro sem perder colheita |
| 4 | Ruído nos sensores | Não reagir a leitura falsa |
| 5 | Sensor de pH descalibrando com o tempo | Desconfiar e cruzar informações |
| 6 | Falhas: bomba trava, queda de energia | Reagir a emergências |

As fases 1 a 3 ensinam a cultivar (ar, água, clima e preço de verdade). As fases
4 a 6 preparam para o hardware real: é a **randomização de domínio** (treinar
num simulador "sujo" para o agente sobreviver ao mundo real).

**Quando passa de fase:** quando o campeão cumpre um critério na fase atual (a
definir; por exemplo, menos de 5% do tempo fora da faixa e nota maior que a das
regras fixas). Depois de avançar, cada geração mistura cenários: a maior parte
da fase nova e uma parte das anteriores (por exemplo 70% e 30%).

### A rede neural

**Um neurônio** é uma conta simples: multiplica cada entrada por um peso, soma
tudo, soma um viés e passa o resultado por uma função de ativação (que
"entorta" a reta, senão a rede inteira seria só uma conta linear). **Uma rede**
é várias camadas de neurônios, cada camada recebendo a saída da anterior.
"Treinar" é achar os pesos que fazem a rede tomar boas decisões.

A rede do Genesis é pequena, uma **MLP** (rede de camadas totalmente ligadas):

```
entradas (~20)  ->  32 neurônios (tanh)  ->  32 neurônios (tanh)  ->  saídas (8, sigmoide)
```

São cerca de **2 mil pesos**. Pequena de propósito: a neuroevolução funciona
melhor com poucos pesos, e controlar uma estufa não exige uma rede grande.

**Entradas** (todas normalizadas para mais ou menos entre -1 e 1, para nenhuma
dominar só por ter número grande, como CO₂ em ppm ao lado de pH):

- ar: temperatura, umidade, VPD, CO₂, luz;
- solução: pH, EC, temperatura da água, nível;
- fora: temperatura, umidade, radiação;
- tempo: hora do dia (como seno e cosseno, para 23h ficar perto de 0h), dia do
  ciclo;
- tarifa de energia atual;
- tendência: as mesmas leituras principais de uma hora atrás, porque a MLP não
  tem memória e precisa saber se a temperatura está subindo ou caindo.

Nas fases em que algo ainda não existe (pH e EC na fase 1, tarifa antes da fase
3), a entrada recebe um valor fixo. Assim a rede tem **o mesmo formato do
começo ao fim** e não precisa ser trocada entre fases.

**Saídas:** uma por atuador, cada uma entre 0 e 1 (sigmoide):

| Saída | Como vira ação |
| --- | --- |
| Ventilação/exaustor | Fração da potência (0 a 1) |
| Sombreamento | Fração fechada (0 a 1) |
| Nebulização | Liga se > 0,5 |
| Luz suplementar | Liga se > 0,5 |
| Dosagem A/B | Mililitros no passo (0 a um máximo) |
| Dosagem de ácido | Mililitros no passo (0 a um máximo) |
| Reposição de água | Liga se > 0,5 |
| Bomba de circulação | Liga se > 0,5 |

Antes de chegar aos atuadores, as ações passam pela **camada de segurança**.

**Ponto a revisitar:** a fase 5 (sensor descalibrando) pode exigir memória de
verdade, que a MLP não tem. Se ela travar lá, a alternativa é uma rede
recorrente pequena (GRU), que guarda um estado de um passo para o outro.

### O treino, passo a passo

Não há "resposta certa" para cada passo (ninguém diz ao agente que naquele
minuto o certo era ligar o exaustor); só se sabe se o ciclo foi bom no fim,
35 dias depois. Por isso o treino é por **evolução** e não pelo método mais
comum (retropropagação com exemplos certos): a evolução só precisa da nota
final.

1. **Nasce a população:** N redes (por exemplo 1024) com pesos sorteados ao
   acaso. Cada rede é só uma lista de ~2 mil números.
2. **Cada rede cultiva uma estufa:** todas as N estufas simuladas rodam juntas
   na GPU, com o mesmo clima. A cada passo (10 minutos de estufa): lê os
   sensores, a rede decide as ações, a camada de segurança filtra, o simulador
   avança 10 minutos. Um ciclo de 35 dias são uns 5 mil passos.
3. **Nota:** no fim do ciclo, cada rede recebe sua nota em reais: alface
   colhida × preço, menos energia, nutriente e água, menos uma punição pelo
   tempo fora da faixa segura.
4. **Seleção:**
   - **elitismo:** os melhores (por exemplo 5%) passam intactos;
   - **cruzamento:** o resto nasce de dois pais escolhidos entre os bons, cada
     peso vindo de um ou de outro;
   - **mutação:** soma-se um ruído pequeno aos pesos dos filhos, para surgir
     coisa nova.
5. **Repete:** nova geração, clima novo. Centenas ou milhares de gerações.
6. **Currículo:** quando o campeão cumpre o critério da fase, avança.
7. **Exporta:** os pesos do campeão de cada geração e a gravação do seu ciclo
   vão para o dashboard.

**Por que dá para rodar milhares de estufas juntas:** o estado de todas fica em
tensores com uma linha por estufa (temperatura de todas, pH de todas...), e os
pesos de todas as redes num tensor `[N, pesos]`. Um passo da simulação é uma
conta só sobre a tabela inteira, que é exatamente o que a GPU faz bem.

**PPO** (o item 4 das comparações) é o outro caminho: aprende
por gradiente, com a nota de cada passo. Fica para depois, para comparar.

### Comparações (para o resultado convencer)

1. **Regras fixas** ("passou de 28 °C, liga o exaustor"), como a maioria das
   estufas faz.
2. **PID**, controlador clássico por variável.
3. **Neuroevolução com currículo**, o nosso.
4. Depois, **PPO**.

Métricas: massa colhida, energia, nutriente, água, tempo fora da faixa, e o
resultado financeiro (ver [Lucro × gasto](#lucro--gasto-projetado)).

## Pronto para sensores físicos (sem fazer hardware agora)

**O agente nunca sabe se fala com o simulador ou com a estufa real.** Tudo
passa por uma interface única:

```
ler_sensores()  -> {temp_ar, umidade, co2, luz, ph, ec, temp_agua, nivel}
acionar(acoes)  -> liga e desliga exaustor, bomba, dosadoras...
```

- **Agora:** o simulador implementa a interface.
- **Depois:** um ESP32 com sensores implementa a mesma interface via MQTT, e o
  agente treinado não muda. Sensores possíveis:

  | Medida | Sensor |
  | --- | --- |
  | Temperatura e umidade do ar | SHT31 |
  | CO₂ | SCD41 |
  | Luz | BH1750 |
  | Temperatura da água | DS18B20 |
  | pH e EC | Sondas analógicas |
  | Dosagem | Bombas peristálticas |

- **Camada de segurança** entre o agente e os atuadores, desde já: decisão
  nenhuma passa por cima de um limite duro (ex.: não dosa ácido com pH abaixo
  de 5,5; não fica mais de X minutos sem circular a solução). No simulador ela
  só registra quando o agente tentou algo perigoso; no hardware, impede.

Assim o software vira um **gêmeo digital** da estufa: quando o hardware existir,
os dados reais calibram o simulador e o agente é retreinado.

## Dashboard

Informativo, sério, **responsivo** (celular e desktop), instalável como app
(PWA).

**O que mostra:**

- **Agora:** cartões com cada variável (valor, faixa ideal, tendência), estado
  de cada atuador, alertas (fora da faixa, falha, camada de segurança
  barrando o agente).
- **Histórico:** gráficos por variável, com as ações do agente marcadas no
  tempo.
- **Ciclo:** dia do ciclo, crescimento estimado da alface, data prevista da
  colheita.
- **Agente × regras fixas:** a mesma estufa (o mesmo clima) controlada pelos
  dois, lado a lado.
- **Lucro × gasto projetado** (abaixo).
- **Treino:** evolução das gerações, fase do currículo, reprodução de um ciclo
  acelerado.

Primeiro mostra a estufa simulada rodando; depois, os sensores reais, sem mudar
de tela.

### Lucro × gasto projetado

Por ciclo, por mês e por ano, com cenários de preço (baixo, médio, alto):

- **Receita:** plantas × massa estimada na colheita × preço da alface. Preço de
  referência: CEAGESP / Conab (Prohort).
- **Custos variáveis:**
  - energia: kWh de cada atuador × tarifa (bandeiras e horário, ANEEL);
  - nutrientes: gramas dosadas × R$/kg;
  - ácido/corretivo de pH;
  - água: m³ × tarifa;
  - mudas.
- **Custos fixos:** equipamentos e estrutura (amortizados por ciclo), mão de
  obra.
- **Resultado:** margem por ciclo, ponto de equilíbrio, retorno do
  investimento.
- **O número que vende o projeto:** quanto o agente ganha ou economiza em
  relação às regras fixas, em R$ por ciclo.

Todos os preços ficam editáveis no dashboard, para o produtor pôr os dele.

## Mostrar a evolução (artigo)

Como no Pequi Corre, **gravar dados, não vídeo**: o clima (semente), os pesos
da rede e as ações de cada passo. O dashboard (ou um artigo) reproduz o ciclo
acelerado: a alface crescendo, os medidores mexendo, os atuadores ligando.
Campeões de gerações diferentes lado a lado; agente × regras fixas.

As ações são gravadas junto com os pesos porque a GPU calcula em float32 e o
navegador pode arredondar diferente: com as ações, a reprodução é fiel.

## Treino na GPU

Placa do Gabriel: **AMD Radeon RX 7600 XT** (ele falou em 6 GB de VRAM; a
7600 XT costuma ter 16 GB, conferir). O ambiente do Claude na nuvem não tem
GPU: o treino roda no PC do Gabriel (dá para ligar o PC à sessão pelo Remote
Control do app do Claude).

- **Linux** é o caminho mais tranquilo (ROCm completo). O RX 7600 entrou na
  lista oficial do **ROCm 7.12** (prévia, março de 2026), com PyTorch 2.10. A
  7600 XT tem o mesmo chip (gfx1102); nenhuma fonte a cita pelo nome. Se não for
  reconhecida: `HSA_OVERRIDE_GFX_VERSION=11.0.0`.
- **Windows:** PyTorch nativo da AMD (só PyTorch, não o ROCm inteiro); a lista
  de janeiro de 2026 não traz a 7600 nem a 7600 XT. Testar.
- Teste:

  ```bash
  python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
  ```

Fontes:

- [ROCm Core SDK 7.12.0 release notes](https://rocm.docs.amd.com/en/7.12.0-preview/about/release-notes.html)
- [AMD Windows PyTorch release notes](https://www.amd.com/en/resources/support-articles/release-notes/RN-AMDGPU-WINDOWS-PYTORCH-7-2.html)
- [Radeon Limitations and recommended settings](https://rocm.docs.amd.com/projects/radeon-ryzen/en/docs-7.1.1/docs/limitations/limitationsrad.html)

## Organização proposta

```
simulador/      Python (PyTorch): estufa vetorizada, Van Henten, solução nutritiva, clima INMET
treino/         Python: neuroevolução, currículo, comparações, exporta campeões e gravações
controle/       Interface ler_sensores / acionar, camada de segurança, regras fixas e PID
dashboard/      App web responsivo (PWA)
docs/           Este plano e os próximos
```

Stack do dashboard a decidir. Candidata natural, por ser o que o Gabriel já usa
no PequiDev: Next.js + Tailwind + Supabase (Realtime para as leituras ao vivo).

## Etapas

| Etapa | Entrega |
| --- | --- |
| 0. Preparação | Repositório criado (**feito**); PyTorch com a GPU funcionando no PC |
| 0b. Estudo | Estufa de brinquedo em NumPy: simulador, rede e evolução, para aprender as ideias (**feito**, em [`estudo/`](../estudo/README.md)) |
| 1. Simulador do ar | Van Henten em PyTorch, clima do INMET, conferido com a literatura |
| 2. Regras fixas e PID | As comparações rodando no simulador, com métricas |
| 3. Neuroevolução | Agente aprende a fase 1, milhares de estufas na GPU |
| 4. Solução nutritiva | pH, EC, água e reservatório; clima do INMET e tarifa variável; currículo fases 2 e 3 |
| 5. Mundo sujo | Ruído, descalibração, falhas; fases 4 a 6; camada de segurança |
| 6. Dashboard | Tela do agora, histórico, ciclo, agente × regras, celular e desktop |
| 7. Financeiro | Lucro × gasto projetado, cenários, preços editáveis |
| 8. Gravações | Reprodução do ciclo acelerado e das gerações |
| 9. Validação | Comparar com GreenLight e com resultados publicados |
| 10. Hardware (futuro) | ESP32 + sensores pela mesma interface, dados reais calibrando o simulador |

## Decisões em aberto

- **Formato do trabalho:** TCC, iniciação científica ou outro? Define escopo e
  rigor de validação.
- **Estufa real:** o orientador ou a instituição tem estufa ou bancada
  hidropônica? Define quais sensores e atuadores entram no simulador.
- **Região:** qual estação do INMET usar para o clima.
- **Sistema do PC:** Windows ou Linux.
- **Stack do dashboard.**
