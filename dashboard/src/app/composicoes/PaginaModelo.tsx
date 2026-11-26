/**
 * Desenvolvedor · Modelo: a rede neural do campeão aberta por dentro. Mostra
 * o que entra, o que acende lá dentro, o que sai, o que mais pesou numa
 * decisão e os acertos e erros. Junta treino (os pesos) e
 * estufa (as leituras e os eventos): por isso mora em composicoes.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ParentSize } from '@visx/responsive'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Selector } from '@astryxdesign/core/Selector'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Slider } from '@astryxdesign/core/Slider'
import { Text } from '@astryxdesign/core/Text'
import { ToggleButton } from '@astryxdesign/core/ToggleButton'
import { VStack } from '@astryxdesign/core/VStack'
import { ListaEventos, useEstufas, useEventos, useJanela, type Estufa, type Evento } from '@/modules/estufa'
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
import { formatarNumero } from '@/shared/lib/formatar'

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
        <Grid columns={{ minWidth: 420, repeat: 'fit' }} gap={4}>
          <Skeleton height={420} radius={3} index={2} />
          <Skeleton height={420} radius={3} index={3} />
        </Grid>
        <Skeleton height={360} radius={3} index={4} />
      </VStack>
    ) : null
  const campeoes = [...(modelos.data ?? [])].sort((a, b) => a.geracao - b.geracao)
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

function Conteudo({ campeoes, estufas }: { campeoes: Modelo[]; estufas: Estufa[] }) {
  const [id, setId] = useState(campeoes.at(-1)!.id)
  const modelo = campeoes.find((m) => m.id === id) ?? campeoes.at(-1)!
  // a gravação deste campeão; sem ela, a do campeão mais recente
  const agentes = estufas.filter((e) => e.controlador.tipo === 'agente')
  const estufa =
    agentes.find((e) => e.controlador.tipo === 'agente' && e.controlador.modeloId === modelo.id) ??
    agentes.at(-1) ??
    estufas[0]!
  const rodaEste = estufa.controlador.tipo === 'agente' && estufa.controlador.modeloId === modelo.id

  return (
    <VStack gap={5} paddingBlock={6}>
      <HStack justify="between" align="end" wrap="wrap" gap={3}>
        <VStack gap={1}>
          <Heading level={1}>Modelo</Heading>
          <Text color="secondary">
            Rede {modelo.arquitetura.join(' → ')} · {modelo.pesos.length} pesos ·{' '}
            {rodaEste ? 'seguindo a gravação dele' : `sem gravação própria: seguindo ${estufa.nome}`}
          </Text>
        </VStack>
        <Selector
          label="Campeão"
          value={modelo.id}
          onChange={(v) => v && setId(v)}
          options={campeoes.map((m) => ({ value: m.id, label: `Geração ${m.geracao}` }))}
        />
      </HStack>

      <RedePorDentro key={estufa.id} modelo={modelo} estufa={estufa} />
      <AcertosErros estufa={estufa} />
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

/** O diagrama em cima; embaixo, "o que mais pesou" (usa as mesmas entradas). */
function RedePorDentro({ modelo, estufa }: { modelo: Modelo; estufa: Estufa }) {
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
            <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={3}>
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
          <HStack gap={4} wrap="wrap"></HStack>
        </VStack>
      </Card>

      <Card>
        <VStack gap={3}>
          <HStack justify="between" align="center" wrap="wrap" gap={2}>
            <Heading level={2}>O que mais pesou nesta decisão</Heading>
            <Selector
              label="Decisão"
              isLabelHidden
              size="md"
              value={String(saida)}
              onChange={(v) => setSaida(Number(v ?? 0))}
              options={SAIDAS.map((s, i) => ({ value: String(i), label: s.rotulo }))}
            />
          </HStack>
          {contribuicoes ? (
            <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={4}>
              <FrasePeso saida={SAIDAS[saida]!.rotulo} valor={saidas[saida] ?? 0} contribuicoes={contribuicoes} />
              <BarrasAtribuicao valores={contribuicoes} />
            </Grid>
          ) : esboco ? (
            <Skeleton height={260} radius={2} />
          ) : null}
        </VStack>
      </Card>
    </>
  )
}

