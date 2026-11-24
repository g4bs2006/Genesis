/**
 * Agente × regras (Produtor · desktop): a comparação detalhada.
 * A tabela do resultado, onde cada um erra (tempo fora da faixa por variável)
 * e os eventos de cada um, lado a lado.
 */
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import {
  FAIXAS,
  ListaEventos,
  useEstufas,
  useEventos,
  useResumoCiclo,
  type Estufa,
  type Variavel,
} from '@/modules/estufa'
import { BarrasComparadas } from '@/shared/design-system/graficos/BarrasComparadas'
import { useTelaLarga } from '@/shared/hooks/useTelaLarga'
import { ComparacaoAgenteRegras } from './ComparacaoAgenteRegras'

export function PaginaAgenteRegras() {
  const estufas = useEstufas()
  const largo = useTelaLarga()
  const agente = estufas.data?.find((e) => e.controlador.tipo === 'agente')
  const regras = estufas.data?.find((e) => e.controlador.tipo === 'regras')
  return (
    <VStack gap={5} paddingBlock={6}>
      <VStack gap={1}>
        <Heading level={1}>Agente × regras fixas</Heading>
        <Text color="secondary">
          A mesma estufa, o mesmo clima e as mesmas plantas: só muda quem decide. Os dados de exemplo têm um ciclo; com
          o backend, cada ciclo novo entra aqui.
        </Text>
      </VStack>
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
