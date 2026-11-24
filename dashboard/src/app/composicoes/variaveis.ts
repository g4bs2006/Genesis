/** Como cada variável aparece na tela: número formatado, faixa e o selo "exemplo". */
import { FAIXAS, valorExibido, type Passo, type Variavel } from '@/modules/estufa'
import { formatarNumero } from '@/shared/lib/formatar'

const CAMINHO: Record<Variavel, string> = {
  temperatura: 'ar.temperatura',
  umidade: 'ar.umidade',
  vpd: 'ar.vpd',
  co2: 'ar.co2',
  luz: 'ar.luz',
  ph: 'solucao.ph',
  ec: 'solucao.ec',
  temperaturaAgua: 'solucao.temperaturaAgua',
  nivel: 'solucao.nivel',
}

export const ehExemplo = (passo: Passo, v: Variavel) => passo.leitura.exemplos?.includes(CAMINHO[v]) ?? false

export function formatarVariavel(v: Variavel, valor: number) {
  return formatarNumero(valorExibido(v, valor), FAIXAS[v].casas)
}

export function faixaTexto(v: Variavel) {
  const f = FAIXAS[v]
  return `${formatarVariavel(v, f.min)} a ${formatarVariavel(v, f.max)}${v === 'nivel' ? '%' : ''}`
}
