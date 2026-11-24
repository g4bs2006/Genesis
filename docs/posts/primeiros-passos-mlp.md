---
# Campos do painel do PequiDev (/admin). Ver docs/blog.md no repositório PequiDev.
slug: primeiros-passos-com-redes-neurais
title: "Primeiros passos com redes neurais: uma estufa de brinquedo e 146 pesos"
summary: "Antes de treinar uma IA para cuidar de uma estufa de alface de verdade, montei uma de mentira, com uma rede de 146 pesos que aprende por evolução. O que é um neurônio, o que é uma MLP e por que a rede faz o que a nota pede, não o que você quer."
tags: [redes-neurais, aprendizado-de-maquina, python, genesis]
status: draft
pequi_reacao: pensativo
pequi_legenda: "e se eu for só uma soma ponderada?"
# Imagens: subir docs/posts/imagens/*.webp no bucket `imagens` do Supabase
# e trocar os [URL-...] abaixo pelos endereços.
---

Eu já tinha usado rede neural pronta. A Lixeira aqui do site reconhece lixo com
uma MobileNet que outra pessoa treinou, e eu só ensinei um classificador por
cima. Mas eu nunca tinha **treinado** uma rede do zero, nem entendido o que
acontece lá dentro quando ela "aprende".

Agora preciso entender. O projeto novo, o Genesis, é um agente que controla uma
estufa hidropônica de alface: ele lê os sensores (temperatura, umidade, pH…) e
decide o que ligar (exaustor, nebulização, dosadoras…). Antes de partir para o
simulador de verdade, montei uma versão de brinquedo para aprender as ideias. É
desse brinquedo que este post fala.

## A estufa de brinquedo

O brinquedo tem uma variável só: **a temperatura do ar de dentro**. Ela é
mexida por três coisas:

- o **sol** esquenta (efeito estufa);
- o **ar de fora** puxa a temperatura de dentro para a dele, pelas frestas;
- e dois atuadores que o agente controla:
  - o **exaustor**, que acelera essa troca com o ar de fora;
  - a **nebulização**, que esfria (a água evaporando rouba calor).

A alface gosta de ficar **entre 18 e 26 °C**. O simulador avança de 10 em 10
minutos, então três dias de estufa são 432 passos. A cada passo, quem estiver
no controle decide quanto ligar cada atuador, de 0 a 1.

Para saber se alguém cuidou bem da estufa, existe uma **nota**:

- cada grau fora da faixa, a cada passo, custa 1 ponto;
- ligar os atuadores custa um pouco (energia e água).

A nota é o custo total com sinal negativo. Então **0 é perfeito**, e quanto mais
negativo, pior.

Antes de qualquer rede, testei dois controladores bobos:

| Quem controla | O que faz | Nota em 3 dias |
| --- | --- | --- |
| Ninguém | Nunca liga nada | -1.624 |
| Regras fixas | Passou de 24 °C, liga o exaustor; passou de 26 °C, liga a nebulização | -71 |

As regras fixas são como a maioria das estufas funciona hoje: um termostato.
Elas resolvem quase tudo, mas ficam ligando e desligando e passam um pouco do
ponto. É essa a régua que a rede tem que bater.

## Um neurônio é uma conta

Esse foi o meu primeiro choque: um neurônio não tem nada de mágico. Ele faz
três coisas:

1. multiplica cada entrada por um **peso** (o quanto aquela entrada importa);
2. soma tudo e soma um **viés** (um empurrão fixo, para cima ou para baixo);
3. passa o resultado por uma **função de ativação**.

A ativação é o que "entorta" a conta. Sem ela, empilhar neurônios não adiantaria
nada: uma conta linear de outra conta linear continua sendo uma conta linear, e
a rede só conseguiria aprender regras do tipo "uma reta".

```py
import numpy as np

def neuronio(entradas, pesos, vies):
    soma = np.dot(entradas, pesos) + vies  # soma ponderada
    return np.tanh(soma)                   # ativação: espreme entre -1 e 1
```

**Treinar** uma rede é só isto: achar os números dos pesos e dos vieses que
fazem ela decidir bem. Todo o resto é como achar esses números.

