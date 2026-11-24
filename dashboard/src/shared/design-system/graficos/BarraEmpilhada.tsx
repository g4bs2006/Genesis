import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import css from './BarraEmpilhada.module.css'

export type Fatia = { chave: string; rotulo: string; valor: number; cor: string }

/**
 * Uma barra só, dividida nas partes de um total (para onde vai o dinheiro da
 * venda). Abaixo, a legenda com o valor de cada parte. Sem SVG: blocos com
 * largura proporcional, que acompanham o tamanho da tela.
 */
export function BarraEmpilhada({
  fatias,
  formatar,
  rotulo,
}: {
  fatias: Fatia[]
  formatar: (v: number) => string
  rotulo: string
}) {
  const total = fatias.reduce((s, f) => s + Math.max(0, f.valor), 0) || 1
  return (
    <VStack gap={3}>
      <span
        className={css.barra}
        role="img"
        aria-label={`${rotulo}: ${fatias.map((f) => `${f.rotulo} ${formatar(f.valor)}`).join(', ')}`}
      >
        {fatias.map((f) =>
          f.valor > 0 ? (
            <span
              key={f.chave}
              className={css.fatia}
              style={{ flexGrow: f.valor / total, background: f.cor }}
              title={`${f.rotulo}: ${formatar(f.valor)}`}
            />
          ) : null,
        )}
      </span>
      <HStack gap={4} wrap="wrap">
        {fatias.map((f) => (
          <HStack key={f.chave} gap={1.5} align="center">
            <span className={css.ponto} style={{ background: f.cor }} aria-hidden />
            <Text type="supporting" color="secondary">
              {f.rotulo}
            </Text>
            <Text type="supporting" hasTabularNumbers>
              {formatar(f.valor)}
            </Text>
          </HStack>
        ))}
      </HStack>
    </VStack>
  )
}
