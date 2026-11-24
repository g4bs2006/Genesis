/**
 * Adaptador da porta RepositorioPrecos que guarda os preços no próprio
 * navegador (localStorage), até existir um banco.
 */
import { Precos } from '../../domain/contrato'
import type { RepositorioPrecos } from '../../application/portas'

export const CHAVE_PRECOS = 'genesis:precos'

/**
 * Preços de partida, para o produtor ajustar na tela de Ajustes.
 * VALORES DE REFERÊNCIA, A CONFIRMAR (ordem de grandeza, não cotação do dia):
 * - alface por pé: CEAGESP / Conab Prohort, alface crespa hidropônica no atacado
 *   (pé baixo, médio e alto conforme a época do ano);
 * - tarifa: ANEEL, tarifa residencial/rural média com impostos, em R$/kWh;
 * - nutriente, ácido, muda: preço de varejo de insumos para hidroponia;
 * - água: tarifa de concessionária estadual por m³;
 * - fixos: equipamento amortizado e mão de obra rateados por ciclo de 35 dias.
 */
export const PRECOS_PADRAO: Precos = {
  alfacePorPe: { baixo: 1.2, medio: 2.0, alto: 3.0 },
  tarifaKwh: 0.85,
  nutrientePorKg: 18,
  acidoPorL: 25,
  aguaPorM3: 8,
  mudaPorUnidade: 0.15,
  fixosPorCiclo: 180,
}

/**
 * O armazenamento vem de fora (por padrão o localStorage) para o teste poder
 * passar um de mentira. Tudo que vem do navegador passa pelo Zod: o usuário
 * (ou uma versão velha do app) pode ter deixado lá qualquer coisa.
 */
export function criarRepositorioPrecosLocal(armazenamento: Storage = localStorage): RepositorioPrecos {
  return {
    async obter() {
      try {
        const salvo = armazenamento.getItem(CHAVE_PRECOS)
        if (salvo === null) return PRECOS_PADRAO
        const conferido = Precos.safeParse(JSON.parse(salvo))
        // inválido: volta aos padrões em vez de quebrar a tela de Dinheiro
        return conferido.success ? conferido.data : PRECOS_PADRAO
      } catch {
        // JSON corrompido ou navegador sem acesso ao armazenamento (aba privada)
        return PRECOS_PADRAO
      }
    },
    async salvar(precos) {
      // confere antes de gravar; se falhar (preço negativo, quota cheia), a promessa rejeita e a tela avisa
      armazenamento.setItem(CHAVE_PRECOS, JSON.stringify(Precos.parse(precos)))
    },
  }
}
