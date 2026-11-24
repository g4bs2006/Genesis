/**
 * O currículo de 6 fases (docs/plano.md, "O currículo") e o diagnóstico de
 * esquecimento. Puro e testado.
 */
import type { EstadoTreino, Modelo } from './contrato'

export type FaseInfo = { numero: number; nome: string; obstaculo: string; aprende: string }

export const FASES: FaseInfo[] = [
  {
    numero: 1,
    nome: 'Ar',
    obstaculo: 'Só o clima do ar, sensores perfeitos, dias amenos',
    aprende: 'Ventilar e nebulizar na hora certa',
  },
  { numero: 2, nome: 'Solução', obstaculo: 'A solução nutritiva entra no jogo', aprende: 'Manter pH e EC na faixa' },
  {
    numero: 3,
    nome: 'Clima real',
    obstaculo: 'Clima do INMET e tarifa de energia variando',
    aprende: 'Ondas de calor e economizar no horário caro',
  },
  { numero: 4, nome: 'Ruído', obstaculo: 'Ruído nos sensores', aprende: 'Não reagir a leitura falsa' },
  {
    numero: 5,
    nome: 'Descalibra',
    obstaculo: 'Sensor de pH descalibrando com o tempo',
    aprende: 'Desconfiar e cruzar informações',
  },
  { numero: 6, nome: 'Falhas', obstaculo: 'Bomba trava, queda de energia', aprende: 'Reagir a emergências' },
]

export type SituacaoFase = 'feita' | 'atual' | 'futura'

/** Situação de cada fase e o intervalo de gerações em que ela rodou. */
export function situacaoDasFases(
  estado: Pick<EstadoTreino, 'faseAtual' | 'geracaoAtual' | 'inicioPorFase'>,
): (FaseInfo & { situacao: SituacaoFase; inicio?: number; fim?: number })[] {
  return FASES.map((f) => {
    const inicio = estado.inicioPorFase[String(f.numero)]
    const proxima = estado.inicioPorFase[String(f.numero + 1)]
    const situacao: SituacaoFase =
      f.numero < estado.faseAtual ? 'feita' : f.numero === estado.faseAtual ? 'atual' : 'futura'
    const fim =
      situacao === 'feita' && proxima !== undefined
        ? proxima - 1
        : situacao === 'atual'
          ? estado.geracaoAtual
          : undefined
    return { ...f, situacao, inicio, fim }
  })
}

export const LIMIAR_ESQUECEU = 0.9

export type Prova = { fase: number; acerto: number; esqueceu: boolean; aprendendo: boolean; sugestao?: string }

/**
 * "Ele esqueceu algo?": o campeão refaz a prova de cada fase já vista. Abaixo
 * de 90%, é o esquecimento catastrófico (aprender o novo apagou o velho) e a
 * sugestão é misturar mais cenários daquela fase no treino.
 */
export function provas(modelo: Pick<Modelo, 'provaPorFase' | 'fase'>): Prova[] {
  return Object.entries(modelo.provaPorFase)
    .map(([fase, acerto]) => ({ fase: Number(fase), acerto }))
    .sort((a, b) => a.fase - b.fase)
    .map((p) => {
      // a fase de agora ainda está sendo aprendida: só fase anterior pode ser "esquecida"
      const aprendendo = p.fase >= modelo.fase
      const esqueceu = !aprendendo && p.acerto < LIMIAR_ESQUECEU
      const nome = FASES.find((f) => f.numero === p.fase)?.nome ?? `fase ${p.fase}`
      return esqueceu
        ? {
            ...p,
            esqueceu,
            aprendendo,
            sugestao: `Aumentar a mistura de cenários da fase ${p.fase} (${nome}) nas próximas gerações.`,
          }
        : { ...p, esqueceu, aprendendo }
    })
}
