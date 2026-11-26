/**
 * Desenvolvedor · Estufas lado a lado (passo 12): várias gravações reais no
 * mesmo clima, tocando no mesmo relógio. Por padrão: o campeão da geração 1,
 * um intermediário, o final, as regras fixas e "sem controle"; dá para ligar e
 * desligar cada uma. Junta estufa, alface, dinheiro e treino: fica em composicoes.
 */
import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@astryxdesign/core/Badge'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { ToggleButton } from '@astryxdesign/core/ToggleButton'
import { VStack } from '@astryxdesign/core/VStack'
import { AlfaceImagem, aparenciaMedia, descreverPlanta } from '@/modules/alface'
import { contaDoCiclo, formatarReaisCurto, usePrecos } from '@/modules/dinheiro'
import {
  FAIXAS,
  massaNoDia,
  useEstufas,
  useJanela,
  useResumos,
  valorDe,
  valorExibido,
  type Estufa,
  type Passo,
  type ResumoCiclo,
  type Variavel,
} from '@/modules/estufa'
import { useGravacoes } from '@/modules/treino'
import { GraficoSerie } from '@/shared/design-system/graficos/GraficoSerie'
import { MapaCalor } from '@/shared/design-system/graficos/MapaCalor'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { formatarData, formatarHora, formatarNumero } from '@/shared/lib/formatar'
import { ControleReproducao } from './ControleReproducao'
import css from './PaginaEstufasLadoALado.module.css'

/** pH, EC e a água são fixos na fase 1 do treino: compará-los mostraria linhas iguais */
const VARIAVEIS_COMPARADAS: Variavel[] = ['temperatura', 'umidade', 'vpd', 'co2', 'luz']

/**
 * Cor fixa por estufa (não muda quando outra é ligada ou desligada): as réguas
 * em cinza e vermelho; os campeões, em sequência, pela ordem das gerações.
 */
const CORES_CAMPEOES = [
  'var(--serie-azul)',
  'var(--serie-verde)',
  'var(--serie-roxo)',
  'var(--serie-amarelo)',
  'var(--serie-menta)',
  'var(--serie-laranja)',
]
function cores(estufas: Estufa[]): Record<string, { cor: string; tracejada: boolean }> {
  let k = 0
  return Object.fromEntries(
    estufas.map((e) => [
      e.id,
      e.controlador.tipo === 'regras'
        ? { cor: 'var(--serie-cinza)', tracejada: true }
        : e.controlador.tipo === 'nada'
          ? { cor: 'var(--risco)', tracejada: true }
          : { cor: CORES_CAMPEOES[k++ % CORES_CAMPEOES.length]!, tracejada: false },
    ]),
  )
}

/** A seleção padrão: a geração 1, a do meio, a última, as regras e "sem controle". */
function padrao(estufas: Estufa[]): string[] {
  const agentes = estufas.filter((e) => e.controlador.tipo === 'agente')
  const escolhidos = [agentes[0], agentes[Math.floor((agentes.length - 1) / 2)], agentes.at(-1)]
  const reguas = estufas.filter((e) => e.controlador.tipo !== 'agente')
  return [...new Set([...escolhidos, ...reguas].filter(Boolean).map((e) => e!.id))]
}

export function PaginaEstufasLadoALado() {
  const estufas = useEstufas()
  const esboco = useAtraso(!estufas.data)
  if (!estufas.data) return esboco ? <Skeleton height={600} radius={3} /> : null
  return <LadoALado estufas={estufas.data} />
}

