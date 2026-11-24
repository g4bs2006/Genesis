import { Card } from '@astryxdesign/core/Card'
import { HStack } from '@astryxdesign/core/HStack'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { massaEsperada, type Estufa, type Leitura } from '@/modules/estufa/dominio'
import { formatarData, formatarNumero } from '@/shared/lib/formatar'
import { aparenciaMedia, descreverPlanta } from '../domain/estadoDaPlanta'
import { AlfaceImagem } from './AlfaceImagem'

const DIA_MS = 24 * 60 * 60 * 1000

/** A alface da estufa: o desenho, o dia do ciclo, a massa contra a meta e a colheita prevista. */
export function CardAlface({
  estufa,
  leitura,
  deitado = false,
  rodape,
  recentes,
}: {
  estufa: Estufa
  leitura: Leitura
  deitado?: boolean
  /** conteúdo extra embaixo (a curva de crescimento, no desktop) */
  rodape?: React.ReactNode
  /** leituras da última hora: a aparência é a média delas */
  recentes?: Leitura[]
}) {
  const parametros = aparenciaMedia(recentes?.length ? recentes : [leitura], estufa.massaPorPe)
  const meta = massaEsperada(estufa.diaDoCiclo)
  const faltam = Math.max(0, Math.ceil(estufa.diasDoCiclo - estufa.diaDoCiclo))
  const colheita = new Date(new Date(leitura.instante).getTime() + faltam * DIA_MS).toISOString()
  const dia = Math.floor(estufa.diaDoCiclo)

  const desenho = <AlfaceImagem parametros={parametros} rotulo={descreverPlanta(parametros)} largura={340} />
  const numeros = (
    <VStack gap={2}>
      <HStack justify="between" align="end">
        <Text weight="medium">
          Dia {dia} de {estufa.diasDoCiclo}
        </Text>
        <Text type="supporting" color="secondary">
          colheita em {formatarData(colheita)}
        </Text>
      </HStack>
      <ProgressBar
        label="Progresso do ciclo"
        isLabelHidden
        value={estufa.diaDoCiclo}
        max={estufa.diasDoCiclo}
        variant="success"
      />
      <HStack gap={2} align="end">
        <Text size="2xl" weight="medium" hasTabularNumbers>
          {formatarNumero(estufa.massaPorPe)} g
        </Text>
        <Text type="supporting" color="secondary" hasTabularNumbers>
          por pé · meta de hoje {formatarNumero(meta)} g
        </Text>
      </HStack>
    </VStack>
  )

  return (
    <Card>
      {deitado ? (
        <HStack gap={4} align="center">
          <VStack width="45%">{desenho}</VStack>
          <VStack width="55%">{numeros}</VStack>
        </HStack>
      ) : (
        <VStack gap={3}>
          <VStack maxWidth={320} width="100%" style={{ marginInline: 'auto' }}>
            {desenho}
          </VStack>
          {numeros}
          {rodape}
        </VStack>
      )}
    </Card>
  )
}
