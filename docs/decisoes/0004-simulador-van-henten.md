# 0004 — O simulador do ar: Van Henten (1994) adaptado

**Data:** 24/11/2026 · **Situação:** aceita, com uma questão em aberto (a escala da massa)

## Contexto

A rede aprende o que o simulador deixa. O estudo mostrou isso duas vezes: com a
nebulização sem efeito colateral, o campeão abusou dela. O simulador da fase 1
precisa de física publicada, não de números escolhidos para dar certo. O
modelo de alface em estufa de Van Henten (1994) é o mais usado em trabalhos de
controle (MPC e aprendizado por reforço), tem só 4 estados e cabe numa conta
vetorizada.

## Decisão

### O modelo, sem mudar nada

Código: `simulador/estufa.py`. Coeficientes: `simulador/parametros.py`
(`VanHenten`), os 34 da tese, conferidos na Tabela 7 de Morcego et al. (2023)
e na Tabela 5 de Svensen et al. (2024), junto com a forma das 4 equações.

| Estado | O que é | Unidade |
| --- | --- | --- |
| x1 | massa seca de alface por m² de piso | kg/m² |
| x2 | CO₂ do ar de dentro | kg/m³ |
| x3 | temperatura do ar de dentro | °C |
| x4 | umidade absoluta do ar de dentro | kg/m³ |

Estado inicial da massa: 0,0035 kg/m², o mesmo das duas fontes. CO₂,
temperatura e umidade começam iguais aos de fora.

**Integração:** passo de 10 min, com 10 sub-passos de 1 min pelo método de
Euler (soma "taxa × tempo" aos poucos). O termo mais rápido do modelo, a troca
de ar com o exaustor no máximo, tem constante de tempo de ~100 s; com 60 s por
sub-passo a conta fica estável.

**Um corte:** o efeito da temperatura na fotossíntese é uma parábola que fica
negativa abaixo de ~3 °C e acima de ~42 °C. Cortamos em zero, para a
fotossíntese não virar "anti-fotossíntese" fora da faixa em que o modelo vale.

### A adaptação ao Genesis

Os controles originais (injeção de CO₂, ventilação e aquecimento) viram os
atuadores de uma estufa brasileira típica. Não há aquecimento nem injeção de
CO₂: o CO₂ de dentro só troca com o de fora pela ventilação.

| Atuador | Efeito no modelo | Valor máximo | Fonte |
| --- | --- | --- | --- |
| exaustor | ventilação (u2) | 0,041 m³/s por m² de piso: 1 troca de ar por minuto num pé-direito de 2,4 m | Watson et al., UF/IFAS AE030 (2019) |
| nebulização | evapora água: esfria o ar (calor latente) e **sobe a umidade** | 8,9 g de água/m²/min (névoa cíclica) | Ishii et al. (2016), JARQ 50(2):101–113 |
| sombreamento | corta parte do sol que entra | 50% | Cometti et al. (2020), Hortic. Bras. |
| luz (LED) | soma luz útil e o calor da parte que não vira luz | 200 µmol/m²/s a 2,5 µmol/J = 80 W/m² | Both (2003); DLC Hort V4.0 |

- **Ventilação.** O Van Henten original vai só até 0,0075 m³/s/m² (7,5 mm/s).
  Com isso, no sol daqui, a estufa passaria de 40 °C mesmo aberta. Com
  exaustores, a recomendação de projeto é 1 troca de ar por minuto. A ASAE
  EP406.4 indica até 0,06 para estufas pequenas no verão.
- **Nebulização.** A água só evapora se o ar tiver espaço para o vapor: a
  vazão efetiva é a máxima × (1 − umidade relativa). Com o ar saturado, a névoa
  não esfria nem umedece mais. É o efeito colateral que faltou no estudo, e ele
  limita o resfriamento perto da temperatura de bulbo úmido, como na prática.
  Calor latente: 2,45 MJ/kg (FAO-56, Allen et al. 1998).
- **LED.** A luz dele vira "radiação equivalente" para a fotossíntese, que o
  Van Henten mede em W/m² de radiação global: PAR ÷ 2,3 µmol/J. A parte da
  eletricidade que não vira luz (1 − 2,5/4,6, cerca de 46%) esquenta o ar
  direto.
- **Atuadores da solução** (dosagens, reposição, bomba): existem no vetor de
  ações, mas não fazem nada na fase 1. pH 6,0, EC 1,5 mS/cm, água a 21 °C e
  nível 0,8 ficam fixos no meio da faixa boa do dashboard, marcados como
  `exemplos` na leitura.

### Massa por pé, em gramas frescas