> **Na verdade…** a rede inteira, no fim, é uma lista de números. A minha tem
> 146. Guardar ou copiar uma rede treinada é guardar ou copiar essa lista.

## Empilhando: a MLP

Uma **MLP** (*multilayer perceptron*, ou perceptron de várias camadas) é só
neurônios em camadas, cada camada recebendo a saída da anterior. A minha ficou
assim:

```
6 entradas  ->  16 neurônios (tanh)  ->  2 saídas (sigmoide)
```

As **6 entradas** são o que os sensores leem:

- a temperatura de dentro;
- a tendência (subiu ou desceu na última hora?);
- a temperatura de fora;
- o sol;
- a hora do dia, que entra como dois números (seno e cosseno; explico abaixo).

As **2 saídas** são o quanto ligar o exaustor e a nebulização. A **sigmoide**
espreme qualquer número para entre 0 e 1, o que é exatamente um "quanto ligar".

Contando: 6×16 pesos, mais 16 vieses, mais 16×2 pesos, mais 2 vieses. Dá **146
números**.

Dois detalhes que eu não teria pensado sozinho:

- **Normalizar as entradas.** Se uma entrada vale 30 (graus) e outra vale 0,5
  (sol), a de 30 domina as contas só por ser um número maior, não por ser mais
  importante. Então tudo é reescalado para ficar mais ou menos entre -1 e 1.
- **A hora como seno e cosseno.** Como número, 23h e 0h parecem opostos (23
  contra 0). Num círculo, como num relógio, elas ficam lado a lado. Por isso a
  hora entra como dois números.

E outro detalhe que me pegou: essa rede **não tem memória**. Ela só vê o agora.
Sem a entrada de tendência, ela não saberia se a estufa está esquentando ou
esfriando.

## Treinar sem resposta certa: evolução

O jeito mais conhecido de treinar uma rede é a **retropropagação**: você mostra
um exemplo com a resposta certa, mede o erro e corrige os pesos um pouquinho na
direção certa. Só que aqui **não existe resposta certa** a cada passo. Ninguém
sabe dizer que às 14h10 do segundo dia o certo era ligar a nebulização a 37%. Só
dá para saber, no fim dos três dias, se o cultivo foi bom.

Então usei **neuroevolução**: seleção natural com redes. Cada geração funciona
assim:

1. **População:** 200 redes com pesos sorteados. No começo, todas são péssimas.
2. **Cada uma cuida da sua estufa**, todas com o mesmo clima, para a comparação
   ser justa.
3. **Elitismo:** as 10 melhores passam intactas para a próxima geração.
4. **Torneio e cruzamento:** o resto nasce de dois pais. Para escolher cada pai,
   sorteio 3 redes e fico com a melhor. Cada peso do filho vem do pai ou da mãe,
   no cara ou coroa.
5. **Mutação:** somo um ruído pequeno a todos os pesos do filho. É daqui que
   surge coisa nova; sem mutação, a população só reembaralha o que já tem.
6. **Repete**, com um clima novo a cada geração, para ninguém decorar um clima.

```py
def nova_geracao(populacao, notas, rng):
    ordem = np.argsort(notas)[::-1]                  # da melhor para a pior
    filhos = [populacao[i] for i in ordem[:ELITE]]   # elitismo

    while len(filhos) < POPULACAO:
        pai = populacao[escolher_pai(notas, rng)]    # torneio
        mae = populacao[escolher_pai(notas, rng)]
        do_pai = rng.random(N_PESOS) < 0.5           # cruzamento: cara ou coroa
        filho = np.where(do_pai, pai, mae)
        filho = filho + rng.normal(0, MUTACAO, N_PESOS)  # mutação
        filhos.append(filho)

    return np.array(filhos)
```

Um truque que deixou tudo rápido: as 200 estufas não rodam uma de cada vez. A
temperatura de todas fica numa tabela só, e cada passo é **uma conta sobre a
tabela inteira**. É a mesma ideia que, no projeto de verdade, vai deixar a GPU
simular milhares de estufas ao mesmo tempo.

## O que aconteceu

