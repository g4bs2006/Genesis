import { useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { HStack } from '@astryxdesign/core/HStack'
import { NumberInput } from '@astryxdesign/core/NumberInput'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { Folha } from '@/shared/design-system/organisms/Folha'
import css from './FormularioPrecos.module.css'
import { Precos } from '../domain/contrato'
import { PRECOS_PADRAO } from '../infrastructure/precosLocal'
import { usePrecos, useSalvarPrecos } from './dados'

type Props = { aberto: boolean; aoMudar: (aberto: boolean) => void }

/** Os preços do produtor. Cada um com a fonte de referência; tudo conferido pelo Zod antes de salvar. */
export function FormularioPrecos({ aberto, aoMudar }: Props) {
  const { data } = usePrecos()
  return (
    <Folha titulo="Editar preços" aberta={aberto} aoMudar={aoMudar}>
      {/* a chave remonta o rascunho a cada abertura: começa sempre dos preços salvos */}
      {data && aberto && <Campos key={JSON.stringify(data)} inicial={data} aoTerminar={() => aoMudar(false)} />}
    </Folha>
  )
}

function Campos({ inicial, aoTerminar }: { inicial: Precos; aoTerminar: () => void }) {
  const [p, setP] = useState<Precos>(inicial)
  const salvar = useSalvarPrecos()
  const conferido = Precos.safeParse(p)
  const campo = (rotulo: string, valor: number, mudar: (v: number) => void, fonte: string, unidade: string) => (
    <NumberInput
      label={rotulo}
      description={fonte}
      value={valor}
      onChange={(v) => mudar(Number.isFinite(v) ? Math.max(0, v) : 0)}
      min={0}
      step={0.01}
      units={unidade}
    />
  )

  return (
    <VStack gap={4} paddingBlock={2}>
      <Text type="supporting" color="secondary">
        Valores de referência para começar. Ponha os seus: a conta do ciclo muda na hora. Ficam salvos neste navegador.
      </Text>
      <FormLayout>
        {campo(
          'Alface',
          p.alfacePorPe,
          (v) => setP({ ...p, alfacePorPe: v }),
          'Por quanto você vende um pé de 220 g. Pé maior vale até 10% a mais.',
          'R$/pé',
        )}
        {campo('Energia', p.tarifaKwh, (v) => setP({ ...p, tarifaKwh: v }), 'A tarifa da sua conta de luz', 'R$/kWh')}
        {campo('Água', p.aguaPorM3, (v) => setP({ ...p, aguaPorM3: v }), 'A tarifa da sua conta de água', 'R$/m³')}
        {campo('Mudas', p.mudaPorUnidade, (v) => setP({ ...p, mudaPorUnidade: v }), 'Preço de uma muda', 'R$')}
        {campo(
          'Adubo no ciclo',
          p.aduboPorCiclo,
          (v) => setP({ ...p, aduboPorCiclo: v }),
          'Quanto você gasta de sais (A+B) num ciclo',
          'R$',
        )}
        {campo(
          'Embalagem',
          p.embalagemPorPe,
          (v) => setP({ ...p, embalagemPorPe: v }),
          'Saquinho ou caixa por pé vendido (0 se não usa)',
          'R$/pé',
        )}
        {campo(
          'Mão de obra e outros',
          p.outrosPorCiclo,
          (v) => setP({ ...p, outrosPorCiclo: v }),
          'Seu trabalho e a estrutura (estufa, bomba, canos) divididos por ciclo',
          'R$',
        )}
      </FormLayout>
      {!conferido.success && <Text color="secondary">Confira os valores: nenhum pode ser negativo.</Text>}
      {/* ações presas embaixo: o "Salvar" fica à vista sem rolar os campos */}
      <HStack gap={2} justify="between" className={css.acoes}>
        <Button label="Voltar aos valores de referência" variant="ghost" onClick={() => setP(PRECOS_PADRAO)} />
        <Button
          label="Salvar preços"
          variant="primary"
          size="lg"
          isDisabled={!conferido.success}
          clickAction={async () => {
            if (!conferido.success) return
            await salvar.mutateAsync(conferido.data)
            aoTerminar()
          }}
        />
      </HStack>
    </VStack>
  )
}
