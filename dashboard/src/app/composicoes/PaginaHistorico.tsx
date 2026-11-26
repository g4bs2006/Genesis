/**
 * Histórico (Produtor · desktop): o ciclo inteiro até agora, com filtro de
 * período, o histórico de alertas e a exportação CSV. Até o passo 09 ele só
 * repetia as últimas 24 h; o histórico de alertas morava no Ciclo (decisões do
 * Gabriel, passo 10).
 */
import { useMemo, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { NumberInput } from '@astryxdesign/core/NumberInput'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { ListaEventos, useEstufaAtual, useEventos, useJanela, type Estufa, type Passo } from '@/modules/estufa'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { formatarData, formatarHora } from '@/shared/lib/formatar'
import { ControleReproducao } from './ControleReproducao'
import { GraficosAbas } from './GraficosAbas'
import { passosParaCsv } from './series'

const DIA = 24 * 60 * 60 * 1000
/** a janela guarda o ciclo inteiro (35 dias) com folga */
const CICLO_INTEIRO = 40 * DIA

type Periodo = 'hoje' | 'semana' | 'intervalo' | 'ciclo'

export function PaginaHistorico() {
  const estufa = useEstufaAtual()
  const esboco = useAtraso(!estufa)
  if (!estufa) return esboco ? <Skeleton height={520} radius={3} /> : null
  return <Historico estufa={estufa} />
}

/** Dia do ciclo (contado do transplante) de cada passo, a partir do passo de agora. */
function diaDe(estufa: Estufa, atual: Passo, p: Passo): number {
  return estufa.diaDoCiclo - (Date.parse(atual.leitura.instante) - Date.parse(p.leitura.instante)) / DIA
}

function Historico({ estufa }: { estufa: Estufa }) {
  const [periodo, setPeriodo] = useState<Periodo>('hoje')
  const hoje = Math.floor(estufa.diaDoCiclo)
  const [de, setDe] = useState(Math.max(0, hoje - 3))
  const [ate, setAte] = useState(hoje)
  const { passos: todos, atual, carregando } = useJanela(estufa.id, CICLO_INTEIRO)
  const eventos = useEventos(estufa.id)
  const esboco = useAtraso(carregando)

  // o intervalo em dias do ciclo: [desde, até] (até = agora nos três primeiros)
  const [desde, ateDia] =
    periodo === 'hoje'
      ? [hoje, Infinity]
      : periodo === 'semana'
        ? [estufa.diaDoCiclo - 7, Infinity]
        : periodo === 'intervalo'
          ? [Math.min(de, ate), Math.max(de, ate) + 1]
          : [-Infinity, Infinity]
  const ultimoInstante = atual?.leitura.instante
  const passos = useMemo(
    () =>
      atual
        ? todos.filter((p) => {
            const d = diaDe(estufa, atual, p)
            return d >= desde && d < ateDia
          })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recalcula a cada passo novo (o array muda de identidade a cada render)
    [ultimoInstante, todos.length, desde, ateDia],
  )
  const [inicio, fim] = [passos[0]?.leitura.instante, passos.at(-1)?.leitura.instante]
  const alertas = eventos.data?.filter((e) => inicio && fim && e.instante >= inicio && e.instante <= fim)

  const baixarCsv = () => {
    // Blob: um "arquivo" criado na memória do navegador, baixado pelo link
    const blob = new Blob(['﻿' + passosParaCsv(passos)], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `genesis-historico-${periodo}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <VStack gap={4} paddingBlock={6}>
      <HStack justify="between" align="end" wrap="wrap" gap={3}>
        <VStack gap={1}>
          <ControleReproducao />
          <Heading level={1}>Histórico</Heading>
          <Text color="secondary">
            {inicio && fim
              ? `${formatarData(inicio)} ${formatarHora(inicio)} a ${formatarData(fim)} ${formatarHora(fim)}`
              : 'Nada neste período ainda.'}
          </Text>
        </VStack>
        <HStack gap={2} align="end" wrap="wrap">
          <SegmentedControl label="Período" value={periodo} onChange={(v) => setPeriodo(v as Periodo)}>
            <SegmentedControlItem value="hoje" label="Hoje" />
            <SegmentedControlItem value="semana" label="Esta semana" />
            <SegmentedControlItem value="intervalo" label="Dias" />
            <SegmentedControlItem value="ciclo" label="Ciclo todo" />
          </SegmentedControl>
          {periodo === 'intervalo' && (
            <>
              <NumberInput
                label="Do dia"
                value={de}
                min={0}
                max={hoje}
                onChange={(v) => setDe(limitar(v, hoje))}
                width={96}
              />
              <NumberInput
                label="Até o dia"
                value={ate}
                min={0}
                max={hoje}
                onChange={(v) => setAte(limitar(v, hoje))}
                width={96}
              />
            </>
          )}
          <Button
            label="Exportar CSV"
            icon={<ArrowDownTrayIcon width={16} aria-hidden />}
            onClick={baixarCsv}
            isDisabled={passos.length === 0}
          />
        </HStack>
      </HStack>

      <Card>
        {esboco && passos.length === 0 ? (
          <Skeleton height={420} radius={2} />
        ) : (
          <GraficosAbas passos={passos} altura={340} />
        )}
      </Card>

      <VStack gap={2}>
        <Heading level={2}>Alertas do período</Heading>
        <Card padding={2}>
          <ListaEventos eventos={alertas} limite={50} vazio="Nenhum alerta neste período." />
        </Card>
      </VStack>
    </VStack>
  )
}

const limitar = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(v || 0)))