```
massa por pé (g) = x1 (kg/m²) × 1000 ÷ matéria seca ÷ pés por m²
```

- **Matéria seca:** 4,5% da massa fresca (Both 2003; Santos et al. 2023 dá o mesmo, 9,4 g em 209 g).
- **Pés por m²:** 16, do espaçamento 25 × 25 cm em NFT (Santos et al. 2023).
  Não conta os corredores; é a densidade na bancada.

### Os sensores

`ler_sensores()` devolve os nomes e as unidades do contrato
(`docs/contrato-dados.md`):

- umidade relativa e CO₂ em ppm pelas conversões das fontes (lei dos gases);
- VPD pela fórmula de Tetens (FAO-56);
- luz em PPFD: sol × transmissão × sombra × 2,3 µmol/J, mais a luz do LED.

A **transmissão da cobertura (0,7) não tem fonte**. É uma estimativa e só entra
no sensor de luz, porque no Van Henten a cobertura já está embutida no
coeficiente de uso da luz.

### O clima da fase 1

`simulador/clima.py`, com semente:

- noites de 13 a 20 °C e tardes de 20 a 30 °C;
- umidade de 65 a 85% em média, mais seca à tarde;
- sol com pico de 750 a 950 W/m² e nuvens;
- CO₂ de fora em 420 ppm.

Os dados do INMET só entram na fase 3.

## Em aberto: a escala da massa

Em 35 dias de clima ameno:

| Controle | Massa por pé, dia 30 |
| --- | --- |
| não fazer nada | 15 g (a estufa chega a 50 °C e a alface consome o CO₂ do ar) |
| termostato simples no exaustor | ~435 g |
| exaustor + sombra 50% | ~290 g |
| referência: Santos et al. (2023), NFT no Brasil | 209 a 250 g |

O Van Henten sem calibrar cultiva cerca de 1,8 vez mais que a referência.
Esperado: ele foi ajustado com alface holandesa, com pouca luz, e aqui o sol é
forte. O comportamento qualitativo está certo (calor e CO₂ baixo freiam,
ventilação ajuda, sombra demais tira luz). Calibrar a escala é decisão do
Gabriel, porque mexe num coeficiente do modelo.

## Consequências

- O simulador roda 35 dias em ~15 s numa estufa. O tempo é quase todo
  sobrecarga do Python por sub-passo e quase não cresce com N.
- A física é mais rica que a do estudo, e a rede vai achar os defeitos dela.
  Os testes (`simulador/test_estufa.py`) travam o básico: sol esquenta,
  exaustor puxa para a temperatura de fora, névoa esfria e umedece sem passar
  de 100%, mesma semente dá o mesmo resultado, 1 estufa = estufa 0 de 1000.

## Fontes

- Van Henten, E. J. *Greenhouse climate management: an optimal control approach*. Tese, Wageningen, 1994.
- Morcego, B. et al. Reinforcement Learning versus Model Predictive Control on greenhouse climate control. arXiv:2303.06110, 2023. https://arxiv.org/pdf/2303.06110
- Svensen, J. L.; Cheng, X.; Boersma, S.; Sun, C. Chance-constrained stochastic MPC of greenhouse production systems with parametric uncertainty. *Computers and Electronics in Agriculture* 217:108578, 2024. https://edepot.wur.nl/646861
- Watson, J. A. et al. Greenhouse ventilation. UF/IFAS AE030, 2019. https://edis.ifas.ufl.edu/publication/AE030
- ANSI/ASAE EP406.4. Heating, ventilating and cooling greenhouses, 2003.
- Ishii, M.; Sase, S. et al. Evaporative cooling in greenhouses (fog and pad-and-fan). *JARQ* 50(2):101–113, 2016. https://www.jircas.go.jp/sites/default/files/publication/jarq/50-02-04_101-113_ISHII_1.pdf
- Allen, R. G. et al. *Crop evapotranspiration* (FAO-56), cap. 3, 1998. https://www.fao.org/4/x0490e/x0490e07.htm
- Cometti, N. N. et al. (sombreamento em alface). *Horticultura Brasileira*, 2020. https://scielo.br/j/hb/a/YzZzZYBpTCYNtWRdTvgvpfj/?lang=en
- Both, A. J. Ten years of hydroponic lettuce research, 2003.
- DesignLights Consortium. Horticultural Technical Requirements V4.0, 2025.
- bigleaf (pacote R), função `Rg.to.PPFD`. https://search.r-project.org/CRAN/refmans/bigleaf/html/Rg.to.PPFD.html
- Santos et al. (espaçamento em alface NFT). *Irriga* 28(2):298–312, 2023. https://revistas.fca.unesp.br/index.php/irriga/article/download/4662/3625/20890
