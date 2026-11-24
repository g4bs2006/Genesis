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
        Valores de referência para começar. Ponha os seus: a conta do Dinheiro muda na hora.
      </Text>
      <FormLayout>
        <Text weight="medium">Alface (R$ por pé vendido, cabeça de 220 g)</Text>
        {campo(
          'Preço baixo',
          p.alfacePorPe.baixo,
          (v) => setP({ ...p, alfacePorPe: { ...p.alfacePorPe, baixo: v } }),
          'CEAGESP / Conab Prohort: entressafra cheia',
          'R$',
        )}
        {campo(
          'Preço médio',
          p.alfacePorPe.medio,
          (v) => setP({ ...p, alfacePorPe: { ...p.alfacePorPe, medio: v } }),
          'CEAGESP / Conab Prohort: média do ano',
          'R$',
        )}
        {campo(
          'Preço alto',
          p.alfacePorPe.alto,
          (v) => setP({ ...p, alfacePorPe: { ...p.alfacePorPe, alto: v } }),
          'CEAGESP / Conab Prohort: escassez',
          'R$',
        )}
        <Text weight="medium">Custos</Text>
        {campo(
          'Energia',
          p.tarifaKwh,
          (v) => setP({ ...p, tarifaKwh: v }),
          'Tarifa média com bandeira (ANEEL)',
          'R$/kWh',
        )}
        {campo('Nutrientes', p.nutrientePorKg, (v) => setP({ ...p, nutrientePorKg: v }), 'Sal nutritivo A+B', 'R$/kg')}
        {campo(
          'Ácido (corretor de pH)',
          p.acidoPorL,
          (v) => setP({ ...p, acidoPorL: v }),
          'Solução ácida para pH',
          'R$/L',
        )}
        {campo('Água', p.aguaPorM3, (v) => setP({ ...p, aguaPorM3: v }), 'Tarifa da concessionária', 'R$/m³')}
        {campo('Mudas', p.mudaPorUnidade, (v) => setP({ ...p, mudaPorUnidade: v }), 'Preço por muda', 'R$')}
        {campo(
          'Custos fixos por ciclo',
          p.fixosPorCiclo,
          (v) => setP({ ...p, fixosPorCiclo: v }),
          'Estrutura e equipamentos divididos por ciclo, mão de obra',
          'R$',
        )}
      </FormLayout>
      {!conferido.success && <Text color="secondary">Confira os valores: nenhum pode ser negativo.</Text>}
      {/* ações presas embaixo: o "Salvar" fica à vista sem rolar os 9 campos */}
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
