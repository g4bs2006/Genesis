import { Card } from '@astryxdesign/core/Card'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import type { ResumoCiclo } from '@/modules/estufa/dominio'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { contaDoCiclo, formatarReais, formatarReaisCurto } from '../domain/contas'
import { usePrecos } from './dados'

/** "Lucro previsto do ciclo": o que sobra na conta do Dinheiro, com os preços do produtor. */
export function LucroPrevisto({ resumo, plantas }: { resumo: ResumoCiclo | undefined; plantas: number }) {
  const { data: precos } = usePrecos()
  const esboco = useAtraso(!resumo || !precos)
  if (!resumo || !precos) return esboco ? <Skeleton height={92} radius={3} /> : null
  const c = contaDoCiclo(resumo, plantas, precos)
  return (
    <Card className="surgir">
      <VStack gap={1}>
        <Text type="label" color="secondary">
          Lucro previsto do ciclo
        </Text>
        <Text size="3xl" weight="medium" hasTabularNumbers>
          {formatarReaisCurto(c.sobra)}
        </Text>
        <Text type="supporting" color="secondary" hasTabularNumbers>
          venda de {formatarReaisCurto(c.venda)} ({plantas} pés a {formatarReais(c.precoDoPe)}) − gastos de{' '}
          {formatarReaisCurto(c.totalGastos)}
        </Text>
      </VStack>
    </Card>
  )
}