const nomeEntrada = (i: number) => {
  const e = ENTRADAS[i]
  return e ? `${e.rotulo} (${e.grupo})` : `entrada ${i + 1}`
}

/**
 * A decisão em português: quanto a rede pede agora e quais entradas mais
 * empurraram para ligar e para desligar (em pontos percentuais da saída:
 * quanto ela mudaria se a entrada estivesse no meio da sua faixa).
 */
function FrasePeso({ saida, valor, contribuicoes }: { saida: string; valor: number; contribuicoes: number[] }) {
  const ordem = contribuicoes.map((v, i) => ({ v, i }))
  const sobe = ordem.filter((o) => o.v > 0.005).sort((a, b) => b.v - a.v)[0]
  const desce = ordem.filter((o) => o.v < -0.005).sort((a, b) => a.v - b.v)[0]
  return (
    <VStack gap={2}>
      <Text size="xl" weight="medium">
        A rede pede {saida.toLowerCase()} em {Math.round(valor * 100)}% agora.
      </Text>
      <Text>
        {sobe
          ? `Quem mais empurrou para ligar: ${nomeEntrada(sobe.i)} (${pontos(sobe.v)}).`
          : 'Nenhuma entrada sozinha empurrou para ligar.'}
      </Text>
      <Text>
        {desce
          ? `Quem mais empurrou para desligar: ${nomeEntrada(desce.i)} (${pontos(desce.v)}).`
          : 'Nenhuma entrada sozinha empurrou para desligar.'}
      </Text>
      <Text type="supporting" color="secondary">
        Nas barras, as 10 entradas que mais pesaram: laranja empurra para ligar, azul para desligar. p.p. = pontos
        percentuais da saída: quanto ela mudaria com aquela entrada no meio da faixa dela.
      </Text>
    </VStack>
  )
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
  { tipo: 'erro', rotulo: 'Saiu da faixa' },
  { tipo: 'acerto', rotulo: 'Voltou para a faixa' },
  { tipo: 'barrado', rotulo: 'Segurança barrou' },
]

/**
 * Acertos e erros da gravação deste campeão, do transplante até o passo de
 * agora: quantas vezes algo saiu da faixa (erro), voltou (acerto) e a
 * segurança barrou uma ação. Cada número filtra a lista; cada linha abre a
 * gravação naquele passo.
 */
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
  const quantos = (tipo: Evento['tipo']) => eventos.data?.filter((e) => e.tipo === tipo).length ?? 0

  return (
    <Card>
      <VStack gap={3}>
        <VStack gap={0.5}>
          <Heading level={2}>Acertos e erros</Heading>
          <Text type="supporting" color="secondary">
            Na gravação deste campeão, do transplante até agora. Toque num número para filtrar e numa linha para ver o
            momento na gravação.
          </Text>
        </VStack>
        <Grid columns={{ minWidth: 180, repeat: 'fit' }} gap={2}>
          {TIPOS.map((t) => (
            <ToggleButton
              key={t.tipo}
              label={`${t.rotulo}: ${quantos(t.tipo)}`}
              isPressed={tipos.has(t.tipo)}
              onPressedChange={(ligado) => alternar(t.tipo, ligado)}
            >
              {`${t.rotulo}: ${quantos(t.tipo)}`}
            </ToggleButton>
          ))}
        </Grid>
        <ListaEventos
          eventos={filtrados}
          limite={40}
          vazio="Nada disso aconteceu até agora."
          aoEscolher={(e) => navegar(`/dev/gravacoes?gravacoes=${encodeURIComponent(estufa.id)}&t=${e.passo ?? 0}`)}
        />
      </VStack>
    </Card>
  )
}
