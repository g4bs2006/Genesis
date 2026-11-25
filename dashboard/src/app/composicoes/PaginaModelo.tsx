/**
 * Desenvolvedor · Modelo: a rede neural do campeão aberta por dentro. Mostra
 * o que entra, o que acende lá dentro, o que sai, o que mais pesou numa
 * decisão e como o agente se saiu nas perturbações. Junta treino (os pesos) e
 * estufa (as leituras e os eventos): por isso mora em composicoes.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ParentSize } from '@visx/responsive'
import { Badge } from '@astryxdesign/core/Badge'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { OQueEIsso } from '@/modules/glossario'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Selector } from '@astryxdesign/core/Selector'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Slider } from '@astryxdesign/core/Slider'
import { Table } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { ToggleButton } from '@astryxdesign/core/ToggleButton'
import { VStack } from '@astryxdesign/core/VStack'
import {
  ListaEventos,
  useEstufas,
  useEventos,
  useJanela,
  type Estufa,
  type Evento,
  type Perturbacao,
} from '@/modules/estufa'
import {
  ENTRADAS,
  SAIDAS,
  atribuicao,
  camadas,
  normalizar,
  propagar,
  useModelos,
  valoresBrutos,
  type Brutos,
  type Modelo,
} from '@/modules/treino'
import { DiagramaRede } from '@/shared/design-system/graficos/DiagramaRede'
import { rotuloEixo } from '@/shared/design-system/graficos/estilo'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { useTelaLarga } from '@/shared/hooks/useTelaLarga'
import { formatarHora, formatarNumero } from '@/shared/lib/formatar'

export function PaginaModelo() {
  const modelos = useModelos()
  const estufas = useEstufas()
  const carregando = !modelos.data || !estufas.data
  const esboco = useAtraso(carregando)
  if (carregando)
    return esboco ? (
      <VStack gap={5} paddingBlock={6}>
        <Skeleton height={64} radius={2} />
        <Skeleton height={660} radius={3} index={1} />
        <Grid columns={{ minWidth: 420 }} gap={4}>
          <Skeleton height={420} radius={3} index={2} />
          <Skeleton height={420} radius={3} index={3} />
        </Grid>
        <Skeleton height={360} radius={3} index={4} />
      </VStack>
    ) : null
  const campeoes = campeoesPorFase(modelos.data ?? [])
  if (campeoes.length === 0 || !estufas.data?.length)
    return (
      <VStack gap={2} paddingBlock={6}>
        <Heading level={1}>Modelo</Heading>
        <Text color="secondary">
          Ainda não há campeão salvo nem estufa para seguir. Ele aparece quando o treino exportar.
        </Text>
      </VStack>
    )
  return <Conteudo campeoes={campeoes} estufas={estufas.data} />
}

/** O campeão de cada fase: o de maior geração entre os salvos naquela fase. */
function campeoesPorFase(modelos: Modelo[]): Modelo[] {
  const porFase = new Map<number, Modelo>()
  for (const m of modelos) if (m.geracao >= (porFase.get(m.fase)?.geracao ?? -1)) porFase.set(m.fase, m)
  return [...porFase.values()].sort((a, b) => a.fase - b.fase)
}

