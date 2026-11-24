import { Badge } from '@astryxdesign/core/Badge'
import { List, ListItem } from '@astryxdesign/core/List'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { formatarData, formatarHora } from '@/shared/lib/formatar'
import type { Evento } from '../domain/contrato'

const SELO_EVENTO: Record<Evento['tipo'], { rotulo: string; variante: 'success' | 'error' | 'warning' | 'info' }> = {
  acerto: { rotulo: 'acerto', variante: 'success' },
  erro: { rotulo: 'erro', variante: 'error' },
  barrado: { rotulo: 'barrado', variante: 'warning' },
  perturbacao: { rotulo: 'perturbação', variante: 'info' },
}

type Props = {
  eventos: Evento[] | undefined
  /** quantos mostrar (os mais recentes primeiro) */
  limite?: number
  aoEscolher?: (evento: Evento) => void
  vazio?: string
}

/** Linha do tempo de eventos: o que o controlador acertou, errou, o que foi barrado e as perturbações. */
export function ListaEventos({ eventos, limite = 20, aoEscolher, vazio = 'Nada aconteceu ainda.' }: Props) {
  const esboco = useAtraso(!eventos)
  if (!eventos)
    return esboco ? (
      <VStack gap={2}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={44} radius={2} index={i} />
        ))}
      </VStack>
    ) : null
  if (eventos.length === 0) return <Text color="secondary">{vazio}</Text>
  const ordenados = [...eventos].sort((a, b) => b.instante.localeCompare(a.instante)).slice(0, limite)
  return (
    <List hasDividers density="compact" edge="flush">
      {ordenados.map((e) => (
        <ListItem
          key={`${e.instante}-${e.titulo}`}
          align="first-line"
          startContent={<Badge variant={SELO_EVENTO[e.tipo].variante} label={SELO_EVENTO[e.tipo].rotulo} />}
          // título quebra linha (nada de reticências): no celular a frase inteira importa
          label={<Text weight="medium">{e.titulo}</Text>}
          description={
            <Text type="supporting" color="secondary">
              {formatarData(e.instante)} · {e.detalhe}
            </Text>
          }
          endContent={
            <Text type="code" color="secondary">
              {formatarHora(e.instante)}
            </Text>
          }
          onClick={aoEscolher ? () => aoEscolher(e) : undefined}
        />
      ))}
    </List>
  )
}
