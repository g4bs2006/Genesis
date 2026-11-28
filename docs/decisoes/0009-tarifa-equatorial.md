# 0009 — Tarifa de energia: Equatorial Goiás, com impostos (R$ 1,28/kWh)

**Data:** 28/11/2026 · **Status:** aceita · **Muda:** a tarifa da
[decisão 0005](0005-controle-e-nota.md)

## Contexto

Até a fase 1, a nota e o simulador usaram R$ 0,85/kWh, descrito como "tarifa
média com impostos", sem fonte. O Gabriel desconfiou do valor e definiu a
região: **Equatorial Goiás, em Goiânia**.

## Decisão

**R$ 1,28/kWh**, com impostos, a partir da fase 2 do currículo. Vale em três
lugares que precisam bater:

- `controle/metricas.py` (`PRECOS["tarifaKwh"]`): o custo da energia na nota;
- `simulador/estufa.py` (`TARIFA_KWH`): a tarifa que a rede lê como entrada;
- `dashboard/.../precosLocal/repositorioPrecosLocal.ts` (`PRECOS_PADRAO`): o
  preço de partida da página Dinheiro.

### De onde vem o número

| Parte | Valor | Fonte |
| --- | --- | --- |
| TUSD + TE (sem impostos), grupo B convencional | R$ 0,954/kWh (TUSD 0,617 + TE 0,337) | Reajuste anual da ANEEL aprovado em 20/10/2026, em vigor desde 22/10/2026 (efeito médio de 7,25%). Valores por kWh do [Calculadora Energia](https://calculadoraenergia.com.br/tarifa/equatorial-go); reajuste em [Cenário Energia](https://cenarioenergia.com.br/2026/10/20/aneel-aprova-novas-tarifas-de-energia-para-neoenergia-brasilia-e-equatorial-goias/) |
| ICMS Goiás | 19% ("por dentro") | Calculadora Energia, citando a SEFAZ GO |
| PIS/COFINS | ~9% (estimativa da fonte) | Calculadora Energia |
| **Com impostos** | **R$ 1,284/kWh** | Simulação da mesma fonte: 200 kWh custam R$ 256,86 |

O Gabriel sugeriu R$ 0,96, que bate com a tarifa **sem** impostos (0,954).
A nota mede o dinheiro que sai do bolso do produtor, então entra o valor
**com** impostos.

## Alternativas descartadas

- **Manter R$ 0,85:** sem fonte, e abaixo até da tarifa sem impostos.
- **R$ 0,954 (sem impostos):** subestima a conta de luz em ~25%.
- **Separar tarifa e alíquota em dois parâmetros:** só faz sentido quando a
  tarifa variar (fase 3). Hoje é um número só.

## Consequências

- **A fase 1 não foi retreinada.** O resultado dela continua de pé com a
  tarifa nova: o campeão de cada semente ainda vence as regras fixas em 10 de
  10 climas inéditos (tabela no [passo 15](../passos/15-resultado-fase-1.html)).
- **A tarifa é entrada da rede** (`treino/rede.py`, centro 0,9 e escala 0,6).
  Trocar de 0,85 para 1,28 muda essa entrada de −0,08 para +0,63, e o campeão
  da fase 1 muda o comportamento: o gasto de energia sobe em duas sementes e
  cai na outra. A fase 2 parte desse campeão e se ajusta à tarifa nova
  evoluindo.
- No navegador de quem já salvou preços na página Dinheiro, continua o valor
  salvo; o novo padrão vale para quem não salvou.

## Em aberto

- **B2 rural:** ICMS, descontos (rural, irrigante) e a alíquota exata de
  PIS/COFINS não foram confirmados na tabela oficial da ANEEL nem numa fatura.
  Uma fatura real da Equatorial (valor da energia ÷ kWh) fecha a dúvida.
- **Fase 3 (tarifa variável):** a tarifa branca e o desconto de irrigante
  noturno da Equatorial.
