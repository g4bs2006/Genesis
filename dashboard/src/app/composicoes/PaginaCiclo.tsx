/**
 * Ciclo (Produtor): a alface estágio por estágio, a curva de crescimento e o
 * histórico de alertas. Junta estufa e alface: por isso fica em composicoes.
 */
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { AlfaceSvg, sementeDaEstufa } from '@/modules/alface'
import {
  curvaDeCrescimento,
  ESTAGIOS,
  estagioDoDia,
  ListaEventos,
  massaEsperada,
  useEstufaAtual,
  useEventos,
  usePassoAtual,
  type Estufa,
} from '@/modules/estufa'
import { CurvaCrescimento } from '@/shared/design-system/graficos/CurvaCrescimento'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { useTelaLarga } from '@/shared/hooks/useTelaLarga'
import { formatarData, formatarNumero } from '@/shared/lib/formatar'
import css from './PaginaCiclo.module.css'

const DIA_MS = 24 * 60 * 60 * 1000

export function PaginaCiclo() {
  const estufa = useEstufaAtual()
  const esboco = useAtraso(!estufa)
  if (!estufa) return esboco ? <Skeleton height={480} radius={3} /> : null
  return <Ciclo estufa={estufa} />
}

function Ciclo({ estufa }: { estufa: Estufa }) {
  const largo = useTelaLarga()
  const passo = usePassoAtual(estufa.id)
  const eventos = useEventos(estufa.id)
  const atual = estagioDoDia(estufa.diaDoCiclo)
  const faltam = Math.max(0, Math.ceil(estufa.diasDoCiclo - estufa.diaDoCiclo))
  const colheita = passo
    ? formatarData(new Date(new Date(passo.leitura.instante).getTime() + faltam * DIA_MS).toISOString())
    : null
  const semente = sementeDaEstufa(estufa.id)

  return (
    <VStack gap={5} paddingBlock={4}>
      <VStack gap={1}>
        <Heading level={1}>Ciclo</Heading>
        <Text color="secondary">
          {estufa.nome} · dia {Math.floor(estufa.diaDoCiclo)} de {estufa.diasDoCiclo}
          {colheita && ` · colheita prevista em ${colheita} (faltam ${faltam} dias)`}
        </Text>
      </VStack>

      <VStack gap={2}>
        <Heading level={2}>A alface por dia</Heading>
        <Grid columns={largo ? 4 : 2} gap={3}>
          {ESTAGIOS.map((e) => {
            const diaDoDesenho = e === atual ? estufa.diaDoCiclo : (e.inicio + e.fim) / 2
            const passou = estufa.diaDoCiclo >= e.fim
            return (
              <Card key={e.nome} padding={3} className={e === atual ? css.atual : passou ? '' : css.futuro}>
                <VStack gap={1}>
                  <AlfaceSvg
                    parametros={{ massa: massaEsperada(diaDoDesenho), turgor: 1, clorose: 0, necrose: 0 }}
                    semente={semente}
                    rotulo={`${e.nome}: cerca de ${Math.round(massaEsperada(diaDoDesenho))} g`}
                  />
                  <HStack justify="between" align="center">
                    <Text weight="medium">{e.nome}</Text>
                    <Text type="code" color="secondary">
                      d{e.inicio}–{e.fim}
                    </Text>
                  </HStack>
                  <Text type="supporting" color="secondary">
                    {e === atual ? `Agora: ${formatarNumero(estufa.massaPorPe)} g por pé.` : e.descricao}
                  </Text>
                </VStack>
              </Card>
            )
          })}
        </Grid>
      </VStack>

      <Card>
        <VStack gap={2}>
          <VStack gap={0.5}>
            <Text weight="medium">Curva de crescimento estimada</Text>
            <Text type="supporting" color="secondary">
              linha cheia: até hoje · tracejada: o esperado até a colheita
            </Text>
          </VStack>
          <CurvaCrescimento
            curva={curvaDeCrescimento(estufa.diasDoCiclo)}
            hoje={estufa.diaDoCiclo}
            massaHoje={estufa.massaPorPe}
            altura={largo ? 220 : 170}
          />
        </VStack>
      </Card>

      <VStack gap={2}>
        <Heading level={2}>Histórico de alertas</Heading>
        <Card padding={2}>
          <ListaEventos eventos={eventos.data} limite={largo ? 30 : 12} />
        </Card>
      </VStack>
    </VStack>
  )
}
