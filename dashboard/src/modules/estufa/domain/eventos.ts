/**
 * Os eventos de uma sequência de passos: quando uma variável entra em risco
 * (erro), quando volta para a faixa (acerto) e quando a segurança barra uma
 * ação (barrado). Tudo tirado dos passos, sem inventar nada.
 */
import { estadoDaVariavel, VARIAVEIS_COM_ESTADO, valorExibido } from './agora'
import type { Evento, Passo } from './contrato'
import { FAIXAS, valorDe, type Variavel } from './faixas'

const NOME_ATUADOR: Record<string, string> = {
  exaustor: 'o exaustor',
  nebulizacao: 'a névoa',
  sombreamento: 'a sombra',
  luz: 'a luz',
  dosagemAB: 'a dose de nutriente',
  dosagemAcido: 'a dose de ácido',
  reposicaoAgua: 'a reposição de água',
  bomba: 'a bomba',
}

const numero = (v: number, casas: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

const comUnidade = (v: Variavel, valor: number) => {
  const f = FAIXAS[v]
  return `${numero(valorExibido(v, valor), f.casas)}${v === 'nivel' || f.unidade === '%' ? '%' : f.unidade ? ` ${f.unidade}` : ''}`
}

export function eventosDosPassos(passos: readonly Passo[], estufaId: string): Evento[] {
  const eventos: Evento[] = []
  passos.forEach((p, i) => {
    const anterior = passos[i - 1]
    for (const v of VARIAVEIS_COM_ESTADO) {
      const agora = estadoDaVariavel(p, v)
      const antes = anterior ? estadoDaVariavel(anterior, v) : 'ok'
      const f = FAIXAS[v]
      const valor = valorDe(p.leitura, v)
      // só a entrada em risco conta: "atenção" na beira da faixa daria centenas de eventos
      if (agora === 'risco' && antes !== 'risco')
        eventos.push({
          estufaId,
          instante: p.leitura.instante,
          tipo: 'erro',
          titulo: `${f.nome} ${valor > f.max ? 'acima' : 'abaixo'} da faixa: ${comUnidade(v, valor)}`,
          detalhe: `faixa boa: ${comUnidade(v, f.min)} a ${comUnidade(v, f.max)}`,
          variavel: v,
          passo: i,
        })
      if (agora === 'ok' && antes === 'risco')
        eventos.push({
          estufaId,
          instante: p.leitura.instante,
          tipo: 'acerto',
          titulo: `${f.nome} voltou para a faixa: ${comUnidade(v, valor)}`,
          detalhe: 'dentro da faixa boa de novo',
          variavel: v,
          passo: i,
        })
    }
    for (const b of p.barradas)
      eventos.push({
        estufaId,
        instante: p.leitura.instante,
        tipo: 'barrado',
        titulo: `A segurança barrou ${NOME_ATUADOR[b.atuador] ?? b.atuador}`,
        detalhe: b.motivo,
        passo: i,
      })
  })
  return eventos
}