function LadoALado({ estufas }: { estufas: Estufa[] }) {
  const [ligadas, setLigadas] = useState<string[]>(() => padrao(estufas))
  const visiveis = estufas.filter((e) => ligadas.includes(e.id))
  const resumos = useResumos(visiveis.map((e) => e.id))
  const precos = usePrecos()
  const gravacoes = useGravacoes()
  const cor = cores(estufas)
  const [variavel, setVariavel] = useState<Variavel>('temperatura')
  const [instante, setInstante] = useState<number | null>(null)
  const [passos, setPassos] = useState<Record<string, Passo[]>>({})
  const aoPassos = useCallback((id: string, p: Passo[]) => setPassos((a) => ({ ...a, [id]: p })), [])
  const primeiroPasso = visiveis.map((e) => passos[e.id]?.at(-1)).find(Boolean)
  const f = FAIXAS[variavel]

  const alternar = (id: string, ligada: boolean) =>
    setLigadas((atual) => (ligada ? [...atual, id] : atual.filter((x) => x !== id)))

  return (
    <VStack gap={5} paddingBlock={6}>
      <VStack gap={1}>
        <ControleReproducao />
        <Heading level={1}>Estufas lado a lado</Heading>
        <HStack gap={2} align="center" wrap="wrap">
          <Text color="secondary">
            Gravações reais do treino, todas no mesmo clima e no mesmo relógio
            {primeiroPasso &&
              ` · ${formatarData(primeiroPasso.leitura.instante)} ${formatarHora(primeiroPasso.leitura.instante)}`}
          </Text>
          <Badge variant="neutral" label={`${visiveis.length} de ${estufas.length} estufas`} />
        </HStack>
      </VStack>

      <HStack gap={2} wrap="wrap" role="group" aria-label="Quais estufas aparecem">
        {estufas.map((e) => (
          <ToggleButton
            key={e.id}
            size="sm"
            label={e.nome}
            isPressed={ligadas.includes(e.id)}
            onPressedChange={(ligada) => alternar(e.id, ligada)}
            icon={<span className={css.ponto} style={{ background: cor[e.id]!.cor }} aria-hidden />}
          >
            {e.nome}
          </ToggleButton>
        ))}
      </HStack>

      <Card>
        <VStack gap={3}>
          <HStack justify="between" align="center" wrap="wrap" gap={2}>
            <Heading level={2}>Uma variável nas {visiveis.length} estufas</Heading>
            <SegmentedControl label="Variável" value={variavel} onChange={(v) => setVariavel(v as Variavel)}>
              {VARIAVEIS_COMPARADAS.map((v) => (
                <SegmentedControlItem key={v} value={v} label={FAIXAS[v].nome} />
              ))}
            </SegmentedControl>
          </HStack>
          <GraficoSerie
            series={visiveis.map((e) => ({
              nome: e.nome,
              cor: cor[e.id]!.cor,
              tracejada: cor[e.id]!.tracejada,
              pontos: (passos[e.id] ?? []).map((p) => ({
                t: Date.parse(p.leitura.instante),
                v: valorExibido(variavel, valorDe(p.leitura, variavel)),
              })),
            }))}
            // luz não tem faixa boa (varia com o dia)
            faixa={variavel === 'luz' ? undefined : [f.min, f.max]}
            altura={380}
            rotulo={`${f.nome} nas ${visiveis.length} estufas, nas últimas 24 horas`}
            formatarValor={(v) => `${formatarNumero(v, f.casas)} ${f.unidade}`}
            formatarTempo={(t) => formatarHora(new Date(t).toISOString())}
            instante={instante}
            aoMoverInstante={setInstante}
          />
          <Text type="supporting" color="secondary">
            Últimas 24 horas. Passe o ponteiro: o balão dá o valor exato de cada estufa e as alfaces mostram aquele
            instante. Tracejadas: as regras fixas e "sem controle".
          </Text>
        </VStack>
      </Card>

      <section className={css.cartoes}>
        {visiveis.map((e, i) => (
          <CartaoEstufa
            key={e.id}
            estufa={e}
            cor={cor[e.id]!.cor}
            resumo={resumos[i]?.data}
            sobra={resumos[i]?.data && precos.data ? contaDoCiclo(resumos[i].data, e.plantas, precos.data).sobra : null}
            nota={gravacoes.data?.find((g) => g.id === e.id)?.resumo?.nota ?? null}
            instante={instante}
            aoPassos={aoPassos}
          />
        ))}
      </section>

      <Card>
        <VStack gap={2}>
          <Heading level={2}>Onde cada um erra</Heading>
          <Text type="supporting" color="secondary">
            % do ciclo inteiro fora da faixa, por variável e por estufa.
          </Text>
          <MapaDeErros estufas={visiveis} resumos={resumos.map((r) => r.data)} />
        </VStack>
      </Card>
    </VStack>
  )
}

