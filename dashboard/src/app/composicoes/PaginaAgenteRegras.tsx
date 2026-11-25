/**
 * Agente × regras (Produtor · desktop): a comparação detalhada.
 * Primeiro a linha no tempo (agente e regras na mesma variável, 24 h), depois
 * a tabela do resultado, onde cada um erra e os eventos de cada um.
 */
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Selector } from '@astryxdesign/core/Selector'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useState } from 'react'
import {
  FAIXAS,
  ListaEventos,
  useEstufas,
  useEventos,
  useJanela,
  useResumoCiclo,
  valorDe,
  valorExibido,
  type Estufa,
  type Variavel,
} from '@/modules/estufa'
import { BarrasComparadas } from '@/shared/design-system/graficos/BarrasComparadas'
import { GraficoSerie } from '@/shared/design-system/graficos/GraficoSerie'
import { formatarHora } from '@/shared/lib/formatar'
import { useTelaLarga } from '@/shared/hooks/useTelaLarga'
import { ComparacaoAgenteRegras } from './ComparacaoAgenteRegras'
import { faixa, formato } from './series'

export function PaginaAgenteRegras() {
  const estufas = useEstufas()
  const largo = useTelaLarga()
  const agente = estufas.data?.find((e) => e.controlador.tipo === 'agente')
  const regras = estufas.data?.find((e) => e.controlador.tipo === 'regras')
  return (
    <VStack gap={5} paddingBlock={6}>
      <VStack gap={1}>
        <Heading level={1}>Agente × regras fixas</Heading>
        <Text color="secondary">A mesma estufa, o mesmo clima e as mesmas plantas: só muda quem decide.</Text>
      </VStack>
      {agente && regras && <NoTempo agente={agente} regras={regras} />}
      <Card>
        <ComparacaoAgenteRegras />
      </Card>
      {agente && regras && (
        <>
          <Card>
            <VStack gap={2}>
              <Heading level={2}>Onde cada um erra</Heading>
              <Text type="supporting" color="secondary">
                Quanto do tempo cada variável ficou fora da faixa boa. Menos é melhor.
              </Text>
              <ForaPorVariavel agente={agente} regras={regras} />
            </VStack>
          </Card>
          <Grid columns={largo ? 2 : 1} gap={4}>
            <EventosDe estufa={agente} titulo="O que o agente fez" />
            <EventosDe estufa={regras} titulo="O que as regras fizeram" />
          </Grid>
        </>
      )}
    </VStack>
  )
}

const VARIAVEIS: Variavel[] = ['temperatura', 'umidade', 'ph', 'ec', 'temperaturaAgua']

/** As duas estufas na mesma variável, nas últimas 24 horas: quem segura melhor a faixa. */
function NoTempo({ agente, regras }: { agente: Estufa; regras: Estufa }) {
  const [variavel, setVariavel] = useState<Variavel>('temperatura')
  const largo = useTelaLarga()
  const a = useJanela(agente.id).passos
  const r = useJanela(regras.id).passos
  const pontos = (passos: typeof a) =>
    passos.map((p) => ({ t: Date.parse(p.leitura.instante), v: valorExibido(variavel, valorDe(p.leitura, variavel)) }))
  return (
    <Card>
      <VStack gap={3}>
        <HStack justify="between" align="center" wrap="wrap" gap={2}>
          <Heading level={2}>No tempo: as últimas 24 horas</Heading>
          {largo ? (
            <SegmentedControl label="Variável" value={variavel} onChange={(v) => setVariavel(v as Variavel)}>
              {VARIAVEIS.map((v) => (
                <SegmentedControlItem key={v} value={v} label={FAIXAS[v].nome} />
              ))}
            </SegmentedControl>
          ) : (
            // estreito: 5 opções não cabem lado a lado sem cortar o nome
            <Selector
              label="Variável"
              isLabelHidden
              value={variavel}
              onChange={(v) => setVariavel((v ?? 'temperatura') as Variavel)}
              options={VARIAVEIS.map((v) => ({ value: v, label: FAIXAS[v].nome }))}
            />
          )}
        </HStack>
        <GraficoSerie
          series={[
            { nome: 'Agente', cor: 'var(--serie-azul)', pontos: pontos(a) },
            // regras fixas = a referência: tracejada, como na curva de aprendizado
            { nome: 'Regras fixas', cor: 'var(--serie-cinza)', pontos: pontos(r), tracejada: true },
          ]}
          faixa={faixa(variavel)}
          altura={340}
          rotulo={`${FAIXAS[variavel].nome} com o agente e com as regras fixas, nas últimas 24 horas`}
          formatarValor={formato(variavel)}
          formatarTempo={(t) => formatarHora(new Date(t).toISOString())}
        />
      </VStack>
    </Card>
  )
}

function ForaPorVariavel({ agente, regras }: { agente: Estufa; regras: Estufa }) {
  const ra = useResumoCiclo(agente.id).data
  const rr = useResumoCiclo(regras.id).data
  if (!ra || !rr) return <Skeleton height={250} radius={2} />
  const variaveis = Object.keys(ra.foraPorVariavel) as Variavel[]
  return (
    <BarrasComparadas
      grupos={variaveis.map((v) => ({
        rotulo: FAIXAS[v]?.nome ?? v,
        valores: [(ra.foraPorVariavel[v] ?? 0) * 100, (rr.foraPorVariavel[v] ?? 0) * 100],
      }))}
      series={[
        { nome: 'Agente', cor: 'var(--serie-azul)' },
        { nome: 'Regras fixas', cor: 'var(--serie-cinza)' },
      ]}
      formatar={(v) => `${v.toFixed(1).replace('.', ',')}%`}
    />
  )
}

function EventosDe({ estufa, titulo }: { estufa: Estufa; titulo: string }) {
  const eventos = useEventos(estufa.id)
  return (
    <Card padding={3}>
      <VStack gap={2}>
        <Heading level={3}>{titulo}</Heading>
        <ListaEventos eventos={eventos.data} limite={10} />
      </VStack>
    </Card>
  )
}
