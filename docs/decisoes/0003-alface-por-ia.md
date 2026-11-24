# 0003 — A alface desenhada por IA, não por código

**Data:** 23/11/2026 · **Situação:** aceita (substitui o desenho procedural da Fase 2)

## Contexto

A Fase 2 fez a alface por código (`gerarAlface`): folhas como curvas em 3D,
roseta pelo ângulo áureo, borda franzida por ondas, nervuras e degradê. Depois
de dez rodadas ela lia como alface crespa, mas o Gabriel achou o resultado
fraco ("as imagens do alface construídas sempre ficam bem ruins") e pediu
desenhos gerados por IA: não fotográficos, "mais desenho, para representação",
gastando no máximo US$ 2.

## Decisão

- **8 desenhos** em `dashboard/src/modules/alface/assets/`:
  - 5 estágios: dias 5, 12, 20, 28 e 35;
  - 3 estados na planta crescida: murcha, amarelando e bordas queimadas.
- **Como foram gerados:** OpenAI Responses API, modelo `gpt-6.1-sol` com a
  ferramenta `image_generation`, em `webp` com fundo transparente e qualidade
  média (`scripts/gerar-alfaces-ia.mjs`).
  - a referência (dia 28) veio primeiro; as outras 7 continuaram a mesma
    conversa (`previous_response_id`), para manter o mesmo traço, o mesmo cano
    NFT e o mesmo ângulo;
  - gasto: 8 chamadas, cerca de US$ 0,50;
  - a chave é lida de um `.env` em tempo de execução e nunca entra no repositório.
- **Limpeza:** `scripts/limpar-alfaces.mjs` zera o alfa baixo (tirava um
  "halo" quadrado no escuro) e reduz para 640 px (de ~1 MB para ~435 KB).
- **Escolha na tela:** `escolherDesenho` (puro, testado). A massa escolhe o
  estágio mais próximo; na planta grande, o pior estresse escolhe o estado. A
  troca é um esmaecimento cruzado.

## Consequências

- Menos expressividade contínua: o procedural tinha turgor, clorose e necrose
  graduais; agora são degraus (saudável, murcha, amarelando, queimada). A
  aparência vem da média da última hora, então a troca é rara e calma.
- Mudar o estilo é gerar de novo (script pronto). Novos estados (ex.: falta de
  água no copinho) são uma chamada a mais cada.
- O código procedural saiu do projeto e fica no histórico (Fase 2), caso se
  queira retomar.
