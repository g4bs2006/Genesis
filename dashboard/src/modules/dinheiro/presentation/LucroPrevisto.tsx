import { Card } from '@astryxdesign/core/Card'
import { HStack } from '@astryxdesign/core/HStack'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import type { ResumoCiclo } from '@/modules/estufa/dominio'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { formatarReais, formatarReaisCurto, resultadoDoCiclo } from '../domain/contas'
import { usePrecos } from './dados'

/** "Lucro previsto do ciclo": o número que resume o dinheiro, no cenário de preço médio. */
export function LucroPrevisto({ resumo, plantas }: { resumo: ResumoCiclo | undefined; plantas: number }) {
  const { data: precos } = usePrecos()
  const esboco = useAtraso(!resumo || !precos)
  if (!resumo || !precos) return esboco ? <Skeleton height={92} radius={3} /> : null
  const r = resultadoDoCiclo(resumo, plantas, precos, 'medio')
  return (
    <Card className="surgir">
      <VStack gap={1}>
        <Text type="label" color="secondary">
          Lucro previsto do ciclo
        </Text>
        <HStack gap={2} align="end">
          <Text size="3xl" weight="medium" hasTabularNumbers>
            {formatarReaisCurto(r.lucro)}
          </Text>
        </HStack>
        <Text type="supporting" color="secondary" hasTabularNumbers>
          {plantas} pés a {formatarReais(precos.alfacePorPe.medio)} · gasto de {formatarReaisCurto(r.custos.total)}
        </Text>
      </VStack>
    </Card>
  )
}
