/** Números e horários no jeito brasileiro (vírgula decimal, fuso de São Paulo). */

const cacheNumero = new Map<number, Intl.NumberFormat>()

export function formatarNumero(valor: number, casas = 0): string {
  let f = cacheNumero.get(casas)
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
    cacheNumero.set(casas, f)
  }
  return f.format(valor)
}

const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const data = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' })

/** "14:30" a partir de um instante ISO */
export const formatarHora = (instante: string) => hora.format(new Date(instante))
/** "23 de nov." a partir de um instante ISO */
export const formatarData = (instante: string) => data.format(new Date(instante))
