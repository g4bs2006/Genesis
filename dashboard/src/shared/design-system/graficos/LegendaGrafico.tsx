import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'

export type ItemLegenda = { nome: string; cor: string; tracejada?: boolean }

/**
 * Legenda dos gráficos de linha. Só aparece com duas linhas ou mais: com uma,
 * o título do card já diz o que ela é. O tracinho repete o traço da linha
 * (cheio ou tracejado), então a identidade não depende só da cor.
 */
export function LegendaGrafico({ itens }: { itens: ItemLegenda[] }) {
  if (itens.length < 2) return null
  return (
    <HStack gap={4} wrap="wrap" align="center">
      {itens.map((i) => (
        <HStack key={i.nome} gap={1.5} align="center">
          <svg width={18} height={8} aria-hidden>
            <line
              x1={1}
              x2={17}
              y1={4}
              y2={4}
              stroke={i.cor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={i.tracejada ? '4 3' : undefined}
            />
          </svg>
          <Text type="supporting" color="secondary">
            {i.nome}
          </Text>
        </HStack>
      ))}
    </HStack>
  )
}
