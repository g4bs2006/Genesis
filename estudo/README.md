# Estudo: estufa de brinquedo

Um Genesis em miniatura, para aprender as ideias antes do projeto de verdade:
uma estufa com só uma variável (temperatura do ar), dois atuadores (exaustor e
nebulização), uma rede neural de 146 pesos e a evolução que a treina.

Usa NumPy em vez de PyTorch: as contas são quase iguais (`np.tanh` vira
`torch.tanh`), e roda em qualquer computador, sem GPU.

## Como rodar

```bash
pip install -r estudo/requirements.txt
python estudo/estufa.py     # passo 1: a estufa, sem fazer nada e com regras fixas
python estudo/rede.py       # passo 2: a rede neural, com pesos sorteados
python estudo/evolucao.py   # passo 3: a evolução treinando a rede (~10 s)
```

Os gráficos vão para `estudo/saidas/`.

`rede-da-estufa.html` é a versão interativa: a mesma estufa, rede e evolução em
JavaScript, com o campeão embutido. Abre direto no navegador, sem instalar nada.

## Os três passos

| Arquivo | O que ensina | No Genesis de verdade |
| --- | --- | --- |
| `estufa.py` | Simulador em passos de 10 min, várias estufas ao mesmo tempo, a nota | Van Henten + solução nutritiva, em PyTorch na GPU |
| `rede.py` | Neurônio, camadas, ativação, normalização, pesos como uma lista de números | MLP de ~2 mil pesos, 8 saídas |
| `evolucao.py` | População, elitismo, torneio, cruzamento, mutação, teste em climas novos | O mesmo, mais o currículo |

## O que aconteceu na primeira rodada

- Redes sorteadas: mediana de -1.744 na geração 0. Nebulizam à toa, gelam ou
  cozinham a estufa.
- Em ~20 gerações a população inteira já é melhor que as regras fixas.
- Prova final, média em 30 climas nunca vistos: regras fixas **-49**, campeão
  **-9**, não fazer nada **-1.201**.

**O que o campeão aprendeu sozinho** (`saidas/3_campeao.png`):

1. **Nebulização suave e contínua**, em vez de liga-desliga. As regras fixas
   ligam com tudo, passam do ponto e ficam serrilhando acima de 26 °C.
2. **Não usa o exaustor.** Na estufa de brinquedo, a nebulização esfria dez vezes
   mais por passo e custa só 2,5 vezes mais. E à tarde o ar de fora é mais quente
   que o de dentro: ligar o exaustor puxaria calor para dentro. As regras fixas
   ligam assim mesmo.
3. **Fica colado em 25,9 °C**, logo abaixo do limite de 26 °C.

Os itens 2 e 3 são lições importantes para o projeto:

- **A rede faz o que a nota pede, não o que a gente quer.** A nota não pune
  nada dentro da faixa, então ela fica na beira, onde gasta menos. No Genesis,
  a nota deve preferir o meio da faixa, ou um susto de sensor joga a estufa
  para fora.
- **A rede explora as simplificações do simulador.** Aqui, nebulizar não tem
  efeito colateral. Na estufa real, nebulizar sobe a umidade (e o VPD cai,
  fungo aparece). Um simulador simples demais ensina truques que não
  funcionam no mundo real. Por isso o Genesis usa um modelo da literatura
  (Van Henten), com umidade.

## Experimentos para fazer

Mude um número, rode de novo e veja o que acontece. Antes de rodar, tente
adivinhar o resultado.

1. `MUTACAO = 0` em `evolucao.py`. Sem mutação, ainda dá para melhorar?
2. `ELITE = 0`. As melhores redes agora podem se perder. A curva fica pior?
3. `POPULACAO = 20`. Menos redes por geração: aprende mais devagar ou não aprende?
4. `CUSTO_NEBULIZ = 0.5` em `estufa.py`. Nebulizar fica caro: o campeão passa
   a usar o exaustor? Em que horas?
5. Na nota (`simular`, em `estufa.py`), puna também a distância até 22 °C (o
   meio da faixa). O campeão sai da beira?
6. Tire a entrada "tendência" da rede (`observar`, em `rede.py`; lembre de
   mudar `N_ENTRADAS`). Faz diferença?