function Conteudo({ campeoes, estufas }: { campeoes: Modelo[]; estufas: Estufa[] }) {
  const [id, setId] = useState(campeoes.at(-1)!.id)
  const largo = useTelaLarga()
  const modelo = campeoes.find((m) => m.id === id) ?? campeoes.at(-1)!
  // a estufa que roda este modelo; sem ela, a estufa principal do agente
  const agentes = estufas.filter((e) => e.controlador.tipo === 'agente')
  const estufa =
    agentes.find((e) => e.controlador.tipo === 'agente' && e.controlador.modeloId === modelo.id) ??
    agentes[0] ??
    estufas[0]!
  const regras = estufas.find((e) => e.controlador.tipo === 'regras')
  const rodaEste = estufa.controlador.tipo === 'agente' && estufa.controlador.modeloId === modelo.id

  return (
    <VStack gap={5} paddingBlock={6}>
      <HStack justify="between" align="end" wrap="wrap" gap={3}>
        <VStack gap={1}>
          <Heading level={1}>Modelo</Heading>
          <Text color="secondary">
            Rede {modelo.arquitetura.join(' → ')} · {modelo.pesos.length} pesos · seguindo {estufa.nome}
            {!rodaEste && ' (que roda outro modelo)'}
          </Text>
        </VStack>
        {largo ? (
          <SegmentedControl label="Campeão" value={modelo.id} onChange={setId}>
            {campeoes.map((m) => (
              <SegmentedControlItem key={m.id} value={m.id} label={`Fase ${m.fase} · g ${m.geracao}`} />
            ))}
          </SegmentedControl>
        ) : (
          // estreito: as fases lado a lado cortariam a geração
          <Selector
            label="Campeão"
            isLabelHidden
            value={modelo.id}
            onChange={(v) => v && setId(v)}
            options={campeoes.map((m) => ({ value: m.id, label: `Fase ${m.fase} · g ${m.geracao}` }))}
          />
        )}
      </HStack>

      <RedePorDentro key={estufa.id} modelo={modelo} estufa={estufa} aoLado={<AcertosErros estufa={estufa} />} />
      <Perturbacoes modelo={modelo} estufa={estufa} regras={regras} />
    </VStack>
  )
}

/** Um termo com o "i" do lado. */
type ChaveControle = Exclude<keyof Brutos, 'diaDoCiclo'>
/** As entradas principais que dá para mexer à mão (o resto fica no valor seguido). */
const CONTROLES: {
  chave: ChaveControle
  rotulo: string
  min: number
  max: number
  passo: number
  formatar: (v: number) => string
}[] = [
  {
    chave: 'arTemperatura',
    rotulo: 'Temperatura do ar',
    min: 10,
    max: 40,
    passo: 0.5,
    formatar: (v) => `${formatarNumero(v, 1)} °C`,
  },
  { chave: 'arUmidade', rotulo: 'Umidade', min: 30, max: 100, passo: 1, formatar: (v) => `${formatarNumero(v)}%` },
  { chave: 'ph', rotulo: 'pH', min: 4, max: 8, passo: 0.1, formatar: (v) => formatarNumero(v, 1) },
  { chave: 'ec', rotulo: 'EC', min: 0, max: 3, passo: 0.1, formatar: (v) => `${formatarNumero(v, 1)} mS/cm` },
  {
    chave: 'nivel',
    rotulo: 'Nível do reservatório',
    min: 0,
    max: 1,
    passo: 0.05,
    formatar: (v) => `${formatarNumero(v * 100)}%`,
  },
  {
    chave: 'hora',
    rotulo: 'Hora',
    min: 0,
    max: 23.5,
    passo: 0.5,
    formatar: (v) => `${String(Math.floor(v)).padStart(2, '0')}:${v % 1 ? '30' : '00'}`,
  },
]

