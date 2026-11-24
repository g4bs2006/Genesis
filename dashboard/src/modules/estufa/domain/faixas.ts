/**
 * Faixas boas para alface em NFT e o semáforo de cada variável.
 * Fonte: docs/plano.md (pH, EC, água) e estudo/ (ar 18 a 26 °C). As demais
 * são referências comuns da literatura, a confirmar com o orientador.
 */
import type { Leitura } from './contrato'

export type EstadoVariavel = 'ok' | 'atencao' | 'risco'

export type Variavel =
  | 'temperatura'
  | 'umidade'
  | 'vpd'
  | 'co2'
  | 'luz'
  | 'ph'
  | 'ec'
  | 'temperaturaAgua'
  | 'nivel'

export type Faixa = {
  min: number
  max: number
  unidade: string
  /** Nome curto para o produtor */
  nome: string
  /** Jargão explicado em poucas palavras (VPD, EC...) */
  apoio?: string
  casas: number
}

export const FAIXAS: Record<Variavel, Faixa> = {
  temperatura: { min: 18, max: 26, unidade: '°C', nome: 'Ar', casas: 1 },
  umidade: { min: 60, max: 80, unidade: '%', nome: 'Umidade', casas: 0 },
  vpd: { min: 0.5, max: 1.2, unidade: 'kPa', nome: 'VPD', apoio: 'a sede do ar', casas: 2 },
  co2: { min: 400, max: 1000, unidade: 'ppm', nome: 'CO₂', casas: 0 },
  luz: { min: 0, max: 600, unidade: 'µmol/m²/s', nome: 'Luz', casas: 0 },
  ph: { min: 5.5, max: 6.5, unidade: '', nome: 'pH', apoio: 'acidez da água', casas: 1 },
  ec: { min: 1.2, max: 1.8, unidade: 'mS/cm', nome: 'Nutrientes', apoio: 'EC, o adubo na água', casas: 1 },
  temperaturaAgua: { min: 18, max: 24, unidade: '°C', nome: 'Água', casas: 1 },
  nivel: { min: 0.3, max: 1, unidade: '%', nome: 'Reservatório', casas: 0 },
}

/** Onde cada variável mora dentro da Leitura. */
export function valorDe(leitura: Leitura, variavel: Variavel): number {
  switch (variavel) {
    case 'temperatura':
    case 'umidade':
    case 'vpd':
    case 'co2':
    case 'luz':
      return leitura.ar[variavel]
    case 'ph':
    case 'ec':
    case 'temperaturaAgua':
    case 'nivel':
      return leitura.solucao[variavel]
  }
}

/**
 * Semáforo: dentro da faixa é ok; até 15% da largura da faixa para fora é
 * atenção (dá tempo de corrigir); além disso, risco.
 */
export function estadoDe(valor: number, faixa: Pick<Faixa, 'min' | 'max'>): EstadoVariavel {
  if (valor >= faixa.min && valor <= faixa.max) return 'ok'
  const margem = (faixa.max - faixa.min) * 0.15
  const distancia = valor < faixa.min ? faixa.min - valor : valor - faixa.max
  return distancia <= margem ? 'atencao' : 'risco'
}

/** O pior estado entre vários (para o card agrupado e a frase do topo). */
export function piorEstado(estados: EstadoVariavel[]): EstadoVariavel {
  if (estados.includes('risco')) return 'risco'
  if (estados.includes('atencao')) return 'atencao'
  return 'ok'
}
