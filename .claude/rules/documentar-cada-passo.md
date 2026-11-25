# Documentar cada passo em HTML

Pedido do Gabriel (24/11/2026): o projeto vai ser apresentado em público e
virar artigo, então **todo passo fica documentado**, com as decisões e o porquê
de cada uma. Vale para qualquer agente que trabalhe neste repositório.

## Quando

A cada passo: fase do roteiro, experimento, ensaio de treino, calibração,
decisão de modelagem, mudança de rumo ou correção que mude resultado. **Passo
sem página não está terminado:** a página entra no mesmo commit (ou PR) do
trabalho.

## Onde e como

- Uma página por passo: `docs/passos/NN-nome-curto.html`, numerada em ordem
  (`05-...`, `06-...`).
- Usa o estilo comum `docs/passos/estilo.css` (link relativo `estilo.css`) e o
  mesmo esqueleto das páginas que já existem. Copie uma delas como modelo.
- Acrescente o passo em `docs/passos/index.html`.
- Gráficos em PNG em `docs/passos/imagens/`, gerados por código. O script que
  gera cada gráfico fica em `docs/passos/imagens/gerar.py` ou é citado na
  página, para dar para refazer.
- Português, explicando cada termo técnico na primeira vez (como manda o
  `CLAUDE.md`).

## O que cada página precisa ter

1. **O que foi feito**, em poucas linhas.
2. **Por quê:** cada decisão, as alternativas consideradas e por que foram
   descartadas. Quando a decisão foi do Gabriel, diga que foi dele.
3. **Números:** tabelas com os resultados reais, sem arredondar a verdade.
   Diga de onde veio cada número (fonte, medição, conta, estimativa).
4. **Gráficos**, com uma legenda dizendo o que olhar neles.
5. **O que deu errado ou surpreendeu**, e o que se aprendeu.
6. **Como reproduzir:** os comandos.
7. **Em aberto:** o que ficou pendente e os próximos passos.
8. **Links:** commits, PR, decisões em `docs/decisoes/`, arquivos de código.

As decisões grandes continuam também em `docs/decisoes/NNNN-*.md`; a página do
passo conta a história e aponta para elas.