/** O diagrama em cima; embaixo, "o que mais pesou" (usa as mesmas entradas) ao lado de `aoLado`. */
function RedePorDentro({ modelo, estufa, aoLado }: { modelo: Modelo; estufa: Estufa; aoLado: ReactNode }) {
  const { passos } = useJanela(estufa.id)
  const seguidos = valoresBrutos(passos, estufa.diaDoCiclo)
  // null: segue a estufa ao vivo; um objeto: as entradas congeladas que o usuário está mexendo
  const [manual, setManual] = useState<Brutos | null>(null)
  const [saida, setSaida] = useState(0)
  const brutos = manual ?? seguidos
  const esboco = useAtraso(!brutos)

  // fatiar os pesos só quando o modelo muda (são ~2 mil números)
  const fatias = useMemo(() => {
    try {
      return camadas(modelo)
    } catch {
      return null
    }
  }, [modelo])
  const encaixa = modelo.arquitetura[0] === ENTRADAS.length && modelo.arquitetura.at(-1) === SAIDAS.length

  if (!fatias || !encaixa)
    return (
      <>
        <Card>
          <VStack gap={2}>
            <Heading level={2}>A rede por dentro</Heading>
            <Text color="secondary">
              {!fatias
                ? `Os pesos deste modelo não batem com a arquitetura [${modelo.arquitetura.join(', ')}]: confira a exportação do treino.`
                : `Este modelo tem ${modelo.arquitetura[0]} entradas e ${modelo.arquitetura.at(-1)} saídas; a tela conhece as ${ENTRADAS.length} e ${SAIDAS.length} do plano.`}
            </Text>
          </VStack>
        </Card>
        {aoLado}
      </>
    )

  const entradas = brutos ? normalizar(brutos) : null
  const ativacoes = entradas ? propagar(modelo, entradas) : null
  const contribuicoes = entradas ? atribuicao(modelo, entradas, saida) : null
  const saidas = ativacoes?.at(-1) ?? []

  return (
    <>
      <Card>
        <VStack gap={3}>
          <HStack justify="between" align="center" wrap="wrap" gap={2}>
            <Heading level={2}>A rede por dentro</Heading>
            <SegmentedControl
              label="De onde vêm as entradas"
              value={manual ? 'mexer' : 'seguir'}
              onChange={(v) => setManual(v === 'mexer' ? seguidos : null)}
              isDisabled={!seguidos}
            >
              <SegmentedControlItem value="seguir" label="Seguir a estufa" />
              <SegmentedControlItem value="mexer" label="Mexer nas entradas" />
            </SegmentedControl>
          </HStack>
          <Text type="supporting" color="secondary">
            {manual
              ? 'Mexa e veja a rede reagir; o resto fica no último valor seguido.'
              : `As leituras de ${estufa.nome} entram à esquerda e viram as 8 ações à direita, ao vivo.`}
          </Text>
          {manual && (
            <Grid columns={{ minWidth: 200 }} gap={3}>
              {CONTROLES.map((c) => (
                <Slider
                  key={c.chave}
                  label={c.rotulo}
                  min={c.min}
                  max={c.max}
                  step={c.passo}
                  value={manual[c.chave]}
                  formatValue={c.formatar}
                  valueDisplay="text"
                  onChange={(v: number) => setManual({ ...manual, [c.chave]: v })}
                />
              ))}
            </Grid>
          )}
          {ativacoes ? (
            <DiagramaRede
              ativacoes={ativacoes}
              pesos={fatias.map((c) => c.pesos)}
              entradas={ENTRADAS.map((e) => ({ rotulo: e.rotulo, grupo: e.grupo }))}
              saidas={SAIDAS.map((s) => s.rotulo)}
              rotulo={`Rede do modelo ${modelo.id} agora: ${SAIDAS.map((s, i) => `${s.rotulo} ${Math.round((saidas[i] ?? 0) * 100)}%`).join(', ')}`}
            />
          ) : esboco ? (
            <Skeleton height={520} radius={2} />
          ) : null}
          <HStack gap={4} wrap="wrap">
            <OQueEIsso id="sinalNeuronio" rotulo="ativação: cor da bolinha" />
            <OQueEIsso id="peso" rotulo="peso: as linhas (só os 15% sinais mais fortes)" />
            <OQueEIsso id="tanh" rotulo="tanh nas camadas do meio" />
            <OQueEIsso id="sigmoide" rotulo="sigmoide nas saídas" />
          </HStack>
        </VStack>
      </Card>

      <Grid columns={{ minWidth: 420 }} gap={4}>
        <Card>
          <VStack gap={3}>
            <HStack justify="between" align="center" wrap="wrap" gap={2}>
              <HStack gap={1} align="center">
                <Heading level={2}>O que mais pesou nesta decisão</Heading>
                <OQueEIsso id="atribuicaoEntrada" />
              </HStack>
              <Selector
                label="Saída"
                isLabelHidden
                size="md"
                value={String(saida)}
                onChange={(v) => setSaida(Number(v ?? 0))}
                options={SAIDAS.map((s, i) => ({ value: String(i), label: s.rotulo }))}
              />
            </HStack>
            {contribuicoes ? (
              <>
                <Text color="secondary" maxLines={1}>
                  {SAIDAS[saida]!.rotulo} em {Math.round((saidas[saida] ?? 0) * 100)}% · {frasePeso(contribuicoes)}
                </Text>
                <BarrasAtribuicao valores={contribuicoes} />
              </>
            ) : esboco ? (
              <Skeleton height={260} radius={2} />
            ) : null}
          </VStack>
        </Card>
        {aoLado}
      </Grid>
    </>
  )
}

