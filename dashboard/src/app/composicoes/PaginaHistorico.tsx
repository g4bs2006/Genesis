/** Histórico (Produtor · desktop): o gráfico de 24 h maior, com intervalo escolhível e CSV. */
import { useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { useEstufaAtual, useJanela, type Estufa } from '@/modules/estufa'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { formatarData, formatarHora } from '@/shared/lib/formatar'
import { GraficosAbas } from './GraficosAbas'
import { passosParaCsv } from './series'

const DIA = 24 * 60 * 60 * 1000
const INTERVALOS = { dia: DIA, semana: 7 * DIA, ciclo: 35 * DIA } as const
type Intervalo = keyof typeof INTERVALOS

export function PaginaHistorico() {
  const estufa = useEstufaAtual()
  const esboco = useAtraso(!estufa)
  if (!estufa) return esboco ? <Skeleton height={520} radius={3} /> : null
  return <Historico estufa={estufa} />
}

function Historico({ estufa }: { estufa: Estufa }) {
  const [intervalo, setIntervalo] = useState<Intervalo>('dia')
  const { passos, carregando } = useJanela(estufa.id, INTERVALOS[intervalo])
  const esboco = useAtraso(carregando)
  const primeiro = passos[0]
  const ultimo = passos.at(-1)
  const cobertura = primeiro && ultimo ? Date.parse(ultimo.leitura.instante) - Date.parse(primeiro.leitura.instante) : 0

  const baixarCsv = () => {
    // Blob: um "arquivo" criado na memória do navegador, baixado pelo link
    const blob = new Blob(['﻿' + passosParaCsv(passos)], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `genesis-${estufa.id}-${intervalo}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <VStack gap={4} paddingBlock={6}>
      <HStack justify="between" align="end" wrap="wrap" gap={3}>
        <VStack gap={1}>
          <Heading level={1}>Histórico</Heading>
          <Text color="secondary">
            {estufa.nome}
            {primeiro && ultimo && (
              <>
                {' · '}
                {formatarData(primeiro.leitura.instante)} {formatarHora(primeiro.leitura.instante)} a{' '}
                {formatarData(ultimo.leitura.instante)} {formatarHora(ultimo.leitura.instante)}
              </>
            )}
          </Text>
        </VStack>
        <HStack gap={2} align="center">
          <SegmentedControl label="Intervalo" value={intervalo} onChange={(v) => setIntervalo(v as Intervalo)}>
            <SegmentedControlItem value="dia" label="Dia" />
            <SegmentedControlItem value="semana" label="Semana" />
            <SegmentedControlItem value="ciclo" label="Ciclo" />
          </SegmentedControl>
          <Button
            label="Exportar CSV"
            icon={<ArrowDownTrayIcon width={16} aria-hidden />}
            onClick={baixarCsv}
            isDisabled={passos.length === 0}
          />
        </HStack>
      </HStack>

      {intervalo !== 'dia' && cobertura > 0 && cobertura < INTERVALOS[intervalo] * 0.9 && (
        <Text type="supporting" color="secondary">
          A fonte de dados guarda só as últimas {Math.round(cobertura / 3600000)} horas: o gráfico mostra o que existe.
        </Text>
      )}

      <Card>
        {esboco && passos.length === 0 ? (
          <Skeleton height={420} radius={2} />
        ) : (
          <GraficosAbas passos={passos} altura={320} />
        )}
      </Card>
    </VStack>
  )
}
