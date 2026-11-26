import { useMemo, useState } from 'react'
import { Tab, TabList } from '@astryxdesign/core/TabList'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import type { Passo } from '@/modules/estufa'
import { GraficoSerie } from '@/shared/design-system/graficos/GraficoSerie'
import { formatarData, formatarHora } from '@/shared/lib/formatar'
import { abasDoHistorico } from './series'

/** Os gráficos com abas (Temperatura · pH e EC · Água · Luz e CO₂). Usado no Agora e no Histórico. */
export function GraficosAbas({ passos, altura = 200 }: { passos: Passo[]; altura?: number }) {
  // recalcula só quando chega passo novo (não a cada render)
  const instanteFinal = passos.at(-1)?.leitura.instante
  // eslint-disable-next-line react-hooks/exhaustive-deps -- passos muda de identidade a cada render; o último instante basta
  const abas = useMemo(() => abasDoHistorico(passos), [instanteFinal, passos.length])
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
      <TabList value={aba} onChange={setAba} hasDivider role="tablist">
        {abas.map((a) => (
          <Tab key={a.id} value={a.id} label={a.nome} panelId={`painel-${a.id}`} />
        ))}
      </TabList>
      <VStack gap={3} id={`painel-${atual.id}`} role="tabpanel">
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
              marcas={p.marcas}
              // cada gráfico com a altura inteira: pH e EC não ficam espremidos em meia altura
              altura={altura}
              rotulo={`${p.titulo} no período, com a faixa boa e as ações do controlador`}
              formatarValor={p.formatarValor}
              formatarTempo={formatarTempo}
            />
          </VStack>
        ))}
      </VStack>
      {atual.paineis.some((p) => p.marcas.length > 0) && (
        <Text type="supporting" color="secondary">
          ▲ ligou · ▼ desligou, na cor de cada equipamento (as faixas embaixo do gráfico mostram a força)
        </Text>
      )}
    </VStack>
  )
}
