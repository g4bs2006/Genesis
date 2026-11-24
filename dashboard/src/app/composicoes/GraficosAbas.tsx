import { useState } from 'react'
import { Tab, TabList } from '@astryxdesign/core/TabList'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import type { Passo } from '@/modules/estufa'
import { GraficoSerie } from '@/shared/design-system/graficos/GraficoSerie'
import { formatarData, formatarHora } from '@/shared/lib/formatar'
import { abasDoHistorico } from './series'

/** Os gráficos com abas (Temperatura · pH e EC · Água · Luz e CO₂). Usado no Agora e no Histórico. */
export function GraficosAbas({ passos, altura = 200 }: { passos: Passo[]; altura?: number }) {
  const abas = abasDoHistorico(passos)
  const [aba, setAba] = useState(abas[0]!.id)
  const atual = abas.find((a) => a.id === aba) ?? abas[0]!
  const primeiro = passos[0]
  const ultimo = passos.at(-1)
  // mais de 2 dias na tela: o eixo mostra a data em vez da hora
  const longo =
    primeiro && ultimo ? Date.parse(ultimo.leitura.instante) - Date.parse(primeiro.leitura.instante) > 2 * 864e5 : false
  const formatarTempo = (t: number) => (longo ? formatarData : formatarHora)(new Date(t).toISOString())

  return (
    <VStack gap={3}>
      <TabList value={aba} onChange={setAba} hasDivider>
        {abas.map((a) => (
          <Tab key={a.id} value={a.id} label={a.nome} />
        ))}
      </TabList>
      {atual.paineis.map((p) => (
        <VStack key={p.titulo} gap={1}>
          <Text type="label" color="secondary">
            {p.titulo}
            {p.series.length > 1 && ' · dentro (cheia) e fora (tracejada)'}
          </Text>
          <GraficoSerie
            series={p.series}
            faixa={p.faixa}
            acoes={p.acoes}
            altura={atual.paineis.length > 1 ? altura * 0.75 : altura}
            rotulo={`${p.titulo} no período, com a faixa boa e as ações do controlador`}
            formatarValor={p.formatarValor}
            formatarTempo={formatarTempo}
          />
        </VStack>
      ))}
      <Text type="supporting" color="secondary">
        Faixa verde: onde a alface fica bem. Embaixo, as ações do controlador (mais escuro = mais forte; pontos =
        doses).
      </Text>
    </VStack>
  )
}
