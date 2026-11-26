# Contrato de dados: backend → dashboard

O dashboard nunca sabe se os dados vêm do simulador, do treino ou da estufa
real. Ele pede tudo a **portas** (interfaces) e recebe neste formato. **O
backend precisa entregar exatamente isto**, ou combinar a mudança antes:
mudou o contrato, muda este documento e os esquemas.

- Fonte da verdade (esquemas Zod, conferidos quando o dado chega):
  - `dashboard/src/modules/estufa/domain/contrato.ts`
  - `dashboard/src/modules/treino/domain/contrato.ts`
  - `dashboard/src/modules/dinheiro/domain/contrato.ts`
- Portas: `dashboard/src/modules/*/application/portas.ts`.
- Exemplos completos e válidos: os JSON em `dashboard/src/modules/*/infrastructure/dadosExemplo/`.

## Convenções

- **Instantes:** ISO 8601 com fuso, sempre `America/Sao_Paulo`: `2026-11-23T14:30:00-03:00`.
- **Unidades:**
  - temperaturas em °C;
  - umidade em % (0–100);
  - VPD em kPa;
  - CO₂ em ppm;
  - luz em µmol/m²/s (PPFD);
  - EC em mS/cm;
  - nível do reservatório em fração (0–1);
  - radiação em W/m²;
  - dinheiro em R$.
- **Passo:** 10 minutos de estufa.
- **Nomes de campo:** em português, sem acento (`temperaturaAgua`), em camelCase.

## Estufa

```ts
// Uma leitura de sensores (ler_sensores() no plano)
type Leitura = {
  estufaId: string;
  instante: string;
  ar: {
    temperatura: number;
    umidade: number;
    vpd: number;
    co2: number;
    luz: number;
  };
  solucao: { ph: number; ec: number; temperaturaAgua: number; nivel: number };
  fora: { temperatura: number; umidade: number; radiacao: number };
  tarifaKwh: number; // R$/kWh neste instante
  exemplos?: string[]; // campos preenchidos com valor de exemplo, ex.: ['solucao.ph']
};
// O que o agente decidiu (acionar(acoes))
type Acoes = {
  exaustor: number;
  nebulizacao: number;
  sombreamento: number;
  luz: number; // 0..1
  dosagemAB: number;
  dosagemAcido: number; // ml no passo
  reposicaoAgua: boolean;
  bomba: boolean;
};
type AcaoBarrada = { atuador: keyof Acoes; pedido: number; motivo: string }; // camada de segurança
type Passo = { leitura: Leitura; acoes: Acoes; barradas: AcaoBarrada[] };

type Controlador =
  | { tipo: "agente"; modeloId: string }
  | { tipo: "regras" }
  | { tipo: "pid" }
  | { tipo: "nada" };
type Estufa = {
  id: string;
  nome: string;
  origem: "simulada" | "real";
  controlador: Controlador;
  plantas: number;
  diaDoCiclo: number;
  diasDoCiclo: number;
  massaPorPe: number;
};

type Evento = {
  estufaId: string;
  instante: string;
  tipo: "acerto" | "erro" | "barrado" | "perturbacao";
  titulo: string;
  detalhe: string;
  variavel?: string;
  passo?: number;
};
```

**Novo em relação ao prompt original** (o dashboard precisa; confirmar com o backend):

```ts
// Resumo do ciclo: tabela "Agente × regras" e o Dinheiro
type ResumoCiclo = {
  estufaId: string;
  massaPorPe: number; // g na colheita (ou projetada)
  energiaKwh: number;
  aguaL: number;
  nutrienteG: number;
  acidoMl: number;
  foraDaFaixa: number; // 0..1 do tempo
  foraPorVariavel: Record<string, number>; // 0..1 por variável
  barradas: number; // ações barradas no ciclo
};
type Perturbacao =
  | "ondaDeCalor"
  | "phDescalibra"
  | "bombaTrava"
  | "quedaDeEnergia"
  | "ruidoSensores"
  | "tarifaDePico";
```

`Leitura.exemplos` existe para o simulador de brinquedo, que só simula a
temperatura do ar: os outros campos levam valor de exemplo e a tela marca
"exemplo". A estufa real não manda esse campo.

## Treino

