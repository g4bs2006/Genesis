# 0007 — O modo Produtor é alimentado por uma gravação real

**Data:** 25/11/2026 · **Situação:** aceita · **Passo:** [10](../passos/10-produtor-gravacao.html)

## Contexto

Ainda não existe estufa de verdade. Até o passo 08, o "ao vivo" do Produtor
vinha de duas fontes, as duas com número inventado:

- no `npm run dev`, um **simulador de brinquedo** no navegador, que só simulava
  a temperatura do ar e preenchia o resto com valor de exemplo;
- no `npm run demo` (e nos testes), um `estufas.json` gerado por um script com
  física "ajustada a olho".

E a massa da alface (o número que mais importa ao produtor) vinha de uma curva
logística "calibrada no rascunho", igual para todo mundo.

O Gabriel decidiu: nenhum número inventado na tela, e o "ao vivo" do Produtor
passa a ser **a reprodução de uma gravação real do treino** (um campeão
cultivando 35 dias no simulador), escolhida pelo Desenvolvedor.

## Decisão

1. **Um adaptador novo da porta `FonteEstufa`**, `reproducao`
   (`dashboard/src/modules/estufa/infrastructure/reproducao/`). Ele recebe as
   gravações da `FonteGravacoes` (Supabase em produção; um recorte real nos
   testes) e as toca num relógio próprio, acelerado, do transplante à colheita e
   de novo, em ciclo. Também implementa `ControleSimulacao` (pausar, continuar,
   acelerar).
2. **Um relógio só para todas as gravações.** Todas usam o mesmo clima
   (`SEMENTE_GRAVACAO`), então, no mesmo passo, todas viveram o mesmo tempo lá
   fora. É isso que deixa o Estufas lado a lado comparar de verdade.
3. **Nada do futuro.** O histórico e os eventos só vão até o passo de agora. A
   exceção, assumida e escrita na tela, é a **massa na colheita** e o resumo do
   ciclo: a gravação já mediu, e o Agora mostra como "colheita: X g por pé".
4. **A Vitrine do produtor** (`/dev/vitrine`) escolhe a gravação e a velocidade.
   A escolha fica em `usePreferencias` (no navegador). O padrão é o campeão mais
   recente. O banco **não** guarda a escolha: ele não aceita escrita anônima, e
   isso não muda.
5. **Honestidade na tela.** O Produtor vê o selo "ciclo gravado no simulador ·
   1 h por segundo" e um botão de pausar. O nome da gravação ("Geração 158") e
   palavras como "agente" ficam só no modo Desenvolvedor; para o produtor é "o
   controle automático".
6. **A massa vem da gravação** (`massaPorDia`, passo 09). Saíram a curva
   logística (`massaEsperada`) e a "meta de hoje". A escolha do desenho da
   alface continua usando a massa típica de cada desenho, que nunca aparece como
   número.

## Alternativas descartadas

- **Manter o simulador de brinquedo** com mais física: seria escrever um segundo
  simulador em TypeScript que discorda do de verdade (PyTorch). Os números
  continuariam inventados.
- **Rodar a rede no navegador**, ao vivo: a GPU e o navegador arredondam
  diferente (float32 × float64) e a estufa se afastaria da do treino. Já era a
  regra das Gravações: as ações vêm gravadas.
- **Guardar a escolha da Vitrine no banco:** exigiria escrita anônima ou login.

## Consequências

- `npm run dev` e produção mostram o mesmo tipo de dado: gravações reais. Sem a
  internet (ou no `npm run demo`), um recorte real de 3 dias, gerado por
  `scripts/gerar-dados-exemplo.mjs`.
- O relógio da tela é o da gravação (outubro de 2026, do simulador), não o do
  computador. O Visor também mostra esse relógio.
- Na fase 1 do treino a solução nutritiva é fixa: pH, EC, água e reservatório
  ficam parados, e o card diz "valor fixo na simulação".
- Quando houver estufa real, ela entra como outro adaptador da mesma porta
  (MQTT), escolhido em `dependencias.ts`; as telas não mudam.
