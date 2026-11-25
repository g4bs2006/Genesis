import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import type { Passo } from '@/modules/estufa'
import { OQueEIsso } from '@/modules/glossario'
import { camadas, SAIDAS, type Modelo } from '@/modules/treino'
import { DiagramaRede } from '@/shared/design-system/graficos/DiagramaRede'
import { formatarNumero } from '@/shared/lib/formatar'
import { fluxoNoPasso, TOLERANCIA_REDE } from './reproducao'

// rótulos curtos: o diagrama pequeno não tem espaço para "reposição de água"
const SAIDAS_CURTAS = ['exaustor', 'sombra', 'névoa', 'luz', 'A/B', 'ácido', 'água', 'bomba']

/**
 * Quantas vezes por segundo, no máximo, o diagrama se redesenha. Em 360× o
 * relógio anda 60 passos/s (um por quadro); a rede recalculada e o desenho
 * a cada quadro, em 4 gravações, competem com o relógio. 10 por segundo já
 * mostra o fluxo andando, e a última posição (pausa, fim) sempre aparece.
 * Medição no passo 07 (docs/passos/07-visual.html).
 */
export const ATUALIZACOES_POR_SEGUNDO = 10

/** O valor, mas mudando no máximo a cada `ms`; o último valor sempre chega. */
function useAmostrado<T>(valor: T, ms: number): T {
  const [amostra, setAmostra] = useState(valor)
  const ultimo = useRef(0)
  useEffect(() => {
    const falta = ms - (performance.now() - ultimo.current)
    const id = setTimeout(
      () => {
        ultimo.current = performance.now()
        setAmostra(valor)
      },
      Math.max(0, falta),
    )
    return () => clearTimeout(id)
  }, [valor, ms])
  return amostra
}

/**
 * A rede pequena ao lado de uma gravação: entradas acesas, os caminhos mais
 * fortes e as saídas (atuadores) no passo da reprodução. É recalculada no
 * navegador, então é ilustração; as ações da reprodução são as gravadas.
 */
export function MiniRede({ modelo, passos, passo }: { modelo: Modelo | undefined; passos: Passo[]; passo: number }) {
  const amostra = useAmostrado(passo, 1000 / ATUALIZACOES_POR_SEGUNDO)
  if (!modelo)
    return (
      <Text type="supporting" color="secondary">
        O modelo desta gravação não está na lista: sem diagrama da rede.
      </Text>
    )
  return <Desenho modelo={modelo} passos={passos} passo={amostra} />
}

// memo: só redesenha quando o passo amostrado muda, não a cada quadro do relógio
const Desenho = memo(function Desenho({ modelo, passos, passo }: { modelo: Modelo; passos: Passo[]; passo: number }) {
  const pesos = useMemo(() => {
    try {
      return camadasDe(modelo)
    } catch {
      return null
    }
  }, [modelo])
  const fluxo = useMemo(() => (pesos ? fluxoNoPasso(modelo, passos, passo) : null), [pesos, modelo, passos, passo])
  if (!pesos || !fluxo)
    return (
      <Text type="supporting" color="secondary">
        Os pesos do modelo {modelo.id} não batem com a arquitetura: sem diagrama.
      </Text>
    )
  const { ativacoes, divergencias } = fluxo
  return (
    <VStack gap={1}>
      <HStack gap={1} align="center">
        <Text type="supporting" color="secondary">
          rede · ilustração
        </Text>
        <OQueEIsso id="redeRecalculada" />
      </HStack>
      <DiagramaRede
        compacto
        ativacoes={ativacoes}
        pesos={pesos}
        saidas={SAIDAS_CURTAS}
        alertas={divergencias.map((d) => d.saida)}
        altura={150}
        rotulo={`Rede do modelo ${modelo.id} recalculada neste passo: ${SAIDAS.map((s, i) => `${s.rotulo} ${Math.round((ativacoes.at(-1)?.[i] ?? 0) * 100)}%`).join(', ')}`}
      />
      {divergencias.length > 0 && (
        <Text type="supporting" color="secondary">
          {/* o anel vermelho no diagrama marca a mesma saída */}≠ gravado (mais de {TOLERANCIA_REDE * 100} pontos):{' '}
          {divergencias
            .map(
              (d) =>
                `${SAIDAS[d.saida]!.rotulo} ${formatarNumero(d.recalculado * 100)}% × ${formatarNumero(d.gravado * 100)}%`,
            )
            .join(' · ')}
        </Text>
      )}
    </VStack>
  )
})

function camadasDe(modelo: Modelo) {
  return camadas(modelo).map((c) => c.pesos)
}
