import type { ReactNode } from 'react'
import { Badge } from '@astryxdesign/core/Badge'
import { Card } from '@astryxdesign/core/Card'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { SeloEstado, type Estado } from '../atoms/SeloEstado'
import css from './CardVariavel.module.css'

type Props = {
  nome: string
  /** jargão explicado ao lado do nome ("a sede do ar") */
  apoio?: string
  valor: string
  unidade?: string
  /** a faixa boa, ex.: "5,5 a 6,5" */
  faixa?: string
  estado: Estado
  /** linhas extras pequenas (ex.: "VPD 0,9 kPa · a sede do ar") */
  detalhe?: ReactNode
  /** sparkline ou outro gráfico pequeno */
  grafico?: ReactNode
  /** valor de exemplo (o simulador de brinquedo não mede isso) */
  exemplo?: boolean
  tamanho?: 'compacto' | 'normal'
  /** seta de tendência (↑ ↓), num lugar fixo: o número não sai do lugar quando ela some */
  tendencia?: string
}

/** Card de uma variável da estufa: valor, faixa e bolinha. Borda amarela/vermelha quando pede atenção. */
export function CardVariavel({
  nome,
  apoio,
  valor,
  unidade,
  faixa,
  estado,
  detalhe,
  grafico,
  exemplo,
  tamanho = 'normal',
  tendencia,
}: Props) {
  return (
    <Card padding={tamanho === 'compacto' ? 3 : 4} className={`${css.card} ${css[estado]}`}>
      <VStack gap={tamanho === 'compacto' ? 1 : 2}>
        <HStack gap={1.5} align="center" justify="between">
          <Text type="label" color="secondary" maxLines={1}>
            {nome}
            {apoio && <span className={css.apoio}> · {apoio}</span>}
          </Text>
          <SeloEstado estado={estado} />
        </HStack>
        <HStack gap={1} align="end">
          <span className={tamanho === 'compacto' ? css.valorCompacto : css.valor}>{valor}</span>
          {unidade && <span className={css.unidade}>{unidade}</span>}
          {tendencia !== undefined && (
            <span className={css.seta} aria-hidden style={{ visibility: tendencia ? 'visible' : 'hidden' }}>
              {tendencia || '↑'}
            </span>
          )}
          {exemplo && <Badge variant="neutral" label="exemplo" />}
        </HStack>
        {grafico}
        {(faixa || detalhe) && (
          <VStack gap={0.5}>
            {detalhe && (
              <Text type="supporting" color="secondary">
                {detalhe}
              </Text>
            )}
            {faixa && <span className={css.faixa}>faixa {faixa}</span>}
          </VStack>
        )}
      </VStack>
    </Card>
  )
}
