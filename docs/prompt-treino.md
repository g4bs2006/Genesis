# Prompt: treino no notebook do Gabriel

> Cole este arquivo inteiro como primeira mensagem de uma sessão do Claude Code
> aberta **no notebook do Gabriel**, na pasta do repositório `g4bs2006/Genesis`.
> Escrito em 2026-11-24.

---

Você roda **na máquina do Gabriel** (Windows, PowerShell). Seu trabalho é o
**backend do treino**: o simulador da estufa, os controladores de comparação, a
neuroevolução da **fase 1 do currículo** e, por fim, ligar o dashboard (já
pronto) aos resultados de verdade.

**Meta de hoje:** a fase 1 do currículo treinando no notebook **durante a
noite**, de um jeito que sobreviva a você fechar a sessão. Amanhã: ligar o
dashboard aos resultados.

## 1. Antes de qualquer coisa

1. `git pull` na `main`. Se `docs/diario.md` não existir, faça
   `git fetch origin ccr-ab68ab61-y3zm9a` e leia os arquivos dessa branch.
2. Leia, nesta ordem (só as partes indicadas, para economizar):
   - `CLAUDE.md`;
   - `docs/diario.md`;
   - `docs/plano.md`, seções "O problema", "O simulador", "Como o agente
     aprende" (inteira), "Onde o treino roda" e "Etapas";
   - `docs/contrato-dados.md`;
   - `dashboard/src/modules/treino/domain/rede.ts`: as **20 entradas e as 8
     saídas da rede, na ordem**, e a normalização que o dashboard usa;
   - `estudo/estufa.py`, `estudo/rede.py`, `estudo/evolucao.py`: a versão de
     brinquedo do que você vai fazer de verdade. O Gabriel já conhece esse
     código, então use-o como ponte nas explicações ("lá no estudo era assim;
     aqui muda isto").
3. Não mexa no `dashboard/` até a Fase F.

## 2. Como trabalhar com o Gabriel (obrigatório)

Vale o `CLAUDE.md`: é a primeira vez do Gabriel com redes neurais, simulador e
treino.

- **Explique cada passo** antes ou junto com o código. Defina termos na primeira
  vez (tensor, vetorizar, checkpoint, Euler, venv…), em português simples.
- **Explique cada comando do PowerShell antes de rodar**: o que faz e o que
  esperar na tela.
- Passos pequenos que dê para rodar e ver. Mostre números e gráficos no
  caminho, não só no fim.
- Comentários no código dizem o **porquê**.
- **Peça permissão antes de mudar qualquer configuração do Windows** (energia,
  política de scripts, instalar programas).

## 3. Economia de tokens e subagentes

Antes de cada fase, decida em uma linha se ela vale um subagente e diga por quê.

- **Delegue** o que é autocontido, com entrada e critério de pronto claros, e
  que gera muito material que você não precisa ver. Exemplos: testes de
  sanidade do simulador; o script que confere os JSON exportados contra o
  contrato; pesquisa de equações e parâmetros na literatura.
- **Faça você** o que depende desta conversa, das explicações ao Gabriel ou de
  decisões de modelagem.
- Briefing curto: objetivo, arquivos, critério de pronto, "resposta em até 10
  linhas". Nunca dois agentes no mesmo arquivo.
- Leia só o trecho que precisa e não releia o que acabou de editar. Saída de
  treino longa vai para arquivo, não para o seu contexto: leia o fim do log.

## 4. A máquina

| Item | Valor |
| --- | --- |
| Sistema | Windows, PowerShell |
| Processador | Intel Core Ultra 5 125H, 14 núcleos, 18 linhas de execução |
| Vídeo | Intel Arc integrado, sem NVIDIA. **O treino roda no processador** |
| Memória e disco | 15 GB de RAM, 77 GB livres |
| Python / Git | 3.13.2 / 2.55 |
| PyTorch | não instalado |
| Node.js | não verificado (o dashboard precisa; o CI usa a versão 24) |

**Por que no processador:** a rede da fase 1 tem ~2 mil pesos e cada estufa é
uma conta pequena. A GPU integrada não compensa aqui. O PyTorch para placas
Intel (XPU) fica para um teste futuro, **não hoje**.

## 5. Fases

Cada fase em sua branch, com commits no padrão Conventional Commits em
português (`feat: simulador do ar`) e PR. Arquivos grandes de treino
(checkpoints, saídas) **não** vão para o Git.

### Fase A: ambiente

1. Na raiz do repositório:
   - criar o ambiente virtual `.venv` (`python -m venv .venv`), explicando ao Gabriel o que é um venv;
   - ativar com `.venv\Scripts\Activate.ps1`. Se o Windows bloquear scripts, peça para rodar `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` e explique o que isso muda.
2. Criar `requirements.txt` na raiz, com o PyTorch **para CPU**: a linha
   `--extra-index-url https://download.pytorch.org/whl/cpu` mais `torch`,
   `numpy`, `matplotlib`, `pandas` e `pytest`. Instale e confira:
   - `torch.__version__`;
   - `torch.get_num_threads()`;
   - uma conta de matriz 1000×1000.
3. Medir a velocidade: rode `python estudo/evolucao.py` e anote o tempo (na
   nuvem foram ~10 s). Isso dá a régua para dimensionar a população depois.
4. `.gitignore`: `.venv/`, `treino/saidas/`, `__pycache__/`.
5. Dashboard:
   - `node --version`;
   - se não houver Node 24 (ou um LTS ≥ 22), peça permissão e instale com `winget install OpenJS.NodeJS.LTS`;
   - em `dashboard/`, rode `npm install`, `npm test` e `npm run dev`, e mostre ao Gabriel que abre em http://localhost:5173.

### Fase B: simulador do ar (Etapa 1 do plano)

Pacote `simulador/`, em PyTorch, **vetorizado**: N estufas são tensores de
tamanho `[N]` e um passo é uma conta sobre todos. Parâmetro `device` (padrão
`cpu`), `float32`.

1. **Modelo de Van Henten (1994)** para alface. Os estados são:
   - massa seca;
   - CO₂ de dentro;
   - temperatura do ar;
   - umidade.

   Os controles originais são injeção de CO₂, ventilação e aquecimento. Tire
   as equações e os parâmetros da fonte: Van Henten, *Greenhouse climate
   management: an optimal control approach* (tese, Wageningen, 1994), e Van
   Henten & Van Straten (1994), sobre o modelo de crescimento da alface. Nada
   de inventar coeficiente.
2. **Adaptação ao Genesis** (registre em `docs/decisoes/0004-simulador-van-henten.md`):
   - **exaustor** = ventilação;
   - **nebulização** = esfria o ar e **sobe a umidade**. O efeito colateral é
     obrigatório: no estudo, sem ele, o agente abusou da nebulização;
   - **sombreamento** = corta parte da radiação que entra;
   - **luz suplementar** = soma luz útil e um pouco de calor;
   - **sem aquecimento** nem injeção de CO₂ (a estufa típica no Brasil): o CO₂
     de dentro só troca com o de fora pela ventilação;
   - os atuadores da solução (dosagens, reposição, bomba) existem no vetor de
     ações, mas **não fazem nada na fase 1**. pH, EC, temperatura da água e
     nível ficam fixos em valores ideais.
3. **Massa por pé em gramas frescas:** converta a massa seca por m² com a
   densidade de plantas e a fração de matéria seca. Documente as duas na
   decisão 0004.
4. **Passo de 10 minutos**, integrado com sub-passos (Euler com 1 minuto, por
   exemplo) para não explodir. Explique ao Gabriel o que é integrar uma
   equação passo a passo.
5. **Clima da fase 1:** dias amenos sintéticos, com semente (temperatura,
   umidade, radiação e CO₂ de fora), no espírito de `estudo/estufa.py`. O
   INMET só entra na fase 3.
6. **Interface do plano:** `ler_sensores()` devolve as leituras com os nomes do
   contrato (`Leitura`: `ar.temperatura`, `solucao.ph`…) e `acionar(acoes)`
   recebe as 8 ações do contrato (`Acoes`).
7. **Testes (pytest):**
   - ao sol, sem atuadores, a temperatura sobe;
   - o exaustor puxa a temperatura para a de fora;
   - a nebulização esfria e umedece;
   - mesma semente, mesmo resultado;
   - N=1 dá o mesmo que a estufa 0 de N=1000;
   - 35 dias em condições boas dão uma massa plausível. Confira com a
     literatura: alface hidropônica comercial colhe na faixa de 200 a 300 g por
     pé. Diga de onde tirou o número.

### Fase C: controladores de comparação e métricas (Etapa 2)

Pacote `controle/`.

1. **Interface `Controlador.decidir(observacao) -> acoes`**, com:
   - `Nada`;
   - `RegrasFixas`: termostato, como no estudo, com umidade e sombreamento;
   - `PID` de temperatura. Se o tempo apertar, o PID fica para amanhã: avise o
     Gabriel.
2. **Camada de segurança:** limites duros entre a decisão e o atuador. Na fase 1:
   - não nebulizar com umidade acima de um limite;
   - não ligar tudo ao mesmo tempo além da potência disponível.

   No simulador ela **só registra** a tentativa (vira `AcaoBarrada`); no
   hardware, impedirá.
3. **Métricas por estufa e ciclo:**
   - massa por pé;
   - energia em kWh (potência nominal de cada atuador × tempo ligado:
     documente as potências);
   - água em L;
   - fração do tempo fora da faixa, no total e por variável;
   - ações barradas.

   O formato é `ResumoCiclo`, do contrato.
4. **Nota em R$ por ciclo:** receita (pés × preço) − custos − punição.
   - Use os preços padrão do dashboard (`dashboard/src/modules/dinheiro/`, o
     `precosLocal` e o domínio), para os números baterem nas duas pontas.
   - **Lição do estudo:** a punição não pode ser só "fora da faixa". Dê
     preferência ao meio da faixa, senão o agente vive na beira do limite.
   - Explique a nota ao Gabriel antes de treinar.

### Fase D: neuroevolução da fase 1 (Etapa 3)

Pacote `treino/`, generalizando `estudo/evolucao.py`.

1. **Rede MLP 20 → 32 → 32 → 8**, tanh nas ocultas e sigmoide na saída.
   - As entradas e as saídas seguem **exatamente a ordem e os nomes de
     `dashboard/src/modules/treino/domain/rede.ts`**.
   - Na fase 1, as entradas que ainda não existem (pH, EC, água, nível, tarifa
     fixa, tendências de pH e EC) recebem valores fixos.
   - Implemente a normalização em Python e **exporte `normalizacao.json`**
     (centro e largura de cada entrada) para o dashboard usar a mesma.
2. **População como tensor `[P, n_pesos]`** e a rede de todas de uma vez
   (`torch.bmm` ou `einsum`).
   - Ordem dos pesos ao exportar: a do contrato (por camada, a matriz entradas
     × saídas linha por entrada, depois os vieses).
3. **Evolução:**
   - elitismo de 5%, torneio de 3, cruzamento uniforme, mutação gaussiana
     (comece com 0,02 a 0,05);
   - o mesmo clima para toda a geração, clima novo a cada geração;
   - o campeão é testado em vários climas;
   - **escolha a população medindo**: rode 3 gerações com P = 256, 512 e 1024 e
     escolha a maior em que uma geração leve até ~60 s. Use
     `torch.set_num_threads` com os núcleos físicos.
4. **Robustez para a noite:**
   - checkpoint a cada N gerações em `treino/saidas/<execucao>/checkpoint.pt`;
   - opção `--retomar`;
   - orçamento `--horas`;
   - `--semente`;
   - Ctrl+C salva antes de sair;
   - log em arquivo.
5. **Exportação no contrato** (JSON, nomes do contrato), em `treino/saidas/<execucao>/`:

   | Arquivo | Conteúdo | Quando é escrito |
   | --- | --- | --- |
   | `estado.json` | `EstadoTreino` | atualizado a cada geração |
   | `config.json` | `ConfigTreino` | no início |
   | `geracoes.json` | lista de `Geracao` | a cada geração |
   | `modelos/<id>.json` | `Modelo`, com `provaPorFase` | a cada campeão novo |
   | `gravacoes/<id>.json` e `gravacoes/indice.json` | `Gravacao` e lista de `ResumoGravacao` | no fim, e a cada N gerações |
   | `normalizacao.json` | centro e largura de cada entrada | no início |

   A gravação é o campeão rodando um ciclo num clima fixo, guardando as
   **ações** de cada passo.

   **Validação:** um script ou teste que confere os JSON exportados contra os
   esquemas Zod do dashboard (`dashboard/src/modules/*/domain/contrato.ts`),
   por exemplo com um script Node que importa os esquemas. Se o contrato
   precisar mudar, mude o documento e os esquemas juntos e avise o Gabriel.
6. **Ensaio antes da noite:** 5 a 10 minutos de treino. Mostre ao Gabriel:
   - a curva (PNG com matplotlib: melhor, mediana, regras fixas);
   - o campeão contra as regras fixas e contra não fazer nada, numa tabela.

   Explique o que ele está vendo. Só siga se a melhor nota estiver subindo.

### Fase E: deixar treinando à noite

1. **Energia:** peça permissão e explique antes de mexer.
   - `powercfg /change standby-timeout-ac 0` (não suspender na tomada);
   - fechar a tampa: Painel de Controle › Opções de Energia › "Escolher a
     função do fechamento da tampa" › Na tomada: "Nada a fazer". Ou deixar a
     tampa aberta;
   - o notebook fica **na tomada**.
2. **Rodar fora da sua sessão:** o treino não pode morrer se o Claude Code
   fechar. Abra uma janela própria do PowerShell, por exemplo:

   ```powershell
   Start-Process powershell -ArgumentList '-NoExit','-Command','cd C:\caminho\Genesis; .venv\Scripts\Activate.ps1; python -m treino.treinar --fase 1 --horas 9 --sementes 3'
   ```

   Ajuste o caminho e os nomes ao que você criou.
3. **Três sementes em sequência**, dentro do orçamento. Isso mostra se o
   resultado se repete ou foi sorte, e o artigo vai pedir.
4. **Checklist para a manhã:** deixe com o Gabriel como conferir. Um comando
   (`python -m treino.relatorio <execucao>`) que gera:
   - a curva em PNG;
   - a tabela campeão × regras × nada em climas nunca vistos;
   - onde ficaram os arquivos.

### Fase F: ligar o dashboard aos resultados (amanhã)

Siga `dashboard/AGENTS.md`, `dashboard/README.md` e as regras de arquitetura
(módulos, portas, `app/dependencias.ts` como único lugar que escolhe adaptador).

1. **Novo adaptador `arquivosTreino`** em `dashboard/src/modules/treino/infrastructure/`,
   implementando `FonteTreino` e `FonteGravacoes`:
   - lê os JSON exportados e valida com os esquemas Zod;
   - uma forma simples de servir os arquivos: um script
     `npm run treino:sincronizar` que copia `treino/saidas/<execucao>/` para
     `dashboard/public/treino/`.
2. **Modo `npm run dev:treino`**: escolhido em `dependencias.ts`, com o
   treino e as gravações reais e a estufa do simulador de brinquedo. As telas
   tiram o selo "dados de exemplo" só do que for real.
3. **Normalização:** o dashboard passa a usar o `normalizacao.json` do treino
   no lugar das estimativas de `rede.ts`.
4. **Antes do PR:** `npm run typecheck && npm run lint && npm test && npm run build`,
   e capturas das telas de treino, modelo e gravações com os dados reais.

### Depois (não hoje)

- **Etapa 4:** a solução nutritiva (pH, EC, água) e as fases 2 e 3 do
  currículo, com o clima do INMET (estação a definir) e a tarifa.
- **Etapa 5:** o mundo sujo (fases 4 a 6).
- **O simulador PyTorch como fonte ao vivo do dashboard:** precisa de um
  servidor local.
- **PPO, para comparar com a neuroevolução.**
- **Testar a XPU da placa Intel.**
- **Mover o treino pesado para o PC com a RX 7600 XT.**

## 6. O que NÃO fazer

- Não usar GPU hoje e não perder tempo com a XPU.
- Não implementar INMET, solução nutritiva nem as fases 2 a 6 do currículo.
- Não inventar parâmetro do Van Henten: fonte citada ou pergunte.
- Não mudar o contrato sem atualizar `docs/contrato-dados.md` e os esquemas Zod
  juntos, avisando o Gabriel.
- Não mexer em configurações do Windows sem permissão.
- Não deixar o treino da noite dependente da sua sessão.
- Não commitar `.venv`, checkpoints nem saídas grandes.
