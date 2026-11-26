/**
 * Dinheiro: lucro × gasto da estufa. Junta estufa (o ciclo e os consumos) e
 * dinheiro (preços e contas): por isso mora em composicoes.
 * Celular: a versão curta. Desktop: completa.
 */
import { useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { PencilSquareIcon } from '@heroicons/react/24/outline'
import {
  barraDeCustos,
  FormularioPrecos,
  formatarReais,
  formatarReaisCurto,
  MASSA_COMERCIAL_G,
  MASSA_MINIMA_VENDA_G,
  pontoDeEquilibrio,
  projecao,
  resultadoDoCiclo,
  usePrecos,
  type Cenario,
  type Precos,
} from '@/modules/dinheiro'
import { useEstufaAtual, useResumoCiclo, type Estufa, type ResumoCiclo } from '@/modules/estufa'
import { BarraEmpilhada } from '@/shared/design-system/graficos/BarraEmpilhada'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { useTelaLarga } from '@/shared/hooks/useTelaLarga'
import { formatarNumero } from '@/shared/lib/formatar'
import { ControleReproducao } from './ControleReproducao'

const COR_FATIA: Record<string, string> = {
  energia: 'var(--serie-amarelo)',
  nutrientes: 'var(--serie-roxo)',
  acido: 'var(--serie-laranja)',
  agua: 'var(--serie-azul)',
  mudas: 'var(--serie-menta)',
  fixos: 'var(--serie-cinza)',
  lucro: 'var(--ok)',
}
const NOME_CENARIO: Record<Cenario, string> = { baixo: 'Preço baixo', medio: 'Preço médio', alto: 'Preço alto' }

export function PaginaDinheiro() {
  const estufa = useEstufaAtual()
  const resumo = useResumoCiclo(estufa?.id ?? '')
  const precos = usePrecos()
  const [editando, setEditando] = useState(false)
  const pronto = estufa && resumo.data && precos.data
  const esboco = useAtraso(!pronto)
  return (
    <>
      {pronto ? (
        <Dinheiro estufa={estufa} resumo={resumo.data} precos={precos.data} aoEditar={() => setEditando(true)} />
      ) : (
        esboco && <Skeleton height={560} radius={3} />
      )}
      <FormularioPrecos aberto={editando} aoMudar={setEditando} />
    </>
  )
}

function Dinheiro({
  estufa,
  resumo,
  precos,
  aoEditar,
}: {
  estufa: Estufa
  resumo: ResumoCiclo
  precos: Precos
  aoEditar: () => void
}) {
  const largo = useTelaLarga()
  const [cenario, setCenario] = useState<Cenario>('medio')
  const r = resultadoDoCiclo(resumo, estufa.plantas, precos, cenario)
  const p = projecao(r.lucro, estufa.diasDoCiclo)
  const fatias = barraDeCustos(r).map((f) => ({ ...f, cor: COR_FATIA[f.chave] ?? 'var(--serie-cinza)' }))
  const prejuizo = r.lucro < 0

  const topo = (
    <HStack justify="between" align="end" wrap="wrap" gap={3}>
      <VStack gap={1}>
        <ControleReproducao />
        <Heading level={1}>Dinheiro</Heading>
        <Text color="secondary">
          {estufa.nome} · {estufa.plantas} pés · ciclo de {estufa.diasDoCiclo} dias
        </Text>
      </VStack>
      <Button
        label="Editar preços"
        size={largo ? 'md' : 'lg'}
        icon={<PencilSquareIcon width={16} aria-hidden />}
        onClick={aoEditar}
      />
    </HStack>
  )

  const seletor = (
    <SegmentedControl
      label="Cenário de preço"
      layout={largo ? 'hug' : 'fill'}
      size="lg"
      value={cenario}
      onChange={(v) => setCenario(v as Cenario)}
    >
      <SegmentedControlItem value="baixo" label="Baixo" />
      <SegmentedControlItem value="medio" label="Médio" />
      <SegmentedControlItem value="alto" label="Alto" />
    </SegmentedControl>
  )

  const lucro = (
    <Card>
      <VStack gap={2}>
        <Text type="label" color="secondary">
          {prejuizo ? 'Prejuízo' : 'Lucro'} previsto · {NOME_CENARIO[cenario].toLowerCase()} (
          {formatarReais(precos.alfacePorPe[cenario])}/pé)
        </Text>
        {/* largura mínima: no celular "por ano" desce para a linha de baixo em vez de sair do card */}
        <Grid columns={{ minWidth: 140, repeat: 'fit' }} gap={3}>
          {(
            [
              ['por ciclo', p.ciclo],
              ['por mês', p.mes],
              ['por ano', p.ano],
            ] as const
          ).map(([rotulo, v]) => (
            <VStack key={rotulo} gap={0.5}>
              <Text
                size={rotulo === 'por ciclo' ? '3xl' : 'xl'}
                weight="medium"
                hasTabularNumbers
                color={prejuizo ? 'primary' : 'primary'}
              >
                {formatarReaisCurto(v)}
              </Text>
              <Text type="supporting" color="secondary">
                {rotulo}
              </Text>
            </VStack>
          ))}
        </Grid>
        <Text type="supporting" color="secondary" hasTabularNumbers>
          Venda de {formatarReaisCurto(r.receita)} − gastos de {formatarReaisCurto(r.custos.total)} · margem de{' '}
          {formatarNumero(r.margem * 100)}%
        </Text>
      </VStack>
    </Card>
  )

  const barra = (
    <Card>
      <VStack gap={2}>
        <Heading level={2}>Para onde vai o dinheiro da venda</Heading>
        <BarraEmpilhada fatias={fatias} formatar={formatarReaisCurto} rotulo="Custos e lucro do ciclo" />
      </VStack>
    </Card>
  )

  if (!largo)
    return (
      <VStack gap={4} paddingBlock={4}>
        {topo}
        {seletor}
        {lucro}
        {barra}
        <Cenarios estufa={estufa} resumo={resumo} precos={precos} />
      </VStack>
    )

  return (
    <VStack gap={5} paddingBlock={6}>
      {topo}
      {seletor}
      <Grid columns={2} gap={4}>
        {lucro}
        <Equilibrio estufa={estufa} resumo={resumo} precos={precos} cenario={cenario} />
      </Grid>
      {barra}
      <Cenarios estufa={estufa} resumo={resumo} precos={precos} />
      <Suposicoes />
    </VStack>
  )
}

function Cenarios({ estufa, resumo, precos }: { estufa: Estufa; resumo: ResumoCiclo; precos: Precos }) {
  return (
    <Card>
      <VStack gap={2}>
        <HStack gap={1} align="center">
          <Heading level={2}>Cenários de preço</Heading>
        </HStack>
        <Grid columns={3} gap={3}>
          {(['baixo', 'medio', 'alto'] as const).map((c) => {
            const lucro = resultadoDoCiclo(resumo, estufa.plantas, precos, c).lucro
            return (
              <VStack key={c} gap={0.5}>
                <Text type="supporting" color="secondary">
                  {NOME_CENARIO[c]} · {formatarReais(precos.alfacePorPe[c])}
                </Text>
                <Text size="lg" weight="medium" hasTabularNumbers>
                  {formatarReaisCurto(lucro)}
                </Text>
                <Text type="supporting" color="secondary">
                  por ciclo
                </Text>
              </VStack>
            )
          })}
        </Grid>
      </VStack>
    </Card>
  )
}

function Equilibrio({
  estufa,
  resumo,
  precos,
  cenario,
}: {
  estufa: Estufa
  resumo: ResumoCiclo
  precos: Precos
  cenario: Cenario
}) {
  const e = pontoDeEquilibrio(resumo, estufa.plantas, precos, cenario)
  return (
    <Card>
      <VStack gap={2}>
        <HStack gap={1} align="center">
          <Heading level={2}>Ponto de equilíbrio</Heading>
        </HStack>
        <Text color="secondary">Abaixo disto, a estufa não se paga.</Text>
        <Grid columns={2} gap={3}>
          <VStack gap={0.5}>
            <Text size="xl" weight="medium" hasTabularNumbers>
              {Number.isFinite(e.precoMinimoPorPe) ? formatarReais(e.precoMinimoPorPe) : '—'}
            </Text>
            <Text type="supporting" color="secondary">
              preço mínimo por pé
            </Text>
          </VStack>
          <VStack gap={0.5}>
            <Text size="xl" weight="medium" hasTabularNumbers>
              {Number.isFinite(e.plantasMinimas) ? `${formatarNumero(Math.ceil(e.plantasMinimas))} pés` : 'não se paga'}
            </Text>
            <Text type="supporting" color="secondary">
              plantas mínimas no preço {NOME_CENARIO[cenario].toLowerCase().replace('preço ', '')}
            </Text>
          </VStack>
        </Grid>
      </VStack>
    </Card>
  )
}

/** As contas assumem coisas: elas ficam à vista, para ninguém tomar a projeção por promessa. */
function Suposicoes() {
  return (
    <Card variant="muted">
      <VStack gap={1}>
        <HStack gap={1} align="center">
          <Text weight="medium">Como a conta é feita</Text>
        </HStack>
        <Text type="supporting" color="secondary">
          Preço por pé de uma cabeça de {MASSA_COMERCIAL_G} g (bônus até 10%); abaixo de {MASSA_MINIMA_VENDA_G} g não
          vende.
        </Text>
      </VStack>
    </Card>
  )
}
