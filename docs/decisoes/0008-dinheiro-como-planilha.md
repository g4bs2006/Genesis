# 0008 — O Dinheiro é a planilha do pequeno produtor

**Data:** 25/11/2026 · **Situação:** aceita · **Passo:** [11](../passos/11-dinheiro.html)

## Contexto

A página Dinheiro mostrava "R$ 35 por ciclo, R$ 30 por mês, R$ 365 por ano",
"venda de R$ 233 − gastos de R$ 198, margem de 15%", três cenários de preço e
uma barra empilhada. Nem o Gabriel entendia. A pergunta dele: **o que o pequeno
produtor faz hoje em planilha que o app pode fazer por ele?**

A pesquisa (fontes na página do passo 11) encontrou sempre o mesmo trio:

1. **a conta do ciclo / custo de produção**: quanto entra, cada gasto numa linha
   (energia, solução nutritiva, mudas, mão de obra, estrutura), o que sobra e o
   custo por planta (Embrapa, UFLA, TCCs de hidroponia);
2. **o ponto de equilíbrio** ("ponto de nivelamento"): a partir de quanto a
   produção se paga (UFLA);
3. **o caderno de entradas e saídas** e o fluxo de caixa: registrar cada venda
   e cada gasto de verdade (Sebrae, Senar, Educapes).

## Decisão

- **A conta do ciclo, de cima para baixo**, numa tabela com quatro colunas: o
  item, a conta (ex.: "453 kWh × R$ 0,85"), **de onde veio** cada número
  (medido no ciclo gravado, ou seu preço) e o valor. Pés → peso → preço do pé →
  entra; energia, água, adubo, mudas, embalagem, mão de obra e outros → sai;
  sobra.
- **Um preço só** para a alface (o pé de 220 g; pé maior vale até 10% a mais, a
  mesma régua da nota do treino). Saem os três cenários, a projeção por mês e por
  ano e a margem.
- **O ponto de equilíbrio numa frase**: "Abaixo de R$ X o pé, você perde
  dinheiro", com a conta embaixo.
- **Preços editáveis aqui** (saíram de Ajustes), com campos novos de adubo e
  embalagem. O formato antigo salvo no navegador é convertido (o preço médio vira
  o preço; os fixos viram "mão de obra e outros").
- **Lançamentos reais**: data, o quê (venda ou um dos gastos da conta), detalhe
  e valor. Salvos no navegador (sem login), com CSV no formato do Excel
  brasileiro (ponto e vírgula, vírgula decimal). As categorias são as mesmas
  linhas da conta, então o **previsto × real** compara linha a linha.

## Alternativas descartadas

- **Manter os cenários de preço**: a variação de preço é real, mas três
  números por linha confundem; o produtor edita o preço e vê a conta mudar.
- **Projeção por mês e ano**: supõe ciclos colados e iguais; vira promessa.
- **Gráfico de pizza ou barra empilhada dos gastos**: a tabela mostra o mesmo e
  diz de onde veio cada número, que era o pedido.
- **Lançamentos no banco**: exige login (o banco não aceita escrita anônima).

## Consequências

- O consumo vem do ciclo gravado; o adubo e a embalagem ficam em R$ 0 até o
  produtor informar (a simulação da fase 1 não dosa adubo), e a linha diz isso.
- `vantagemDoAgente`, `projecao`, `barraDeCustos`, os cenários e os componentes
  de barra saíram do código.
- Quando houver login, os lançamentos e os preços vão para o banco pela mesma
  porta (`RepositorioLancamentos`, `RepositorioPrecos`).