const nomeEntrada = (i: number) => {
  const e = ENTRADAS[i]
  return e ? `${e.rotulo} (${e.grupo})` : `entrada ${i + 1}`
}

function frasePeso(valores: number[]): string {
  const ordem = valores.map((v, i) => ({ v, i }))
  const sobe = ordem.reduce((a, b) => (b.v > a.v ? b : a))
  const desce = ordem.reduce((a, b) => (b.v < a.v ? b : a))
  const partes = []
  if (sobe.v > 0.005) partes.push(`↑ ${nomeEntrada(sobe.i)}`)
  if (desce.v < -0.005) partes.push(`↓ ${nomeEntrada(desce.i)}`)
  return partes.join(' · ') || 'nenhuma entrada sozinha mudou muito esta saída'
}

const LINHAS_BARRAS = 10
const ALTURA_LINHA = 26

/** Barras para os dois lados a partir do zero: laranja empurrou para cima, azul para baixo. */
function BarrasAtribuicao({ valores }: { valores: number[] }) {
  const linhas = valores
    .map((v, i) => ({ v, i }))
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
    .slice(0, LINHAS_BARRAS)
  const altura = LINHAS_BARRAS * ALTURA_LINHA
  const maior = Math.max(...linhas.map((l) => Math.abs(l.v)), 0.01)
  const rotulo = `As ${LINHAS_BARRAS} entradas que mais pesaram: ${linhas.map((l) => `${nomeEntrada(l.i)} ${pontos(l.v)}`).join(', ')}`
  return (
    <ParentSize debounceTime={50} style={{ width: '100%', height: altura }}>
      {({ width }) => {
        if (width <= 0) return null
        // a coluna dos nomes cresce com o nome mais longo (Geist Mono 11px: ~6,7 px por letra), até 55% da largura
        const esquerda = Math.min(width * 0.55, Math.max(...linhas.map((l) => nomeEntrada(l.i).length)) * 6.7 + 14)
        // coluna fixa do valor: "+30,0 p.p." tem 10 letras
        const valor = 76
        const meio = esquerda + (width - esquerda - valor) / 2
        const metade = (width - esquerda - valor) / 2
        return (
          <svg width={width} height={altura} role="img" aria-label={rotulo}>
            <line x1={meio} x2={meio} y1={0} y2={altura} stroke="var(--linha-2)" />
            {linhas.map((l, k) => {
              const y = k * ALTURA_LINHA
              const w = (Math.abs(l.v) / maior) * metade
              return (
                <g key={l.i}>
                  <text
                    x={esquerda - 8}
                    y={y + ALTURA_LINHA / 2 + 4}
                    textAnchor="end"
                    {...rotuloEixo}
                    fill="var(--texto-2)"
                  >
                    {nomeEntrada(l.i)}
                  </text>
                  <rect
                    x={l.v >= 0 ? meio : meio - w}
                    y={y + 6}
                    width={Math.max(1, w)}
                    height={ALTURA_LINHA - 12}
                    rx={2}
                    fill={l.v >= 0 ? 'var(--serie-laranja)' : 'var(--serie-azul)'}
                  />
                  {/* valor numa coluna fixa à direita: barra negativa longa não encosta no rótulo */}
                  <text x={width - 2} y={y + ALTURA_LINHA / 2 + 4} textAnchor="end" {...rotuloEixo}>
                    {pontos(l.v)}
                  </text>
                </g>
              )
            })}
          </svg>
        )
      }}
    </ParentSize>
  )
}

