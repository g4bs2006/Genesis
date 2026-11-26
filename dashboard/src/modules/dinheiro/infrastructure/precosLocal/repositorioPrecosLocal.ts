/**
 * Adaptadores das portas RepositorioPrecos e RepositorioLancamentos que
 * guardam tudo no próprio navegador (localStorage), até existir login e banco.
 */
import { z } from 'zod'
import { Precos, PrecosAntigos } from '../../domain/contrato'
import { Lancamento } from '../../domain/lancamentos'
import type { RepositorioLancamentos, RepositorioPrecos } from '../../application/portas'

export const CHAVE_PRECOS = 'genesis:precos'
export const CHAVE_LANCAMENTOS = 'genesis:lancamentos'

/**
 * Preços de partida, para o produtor trocar pelos seus na página Dinheiro.
 * VALORES DE REFERÊNCIA (ordem de grandeza, não cotação do dia; a mesma régua
 * que a nota do treino usa, controle/metricas.py):
 * - alface: R$ 2,00 o pé de 220 g;
 * - energia: R$ 0,85/kWh, tarifa média com impostos;
 * - água: R$ 8/m³, tarifa de concessionária;
 * - muda: R$ 0,15;
 * - adubo e embalagem: 0 até o produtor informar (a simulação não dosa adubo);
 * - mão de obra e outros: R$ 180 por ciclo de 35 dias.
 */
export const PRECOS_PADRAO: Precos = {
  alfacePorPe: 2.0,
  tarifaKwh: 0.85,
  aguaPorM3: 8,
  mudaPorUnidade: 0.15,
  aduboPorCiclo: 0,
  embalagemPorPe: 0,
  outrosPorCiclo: 180,
}

/** Ler o que está salvo sem nunca quebrar a tela: inválido ou ausente vira null. */
function ler(armazenamento: Storage, chave: string): unknown {
  try {
    const salvo = armazenamento.getItem(chave)
    return salvo === null ? null : JSON.parse(salvo)
  } catch {
    // JSON corrompido ou navegador sem acesso ao armazenamento (aba privada)
    return null
  }
}

/**
 * O armazenamento vem de fora (por padrão o localStorage) para o teste poder
 * passar um de mentira. Tudo que vem do navegador passa pelo Zod: o usuário
 * (ou uma versão velha do app) pode ter deixado lá qualquer coisa.
 */
export function criarRepositorioPrecosLocal(armazenamento: Storage = localStorage): RepositorioPrecos {
  return {
    async obter() {
      const salvo = ler(armazenamento, CHAVE_PRECOS)
      const atual = Precos.safeParse(salvo)
      if (atual.success) return atual.data
      // preços salvos antes do passo 11: o preço médio e os fixos continuam valendo
      const antigo = PrecosAntigos.safeParse(salvo)
      if (antigo.success) {
        const a = antigo.data
        return {
          ...PRECOS_PADRAO,
          alfacePorPe: a.alfacePorPe.medio,
          tarifaKwh: a.tarifaKwh,
          aguaPorM3: a.aguaPorM3,
          mudaPorUnidade: a.mudaPorUnidade,
          outrosPorCiclo: a.fixosPorCiclo,
        }
      }
      return PRECOS_PADRAO
    },
    async salvar(precos) {
      // confere antes de gravar; se falhar (preço negativo, quota cheia), a promessa rejeita e a tela avisa
      armazenamento.setItem(CHAVE_PRECOS, JSON.stringify(Precos.parse(precos)))
    },
  }
}

export function criarRepositorioLancamentosLocal(armazenamento: Storage = localStorage): RepositorioLancamentos {
  // um lançamento estragado não apaga os outros: só ele fica de fora
  const todos = (): Lancamento[] => {
    const salvo = ler(armazenamento, CHAVE_LANCAMENTOS)
    if (!Array.isArray(salvo)) return []
    return salvo.flatMap((l) => {
      const r = Lancamento.safeParse(l)
      return r.success ? [r.data] : []
    })
  }
  const gravar = (lista: Lancamento[]) =>
    armazenamento.setItem(CHAVE_LANCAMENTOS, JSON.stringify(z.array(Lancamento).parse(lista)))
  return {
    listar: async () => todos(),
    async adicionar(lancamento) {
      gravar([...todos(), Lancamento.parse(lancamento)])
    },
    async remover(id) {
      gravar(todos().filter((l) => l.id !== id))
    },
  }
}
