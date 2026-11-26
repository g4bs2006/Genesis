/**
 * Agora (Produtor). Junta três módulos (estufa, alface, dinheiro), por isso
 * mora em app/composicoes: módulo não importa tela de outro módulo.
 * Celular: só o crucial. Desktop (Fase 4): cards com sparkline e gráficos.
 */
import { Badge } from '@astryxdesign/core/Badge'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { CardAlface } from '@/modules/alface'
import { LucroPrevisto } from '@/modules/dinheiro'
import {
  fraseDeEstado,
  GRUPOS_CELULAR,
  curvaDeCrescimento,
  useEstufaAtual,
  VARIAVEIS_DESKTOP,
  useJanela,
  useResumoCiclo,
  type Estufa,
  type Passo,
} from '@/modules/estufa'
import { CardAlerta } from '@/shared/design-system/organisms/CardAlerta'
import { SeloDados } from '@/shared/design-system/molecules/SeloDados'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { useAlertaEstavel } from './useAlertaEstavel'
import { formatarHora } from '@/shared/lib/formatar'
import { origemDosDados } from '../dependencias'
import { CardGrupo } from './CardGrupo'
import { CardVariavelDesktop } from './CardVariavelDesktop'
import { GraficosAbas } from './GraficosAbas'
import { CurvaCrescimento } from '@/shared/design-system/graficos/CurvaCrescimento'
import { useTelaLarga } from '@/shared/hooks/useTelaLarga'
import css from './PaginaAgora.module.css'

export function PaginaAgora() {
  const estufa = useEstufaAtual()
  if (!estufa) return <EsbocoAgora />
  return <Agora estufa={estufa} />
}

function Agora({ estufa }: { estufa: Estufa }) {
  const largo = useTelaLarga()
  const { passos, atual } = useJanela(estufa.id)
  const resumo = useResumoCiclo(estufa.id)
  if (!atual) return <EsbocoAgora />
  if (largo) return <AgoraDesktop estufa={estufa} passos={passos} atual={atual} />
  return (
    <VStack gap={4} paddingBlock={4}>
      <Cabecalho estufa={estufa} passo={atual} />
      <Frase estufa={estufa} passos={passos} />
      <CardAlface estufa={estufa} leitura={atual.leitura} recentes={passos.slice(-6).map((p) => p.leitura)} />
      <Grid columns={2} gap={3}>
        {GRUPOS_CELULAR.map((g) => (
          <CardGrupo key={g.id} grupo={g} passo={atual} passos={passos} />
        ))}
      </Grid>
      <Alerta passos={passos} />
      <LucroPrevisto resumo={resumo.data} plantas={estufa.plantas} />
    </VStack>
  )
}

/** Desktop: tudo do celular e mais os gráficos das últimas 24 horas. */
function AgoraDesktop({ estufa, passos, atual }: { estufa: Estufa; passos: Passo[]; atual: Passo }) {
  const resumo = useResumoCiclo(estufa.id)
  return (
    <VStack gap={5} paddingBlock={6}>
      <VStack gap={3}>
        <Cabecalho estufa={estufa} passo={atual} />
        <Frase estufa={estufa} passos={passos} />
      </VStack>
      <section className={css.colunas}>
        <CardAlface
          estufa={estufa}
          leitura={atual.leitura}
          recentes={passos.slice(-6).map((p) => p.leitura)}
          rodape={
            <CurvaCrescimento
              curva={curvaDeCrescimento(estufa.diasDoCiclo)}
              hoje={estufa.diaDoCiclo}
              massaHoje={estufa.massaPorPe}
            />
          }
        />
        <VStack gap={3}>
          <section className={css.cards}>
            {VARIAVEIS_DESKTOP.map((vs) => (
              <CardVariavelDesktop key={vs.join('-')} variaveis={vs} passo={atual} passos={passos} />
            ))}
          </section>
          <Alerta passos={passos} />
          <LucroPrevisto resumo={resumo.data} plantas={estufa.plantas} />
        </VStack>
      </section>
      <Card>
        <VStack gap={3}>
          <Heading level={2}>Últimas 24 horas</Heading>
          <GraficosAbas passos={passos} />
        </VStack>
      </Card>
    </VStack>
  )
}

function Cabecalho({ estufa, passo }: { estufa: Estufa; passo: Passo }) {
  return (
    <HStack justify="between" align="center" gap={2}>
      <HStack gap={2} align="center">
        <Text weight="medium">{estufa.nome}</Text>
        {estufa.origem === 'simulada' && <Badge variant="neutral" label="simulada" />}
      </HStack>
      <Text type="code" color="secondary">
        {formatarHora(passo.leitura.instante)}
      </Text>
    </HStack>
  )
}

function Frase({ estufa, passos }: { estufa: Estufa; passos: Passo[] }) {
  const { titulo, apoio } = fraseDeEstado(passos, estufa.controlador)
  return (
    <VStack gap={1}>
      {origemDosDados === 'exemplo' && <SeloDados origem="exemplo" />}
      <Heading level={1}>{titulo}</Heading>
      <Text color="secondary">{apoio}</Text>
    </VStack>
  )
}

function Alerta({ passos }: { passos: Passo[] }) {
  const alerta = useAlertaEstavel(passos)
  // O alerta abre espaço deslizando (os cards de baixo não pulam) e é lido
  // pelo leitor de tela quando aparece (aria-live)
  return (
    <VStack
      className="revelar"
      data-aberto={alerta.aberto}
      aria-live="polite"
      aria-hidden={!alerta.aberto}
      inert={!alerta.aberto}
    >
      <VStack>
        {alerta.ultimo && (
          <CardAlerta titulo={alerta.ultimo.titulo} feito={alerta.ultimo.feito} estado={alerta.ultimo.estado} />
        )}
      </VStack>
    </VStack>
  )
}

/** Esboço com o tamanho da tela final: nada pula quando os dados chegam. */
function EsbocoAgora() {
  const mostrar = useAtraso(true)
  if (!mostrar) return null
  return (
    <VStack gap={4} paddingBlock={4} aria-busy="true" aria-label="Carregando a estufa">
      <Skeleton height={22} width="60%" radius={2} />
      <Skeleton height={80} width="85%" radius={2} index={1} />
      <Skeleton height={432} radius={3} index={2} />
      <Grid columns={2} gap={3}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={122} radius={3} index={i} />
        ))}
      </Grid>
    </VStack>
  )
}
