# 0005 — Controladores de comparação, segurança e a nota em R$

**Data:** 24/11/2026 · **Situação:** aceita (os pesos da punição são para revisar depois do primeiro treino)

## Contexto

A rede aprende a maximizar a nota, e só ela: a nota define o comportamento. O
estudo deixou duas lições:

- a nota não punia nada dentro da faixa, e o campeão viveu colado em 25,9 °C;
- sem um controlador de comparação forte, não dá para saber se a rede aprendeu
  algo útil.

## Decisão

### Controladores (`controle/controladores.py`)

Todos seguem `decidir(observacao) -> acoes`, a mesma interface que a rede vai usar.

| Controlador | O que faz | Para quê |
| --- | --- | --- |
| `Nada` | não liga nada | o piso: quanto a estufa sofre sozinha |
| `RegrasFixas` | exaustor acima de 24 °C ou de 85% de umidade; névoa acima de 26 °C com o ar abaixo de 80%; tela acima de 27 °C | como a maioria das estufas funciona hoje: a régua principal |
| `PID` | PI da temperatura (alvo 22 °C, Kp 0,4/°C, Ti 30 min, D = 0) com *split range*: demanda de 0 a 1 liga o exaustor, de 1 a 2 entra a névoa. Anti-windup por integração condicional | o controle clássico da indústria: uma régua mais difícil |

### Camada de segurança (`controle/seguranca.py`)

Fica entre a decisão e o atuador. No simulador ela **corta a ação e anota**
(`AcaoBarrada`), como fará no hardware, para o treino viver as mesmas regras
da estufa física. O prompt dizia "no simulador ela só registra"; cortar também
deixa o treino igual ao hardware.

| Regra | Limite |
| --- | --- |
| névoa com o ar úmido | barrada acima de 90%: não evapora e molha as folhas |
| potência total | até 82 W/m²; o excesso sai do LED, porque resfriar protege a alface e luz extra só acelera um pouco |

### Potência de cada atuador (W por m² de piso)

| Atuador | Potência | Conta |
| --- | --- | --- |
| exaustor | ~4,4 | 0,041 m³/s/m² ÷ 0,0094 m³/s por W (~20 cfm/W, eficiência típica de exaustor de estufa) |
| névoa | ~2,1 | 70 bar × 8,9 g/m²/min de água ÷ 50% de eficiência da bomba |
| tela de sombra | 0 | o motor só gasta para abrir e fechar |
| LED | 80 | 200 µmol/m²/s ÷ 2,5 µmol/J (decisão 0004) |

São **ordens de grandeza com a conta à vista**, não medições. A potência
disponível (82 W/m²) é uma **suposição**: ainda não há projeto elétrico. Trocar
quando houver a estufa física.

### O ResumoCiclo (`controle/metricas.py`)

- **Energia (kWh):** potência × quanto cada atuador ligou × tempo, numa estufa
  de 1000 pés (62,5 m² de bancada, como as estufas de exemplo do dashboard).
- **Água (L):** só a da névoa. A água que a planta bebe entra com a solução
  nutritiva (Etapa 4).
- **Nutriente e ácido:** 0 na fase 1.
- **Fora da faixa:** fração do tempo, no total e por variável (temperatura,
  umidade, VPD, CO₂), com as faixas do dashboard. A luz fica de fora: ao
  meio-dia o sol passa de 600 µmol/m²/s mesmo com a tela, e a alface tolera
  isso.

### A nota (R$ por ciclo, estufa inteira)

```
nota = receita − custos − punição
```

- **Receita:** 1000 pés × R$ 2,00 (preço médio do dashboard) × fator de peso.
  O fator de peso é a régua do dashboard: 220 g vale 1, abaixo de 120 g vale 0
  e o máximo é 1,1.
- **Custos:** energia × R$ 0,85/kWh, mais água × R$ 8/m³, mudas (R$ 150) e
  fixos (R$ 180). São os mesmos preços e contas do dashboard, para os números
  baterem nas duas pontas.
- **Punição**, a cada passo de 10 min e para cada variável controlada:

  ```
  d = |valor − meio da faixa| ÷ meia largura      (0 no meio, 1 na borda)
  punição = peso × (R$ 0,01 × d²  +  R$ 0,50 × (d − 1) se d > 1)
  ```

  - **Dentro da faixa**, a punição cresce devagar do meio até a borda (no
    máximo R$ 0,01 por passo). Isso basta para a rede preferir o meio. É a
    correção da lição do estudo.
  - **Fora da faixa**, ela cresce rápido. Na temperatura, a meia largura é
    4 °C, então 1 °C acima de 26 por uma hora custa R$ 0,75. Uma tarde de 4 h
    a 2 °C acima custa R$ 6.
  - **Pesos:** temperatura 1, VPD 1, CO₂ 0,5. A umidade fica de fora, porque o
    VPD já mede o que ela faz na planta, e contar as duas puniria o mesmo
    problema duas vezes.
  - **Cada ação barrada** pela segurança custa R$ 0,05, para a rede não usar a
    segurança como muleta.

## Resultados de referência (35 dias, clima ameno, sementes 1 e 2)

| Controlador | Nota (R$) | Massa por pé | Energia | Água | Punição |
| --- | --- | --- | --- | --- | --- |
| Nada | −8.355 / −7.779 | 8 g | 0 | 0 | ~7.700 |
| Regras fixas | 364 / 393 | 250 g | ~171 kWh | ~3,2 m³ | ~1.320 |
| PID | 677 / 713 | 267 g | ~171 kWh | ~11,9 m³ | ~935 |

## Consequências e pontos para revisar

- **A nota não é o lucro.** O lucro (receita − custos) das regras fixas fica
  perto de R$ 1.700; a punição tira ~R$ 1.300.
- **Parte da punição é inevitável.** Sem aquecimento, as noites de 13 °C deixam
  a estufa abaixo de 18 °C, e à noite o ar úmido deixa o VPD abaixo de 0,5.
  Para a evolução isso não pesa, porque ela compara redes no mesmo clima e uma
  parcela igual para todas não muda a ordem. Ainda assim, a rede pode aprender
  algo útil: fechar a estufa à noite segura o calor.
- **Os pesos da punição são escolha nossa, não física.** Eles dizem quanto vale,
  em reais, o risco que o modelo não simula (queima de borda, pendoamento,
  fungo). Revisar depois do primeiro treino, olhando o que o campeão faz.
