import { Card } from '@astryxdesign/core/Card'
import { HStack } from '@astryxdesign/core/HStack'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { useEstadoTreino } from './dados'

/** "Treino rodando": onde, em que fase e geração. Fica na barra lateral do Desenvolvedor. */
export function CardTreinoLateral() {
  const { data, isPending } = useEstadoTreino()
  const esboco = useAtraso(isPending)
  // nada até ter o esboço ou o dado: sem card vazio piscando
  if (!esboco && !data) return null
  return (
    <VStack paddingInline={2} paddingBlock={3}>
      <Card padding={3}>
        {esboco && !data && <Skeleton height={72} radius={2} />}
        {data && (
          <VStack gap={1} className="surgir">
            <HStack gap={1.5} align="center">
              <StatusDot variant={data.rodando ? 'success' : 'neutral'} label={data.rodando ? 'rodando' : 'parado'} />
              <Text weight="medium">{data.rodando ? 'Treino rodando' : 'Treino parado'}</Text>
            </HStack>
            <Text type="supporting" color="secondary">
              {data.onde}
            </Text>
            <Text type="supporting" color="secondary" hasTabularNumbers>
              Fase {data.faseAtual} · geração {data.geracaoAtual}
            </Text>
          </VStack>
        )}
      </Card>
    </VStack>
  )
}