As redes sorteadas são um desastre: na geração 0, a mediana é na casa de -1.700.
Elas nebulizam à toa e congelam a estufa, ou não fazem nada e cozinham a alface.

Em umas **20 gerações**, a população inteira já é melhor que as regras fixas. Em
150 gerações (uns **10 segundos** no meu computador), o campeão estava pronto.

![Gráfico da nota por geração: a melhor rede e a mediana sobem rápido nas primeiras 20 gerações e ficam acima da linha das regras fixas](https://[URL-DA-IMAGEM]/curva-de-aprendizado.webp "A nota ao longo das gerações. A escala é logarítmica, para caber o -10 mil do começo e o -1 do fim.")

Para a prova final, testei o campeão em **30 climas que nenhuma rede tinha visto
no treino**:

| Quem controla | Nota média |
| --- | --- |
| Ninguém | -1.201 |
| Regras fixas | -49 |
| **Campeão da evolução** | **-9** |

## O que a rede aprendeu sozinha

Ninguém explicou nada para ela, mas olhando o gráfico do campeão dá para ver
estratégias que eu não programei:

![Dois gráficos lado a lado: com as regras fixas a temperatura serrilha acima de 26 °C; com o campeão ela fica lisa logo abaixo de 26 °C e só a nebulização é usada, de forma suave](https://[URL-DA-IMAGEM]/regras-x-campeao.webp "Em cima, as regras fixas; embaixo, o campeão. Mesmo clima.")

1. **Nebulização suave, no lugar de liga e desliga.** As regras fixas ligam com
   tudo, passam do ponto e ficam serrilhando. O campeão dosa.
2. **Ele nunca liga o exaustor.** À tarde, o ar de fora é mais quente que o de
   dentro: ventilar puxaria calor para dentro. As regras fixas ligam assim
   mesmo.
3. **Ele fica colado em 25,9 °C**, logo abaixo do limite de 26 °C.

O terceiro item foi a parte mais importante do estudo.

## As duas lições

**A rede faz o que a nota pede, não o que você quer.** A minha nota não punia
nada dentro da faixa, então 25,9 °C e 22 °C valiam a mesma coisa. E perto do
limite se gasta menos água, então o campeão foi morar na beira. Matematicamente
ele está certo. Na estufa de verdade, qualquer susto de sensor jogaria a alface
para fora da faixa. Se eu quero o meio da faixa, **a nota tem que dizer isso**.

**A rede explora as simplificações do simulador.** No meu brinquedo, nebulizar
não tem efeito colateral nenhum. Na estufa real, nebulização sobe a umidade, e
umidade alta traz fungo. A rede achou a brecha em segundos. Um simulador
simples demais ensina truques que não funcionam no mundo real. É por isso que o
Genesis vai usar um modelo de estufa da literatura (o de Van Henten, de 1994),
com umidade, CO₂ e o crescimento da alface.

## O que vem agora

O Genesis de verdade troca cada peça do brinquedo por uma maior:

| Brinquedo | Genesis |
| --- | --- |
| 1 variável, 2 atuadores | Ar, CO₂, umidade, pH, EC e água; 8 atuadores |
| Rede de 146 pesos | Rede de ~2 mil pesos (20 → 32 → 32 → 8) |
| 200 estufas em NumPy | Milhares de estufas em PyTorch |
| Um nível só | Um currículo de 6 fases, do ar perfeito até sensor descalibrando e bomba travada |

O primeiro treino de verdade, a fase 1 do currículo, vai rodar no meu notebook
durante a noite. Os resultados vêm num próximo post.

E o **Pequi Corre** continua em paralelo: a mesma ideia de população aprendendo
aos poucos, mas num jogo em que o Pequi pula obstáculos. A estufa é o projeto
sério; o Pequi correndo é o projeto em que eu brinco com as mesmas peças.

---

Todo o código do estudo está no repositório do Genesis, na pasta
[`estudo/`](https://github.com/g4bs2006/Genesis/tree/main/estudo). Tem três
arquivos em Python, um para cada passo (a estufa, a rede e a evolução), e uma
versão interativa em HTML que treina uma rede do zero no navegador.