```ts
type Geracao = {
  numero: number;
  fase: 1 | 2 | 3 | 4 | 5 | 6;
  melhor: number;
  mediana: number;
  regras: number;
  segundos: number;
}; // notas em R$ por ciclo
type Modelo = {
  id: string;
  geracao: number;
  fase: number;
  arquitetura: number[]; // ex.: [20, 32, 32, 8]
  pesos: number[]; // camada a camada: pesos e depois vieses
  provaPorFase: Record<number, number>;
}; // 0..1, para o "esqueceu?"
type Gravacao = {
  id: string;
  semente: number;
  modeloId: string; // nas réguas: "regras-fixas" e "sem-controle"
  passos: Passo[];
  // passo 09 (opcionais: as gravações de antes não têm)
  controlador?: "agente" | "regras" | "nada"; // ausente = "agente"
  massaPorDia?: number[]; // g/pé: [0] no transplante, [d] no fim do dia d
  resumo?: ResumoDaGravacao;
};
type ResumoDaGravacao = ResumoCiclo & { nota: number }; // o ciclo gravado, medido no treino (controle/metricas.py)
```

**Novos** (confirmar):

```ts
type ResumoGravacao = {
  id: string;
  semente: number;
  modeloId: string;
  titulo: string;
  criadaEm: string;
  passos: number;
  // passo 09 (opcionais)
  controlador?: "agente" | "regras" | "nada";
  geracao?: number | null; // a geração do campeão; null nas réguas
  resumo?: ResumoDaGravacao;
}; // a lista, sem os passos
type EstadoTreino = {
  rodando: boolean;
  onde: string;
  faseAtual: 1 | 2 | 3 | 4 | 5 | 6;
  geracaoAtual: number;
  iniciadoEm: string;
  criterioPassagem: string;
  inicioPorFase: Record<number, number>;
}; // geração em que cada fase começou
type ConfigTreino = {
  populacao: number;
  elite: number;
  torneio: number;
  mutacao: number;
  misturaFases: number;
  arquitetura: number[];
  passoMinutos: number;
};
```

**Passo 09 (25/11/2026).** Toda gravação usa o mesmo clima (`SEMENTE_GRAVACAO`
em `treino/treinar.py`), então campeões de gerações diferentes, as regras fixas
e "sem controle" são comparáveis lado a lado. Na geração 1 o treino grava o
campeão dela e as duas réguas; as execuções de antes ganharam essas gravações
pelo `treino/reavaliar.py` (sem retreinar), em `treino/reavaliacoes/<execucao>/`.

Na nuvem, `controlador`, `geracao` e `resumo` não têm coluna na tabela
`genesis.gravacoes`: vão no índice da pasta, que o `treino/nuvem.py` manda ao
Storage como `<execucao>/indice.json` (pasta do treino) e
`<execucao>/indice-reavaliacao.json` (pasta da reavaliação). O dashboard junta
os dois às linhas da tabela, valendo a reavaliação.

A gravação traz as **ações** de cada passo: o dashboard reproduz o que
aconteceu, não recalcula a rede (GPU em float32 e navegador arredondam
diferente; ver "Mostrar a evolução" no plano).

Ordem dos `pesos` de um `Modelo` (para o diagrama da rede): para cada camada,
primeiro a matriz `entradas × saídas` (linha por entrada), depois os vieses.

## Dinheiro

```ts
type Precos = {
  alfacePorPe: { baixo: number; medio: number; alto: number };
  tarifaKwh: number;
  nutrientePorKg: number;
  acidoPorL: number;
  aguaPorM3: number;
  mudaPorUnidade: number;
  fixosPorCiclo: number;
};
```

Os preços são do produtor (editáveis na tela). Hoje ficam no navegador; o
backend só precisa guardá-los quando houver conta de usuário.

## Portas (o que o dashboard pede)

| Porta               | Métodos                                                                                       | Quem implementa hoje                              | Depois                          |
| ------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------- |
| `FonteEstufa`       | `listarEstufas`, `assinarPassos` (tempo real), `historico(de, ate)`, `eventos`, `resumoCiclo` | `dadosExemplo` (demo), `simuladorBrinquedo` (dev) | Supabase Realtime / MQTT        |
| `ControleSimulacao` | relógio (pausar, acelerar, pular) e `injetar(perturbacao)`                                    | `simuladorBrinquedo`                              | simulador PyTorch (só simulada) |
| `FonteTreino`       | `estado`, `geracoes`, `modelos`, `configuracao`                                               | `dadosExemplo`                                    | arquivos exportados pelo treino |
| `FonteGravacoes`    | `listar`, `obter(id)`                                                                         | `dadosExemplo`                                    | arquivos exportados pelo treino |
| `RepositorioPrecos` | `obter`, `salvar`                                                                             | `precosLocal` (navegador)                         | banco                           |