/** a diferença na saída em pontos percentuais (a saída vai de 0 a 100%) */
const pontos = (v: number) => `${v >= 0 ? '+' : '−'}${formatarNumero(Math.abs(v) * 100, 1)} p.p.`

const TIPOS: { tipo: Evento['tipo']; rotulo: string }[] = [
  { tipo: 'acerto', rotulo: 'Acertos' },
  { tipo: 'erro', rotulo: 'Erros' },
  { tipo: 'barrado', rotulo: 'Barrados' },
  { tipo: 'perturbacao', rotulo: 'Perturbações' },
]

function AcertosErros({ estufa }: { estufa: Estufa }) {
  const eventos = useEventos(estufa.id)
  const navegar = useNavigate()
  const [tipos, setTipos] = useState<Set<Evento['tipo']>>(() => new Set(TIPOS.map((t) => t.tipo)))
  const alternar = (tipo: Evento['tipo'], ligado: boolean) =>
    setTipos((atual) => {
      const novo = new Set(atual)
      if (ligado) novo.add(tipo)
      else novo.delete(tipo)
      return novo
    })
  const filtrados = eventos.data?.filter((e) => tipos.has(e.tipo))

  return (
    <Card>
      <VStack gap={3}>
        <Heading level={2}>Acertos e erros</Heading>
        <HStack gap={2} wrap="wrap">
          {TIPOS.map((t) => (
            <ToggleButton
              key={t.tipo}
              size="sm"
              label={`${t.rotulo} · ${eventos.data?.filter((e) => e.tipo === t.tipo).length ?? 0}`}
              isPressed={tipos.has(t.tipo)}
              onPressedChange={(ligado) => alternar(t.tipo, ligado)}
            >
              {`${t.rotulo} · ${eventos.data?.filter((e) => e.tipo === t.tipo).length ?? 0}`}
            </ToggleButton>
          ))}
        </HStack>
        <Text type="supporting" color="secondary">
          Toque num evento para vê-lo no replay.
        </Text>
        <ListaEventos
          eventos={filtrados}
          vazio="Nenhum evento destes tipos."
          aoEscolher={(e) => navegar(`/dev/gravacoes?evento=${encodeURIComponent(e.instante)}`)}
        />
      </VStack>
    </Card>
  )
}

/** As 6 perturbações, a palavra que as acha no título do evento e a fase do currículo que as ensina. */
const PERTURBACOES_INFO: { id: Perturbacao; nome: string; chave: string; fase: number }[] = [
  { id: 'ondaDeCalor', nome: 'Onda de calor', chave: 'calor', fase: 1 },
  { id: 'phDescalibra', nome: 'Sensor de pH descalibra', chave: 'ph', fase: 5 },
  { id: 'bombaTrava', nome: 'Bomba trava', chave: 'bomba', fase: 6 },
  { id: 'quedaDeEnergia', nome: 'Queda de energia', chave: 'energia', fase: 6 },
  { id: 'ruidoSensores', nome: 'Ruído nos sensores', chave: 'ruído', fase: 4 },
  { id: 'tarifaDePico', nome: 'Tarifa de pico', chave: 'tarifa', fase: 3 },
]

/** quanto tempo depois da perturbação ainda conta como "reação" a ela */
const JANELA_REACAO_MS = 3 * 60 * 60 * 1000

type LinhaPerturbacao = {
  id: Perturbacao
  nome: string
  fase: number
  treinado: boolean
  quando?: string
  fez: string
  errosAgente?: number
  errosRegras?: number
}

