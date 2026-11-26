/**
 * Ciclo (Produtor): a alface estágio por estágio e a curva de crescimento
 * (gramas por pé). O histórico de alertas foi para o Histórico (decisão do
 * Gabriel, passo 10). A massa de cada dia vem da gravação reproduzida; junta
 * estufa e alface, por isso fica em composicoes.
 */
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { AlfaceImagem } from '@/modules/alface'
import {
  curvaDoCiclo,
  ESTAGIOS,
  estagioDoDia,
  massaNoDia,
  useEstufaAtual,
  usePassoAtual,
  type Estufa,
} from '@/modules/estufa'
import { CurvaCrescimento } from '@/shared/design-system/graficos/CurvaCrescimento'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { useTelaLarga } from '@/shared/hooks/useTelaLarga'
import { formatarData, formatarNumero } from '@/shared/lib/formatar'
import { ControleReproducao } from './ControleReproducao'
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
  const atual = estagioDoDia(estufa.diaDoCiclo)
  const faltam = Math.max(0, Math.ceil(estufa.diasDoCiclo - estufa.diaDoCiclo))
  const colheita = passo
    ? formatarData(new Date(new Date(passo.leitura.instante).getTime() + faltam * DIA_MS).toISOString())
    : null
  // a massa de um dia: a da gravação; sem ela (estufa real), só a de hoje é conhecida
  const massaDoDia = (dia: number) => (estufa.massaPorDia ? massaNoDia(estufa.massaPorDia, dia) : null)

  return (
    <VStack gap={5} paddingBlock={4}>
      <VStack gap={1}>
        <ControleReproducao />
        <Heading level={1}>Ciclo</Heading>
        <Text color="secondary">
          Dia {Math.floor(estufa.diaDoCiclo)} de {estufa.diasDoCiclo}
          {colheita &&
            ` · colheita prevista em ${colheita} (${faltam === 1 ? 'falta 1 dia' : `faltam ${faltam} dias`})`}
        </Text>
      </VStack>

      <VStack gap={2}>
        <Heading level={2}>A alface por dia</Heading>
        <Grid columns={largo ? 4 : 2} gap={3}>
          {ESTAGIOS.map((e) => {
            const diaDoDesenho = e === atual ? estufa.diaDoCiclo : (e.inicio + e.fim) / 2
            const massa = e === atual ? estufa.massaPorPe : massaDoDia(diaDoDesenho)
            const passou = estufa.diaDoCiclo >= e.fim
            return (
              <Card key={e.nome} padding={3} className={e === atual ? css.atual : passou ? '' : css.futuro}>
                <VStack gap={1}>
                  {massa !== null && (
                    <AlfaceImagem
                      parametros={{ massa, turgor: 1, clorose: 0, necrose: 0 }}
                      rotulo={`${e.nome}: cerca de ${Math.round(massa)} g`}
                    />
                  )}
                  <HStack justify="between" align="center" wrap="wrap" gap={1}>
                    <Text weight="medium">{e.nome}</Text>
                    <Text type="code" color="secondary" textWrap="nowrap">
                      d{e.inicio}–{e.fim}
                    </Text>
                  </HStack>
                  <Text type="supporting" color="secondary">
                    {e === atual
                      ? `Agora: ${formatarNumero(estufa.massaPorPe)} g por pé.`
                      : massa !== null
                        ? `${e.descricao} Cerca de ${formatarNumero(massa)} g.`
                        : e.descricao}
                  </Text>
                </VStack>
              </Card>
            )
          })}
        </Grid>
      </VStack>

      {estufa.massaPorDia && (
        <Card>
          <VStack gap={2}>
            <VStack gap={0.5}>
              <Text weight="medium">Curva de crescimento (gramas por pé)</Text>
              <Text type="supporting" color="secondary">
                linha cheia: até hoje · tracejada: o que este ciclo gravado mostra até a colheita
              </Text>
            </VStack>
            <CurvaCrescimento
              curva={curvaDoCiclo(estufa.massaPorDia)}
              hoje={estufa.diaDoCiclo}
              massaHoje={estufa.massaPorPe}
              altura={largo ? 320 : 200}
            />
          </VStack>
        </Card>
      )}
    </VStack>
  )
}