function CartaoEstufa({
  estufa,
  cor,
  resumo,
  sobra,
  nota,
  instante,
  aoPassos,
}: {
  estufa: Estufa
  cor: string
  resumo: ResumoCiclo | undefined
  sobra: number | null
  nota: number | null
  instante: number | null
  aoPassos: (id: string, passos: Passo[]) => void
}) {
  const { passos } = useJanela(estufa.id)
  const ultimo = passos.at(-1)?.leitura.instante
  // avisa a página quando chega passo novo (o gráfico comparado usa todos)
  useEffect(() => {
    aoPassos(estufa.id, passos)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- o array muda de identidade a cada render; basta o tamanho e o último instante
  }, [estufa.id, passos.length, ultimo, aoPassos])

  // a alface no instante escolhido no gráfico (ou agora), com a massa daquele dia
  const indice = instante == null ? passos.length - 1 : maisPerto(passos, instante)
  const recentes = passos.slice(Math.max(0, indice - 5), indice + 1).map((p) => p.leitura)
  const dia =
    estufa.diaDoCiclo -
    (passos.at(-1) && passos[indice]
      ? (Date.parse(passos.at(-1)!.leitura.instante) - Date.parse(passos[indice]!.leitura.instante)) / 864e5
      : 0)
  const parametros = aparenciaMedia(recentes, estufa.massaPorDia ? massaNoDia(estufa.massaPorDia, dia) : 0)

  return (
    <Card className={css.cartao}>
      <VStack gap={2}>
        <HStack gap={1.5} align="center">
          <span className={css.ponto} style={{ background: cor }} aria-hidden />
          <Text weight="medium">{estufa.nome}</Text>
        </HStack>
        <AlfaceImagem parametros={parametros} rotulo={descreverPlanta(parametros)} largura={180} />
        {resumo && (
          <dl className={css.numeros}>
            <dt>nota do treino</dt>
            <dd>{nota == null ? '—' : formatarReaisCurto(nota)}</dd>
            <dt>sobra (Dinheiro)</dt>
            <dd>{sobra == null ? '—' : formatarReaisCurto(sobra)}</dd>
            <dt>massa</dt>
            <dd>{formatarNumero(resumo.massaPorPe)} g</dd>
            <dt>energia</dt>
            <dd>{formatarNumero(resumo.energiaKwh)} kWh</dd>
            <dt>fora da faixa</dt>
            <dd>{formatarNumero(resumo.foraDaFaixa * 100, 1)}%</dd>
            <dt>barradas</dt>
            <dd>{resumo.barradas}</dd>
          </dl>
        )}
      </VStack>
    </Card>
  )
}

function MapaDeErros({ estufas, resumos }: { estufas: Estufa[]; resumos: (ResumoCiclo | undefined)[] }) {
  const variaveis = Object.keys(resumos.find(Boolean)?.foraPorVariavel ?? {}) as Variavel[]
  if (estufas.length === 0) return <Text color="secondary">Ligue uma estufa acima.</Text>
  if (variaveis.length === 0) return <Skeleton height={200} radius={2} />
  return (
    <MapaCalor
      linhas={variaveis.map((v) => FAIXAS[v]?.nome ?? v)}
      colunas={estufas.map((e) => e.nome)}
      valores={variaveis.map((v) => resumos.map((r) => r?.foraPorVariavel[v] ?? 0))}
      formatar={(x) => `${formatarNumero(x * 100, 1)}%`}
      rotulo="Porcentagem do ciclo fora da faixa por variável e por estufa"
    />
  )
}

function maisPerto(passos: Passo[], t: number): number {
  let melhor = 0
  passos.forEach((p, i) => {
    if (Math.abs(Date.parse(p.leitura.instante) - t) < Math.abs(Date.parse(passos[melhor]!.leitura.instante) - t))
      melhor = i
  })
  return melhor
}