function Perturbacoes({ modelo, estufa, regras }: { modelo: Modelo; estufa: Estufa; regras: Estufa | undefined }) {
  const doAgente = useEventos(estufa.id)
  // sem estufa de regras, repete a consulta do agente (já está no cache) e ignora o resultado
  const dasRegras = useEventos(regras?.id ?? estufa.id)
  const esboco = useAtraso(!doAgente.data)

  const linhas: LinhaPerturbacao[] = PERTURBACOES_INFO.map((p) => {
    const treinado = modelo.fase >= p.fase
    const ocorrencia = (doAgente.data ?? [])
      .filter((e) => e.tipo === 'perturbacao' && e.titulo.toLowerCase().includes(p.chave))
      .sort((a, b) => b.instante.localeCompare(a.instante))[0]
    if (!ocorrencia) return { ...p, treinado, fez: 'Ainda não aconteceu nesta estufa.' }
    const inicio = Date.parse(ocorrencia.instante)
    const naJanela = (e: Evento) => {
      const t = Date.parse(e.instante)
      return e.tipo !== 'perturbacao' && t >= inicio && t <= inicio + JANELA_REACAO_MS
    }
    const reacao = (doAgente.data ?? []).filter(naJanela).sort((a, b) => a.instante.localeCompare(b.instante))
    return {
      ...p,
      treinado,
      quando: ocorrencia.instante,
      fez: reacao[0]?.titulo ?? 'Nada fora do normal nas 3 horas seguintes.',
      errosAgente: reacao.filter((e) => e.tipo === 'erro').length,
      errosRegras:
        regras && dasRegras.data ? dasRegras.data.filter((e) => naJanela(e) && e.tipo === 'erro').length : undefined,
    }
  })

  return (
    <Card>
      <VStack gap={3}>
        <Heading level={2}>Como lidou com cada perturbação</Heading>
        <Text type="supporting" color="secondary">
          A primeira reação de {estufa.nome} nas 3 horas seguintes e os erros contra as regras fixas no mesmo período.
        </Text>
        {!doAgente.data ? (
          esboco ? (
            <Skeleton height={300} radius={2} />
          ) : null
        ) : (
          <Table
            data={linhas}
            idKey="id"
            density="compact"
            columns={[
              {
                key: 'nome',
                header: 'Perturbação',
                renderCell: (l) => (
                  <VStack gap={0.5}>
                    <Text weight="medium">{l.nome}</Text>
                    {l.treinado ? (
                      <Text type="supporting" color="secondary">
                        treinada na fase {l.fase}
                      </Text>
                    ) : (
                      // o erro continua aparecendo nas outras colunas: o aviso explica, não esconde
                      <Badge variant="warning" label={`ainda não treinado para isto (fase ${l.fase})`} />
                    )}
                  </VStack>
                ),
              },
              {
                key: 'fez',
                header: 'O que o agente fez',
                renderCell: (l) => (
                  <VStack gap={0.5}>
                    <Text>{l.fez}</Text>
                    {l.quando && (
                      <Text type="supporting" color="secondary">
                        perturbação às {formatarHora(l.quando)}
                      </Text>
                    )}
                  </VStack>
                ),
              },
              { key: 'resultado', header: 'Resultado × regras', renderCell: (l) => <Resultado linha={l} /> },
            ]}
          />
        )}
      </VStack>
    </Card>
  )
}

function Resultado({ linha }: { linha: LinhaPerturbacao }) {
  if (linha.errosAgente === undefined) return <Text color="secondary">—</Text>
  const erros = (n: number) => `${n} ${n === 1 ? 'erro' : 'erros'}`
  if (linha.errosRegras === undefined) return <Text>{erros(linha.errosAgente)}</Text>
  const [variante, frase] =
    linha.errosAgente < linha.errosRegras
      ? (['success', 'melhor que as regras'] as const)
      : linha.errosAgente > linha.errosRegras
        ? (['error', 'pior que as regras'] as const)
        : (['neutral', 'igual às regras'] as const)
  return (
    <VStack gap={0.5}>
      <Badge variant={variante} label={frase} />
      <Text type="supporting" color="secondary">
        agente {erros(linha.errosAgente)} · regras {erros(linha.errosRegras)}
      </Text>
    </VStack>
  )
}
