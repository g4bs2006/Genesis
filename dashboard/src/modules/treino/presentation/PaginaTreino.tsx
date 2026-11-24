/**
 * Desenvolvedor · Treino e gerações: como a neuroevolução está indo.
 * Só usa o módulo treino; por isso mora nele.
 */
import { useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Link } from '@astryxdesign/core/Link'
import { NumberInput } from '@astryxdesign/core/NumberInput'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Table } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { OQueEIsso, type IdTermo } from '@/modules/glossario'
import { CurvaAprendizado } from '@/shared/design-system/graficos/CurvaAprendizado'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { formatarNumero } from '@/shared/lib/formatar'
import type { ConfigTreino, EstadoTreino, Geracao, Modelo } from '../domain/contrato'
import { FASES, LIMIAR_ESQUECEU, provas, situacaoDasFases } from '../domain/curriculo'
import { useConfigTreino, useEstadoTreino, useGeracoes, useModelos, useOrigemTreino } from './dados'
import { AvisoTreino } from './AvisoTreino'
import css from './PaginaTreino.module.css'

const nota = (v: number) => `R$ ${formatarNumero(v)}`

export function PaginaTreino() {
  const estado = useEstadoTreino()
  const geracoes = useGeracoes()
  const modelos = useModelos()
  const config = useConfigTreino()
  const pronto = estado.data && geracoes.data && modelos.data && config.data
  const erro = estado.error ?? geracoes.error ?? modelos.error ?? config.error
  const esboco = useAtraso(!pronto && !erro)
  if (erro && !pronto) return <AvisoTreino erro={erro} />
  if (!pronto) return esboco ? <Skeleton height={640} radius={3} /> : null
  if (geracoes.data.length === 0) return <AvisoTreino semGeracoes />
  return <Treino estado={estado.data} geracoes={geracoes.data} modelos={modelos.data} config={config.data} />
}

function Treino({
  estado,
  geracoes,
  modelos,
  config,
}: {
  estado: EstadoTreino
  geracoes: Geracao[]
  modelos: Modelo[]
  config: ConfigTreino
}) {
  const ultima = geracoes.at(-1)!
  const recentes = geracoes.slice(-20)
  const mediaSegundos = recentes.reduce((s, g) => s + g.segundos, 0) / recentes.length
  const rodandoHa = geracoes.reduce((s, g) => s + g.segundos, 0)
  const melhorDeTodas = Math.max(...geracoes.map((g) => g.melhor))
  const fases = situacaoDasFases(estado)
  const campeao = [...modelos].sort((a, b) => b.geracao - a.geracao)[0]
  const origem = useOrigemTreino()
  const [a, setA] = useState(Math.max(1, ultima.numero - 270))
  const [b, setB] = useState(ultima.numero)
  // Ao vivo: se o "b" da comparação estava na última geração, ele acompanha as
  // novas. Se o Gabriel escolheu outra, respeitamos a escolha.
  // (Ajuste de estado durante o render, o jeito que o React recomenda para
  // "estado que depende de prop", em vez de um useEffect.)
  const [ultimaVista, setUltimaVista] = useState(ultima.numero)
  if (ultima.numero !== ultimaVista) {
    if (b === ultimaVista) setB(ultima.numero)
    setUltimaVista(ultima.numero)
  }

  return (
    <VStack gap={5} paddingBlock={6}>
      <VStack gap={1}>
        <Heading level={1}>Treino e gerações</Heading>
        <Text color="secondary">
          {estado.rodando ? 'Rodando' : 'Parado'} em {estado.onde} ·{' '}
          {origem === 'nuvem' ? 'ao vivo, direto do treino' : 'dados de exemplo até o treino real exportar os seus'}
        </Text>
      </VStack>

      <Grid columns={4} gap={3}>
        <Numero rotulo="geração" valor={formatarNumero(ultima.numero)} termo="geracao" />
        <Numero rotulo="segundos por geração" valor={formatarNumero(mediaSegundos, 1)} termo="geracao" />
        <Numero rotulo="tempo rodando" valor={duracao(rodandoHa)} termo="geracao" />
        <Numero rotulo="melhor nota" valor={nota(melhorDeTodas)} termo="nota" />
      </Grid>

      <VStack gap={2}>
        <HStack gap={1} align="center">
          <Heading level={2}>Currículo</Heading>
          <OQueEIsso id="curriculo" />
        </HStack>
        <section className={css.fases}>
          {fases.map((f) => (
            <Card key={f.numero} className={`${css.fase} ${css[f.situacao]}`} padding={3}>
              <VStack gap={1}>
                <HStack justify="between" align="center">
                  <Text weight="medium">
                    {f.situacao === 'feita' ? '✓ ' : ''}Fase {f.numero} · {f.nome}
                  </Text>
                </HStack>
                <Text type="supporting" color="secondary">
                  {f.obstaculo}
                </Text>
                <Text type="code" color="secondary">
                  {f.situacao === 'feita' && `g${f.inicio}–g${f.fim}`}
                  {f.situacao === 'atual' && `desde g${f.inicio} · agora g${f.fim}`}
                  {f.situacao === 'futura' && 'ainda não'}
                </Text>
                {f.situacao === 'atual' && <Text type="supporting">Passa quando: {estado.criterioPassagem}</Text>}
              </VStack>
            </Card>
          ))}
        </section>
      </VStack>

      <Card>
        <VStack gap={2}>
          <Heading level={2}>Curva de aprendizado</Heading>
          <CurvaAprendizado
            geracoes={geracoes}
            fases={fases
              .filter((f) => f.inicio !== undefined)
              .map((f) => ({ fase: f.numero, inicio: f.inicio!, fim: f.fim ?? ultima.numero }))}
            formatarNota={nota}
            marcas={[a, b]}
          />
          <HStack gap={4} wrap="wrap">
            <Legenda cor="var(--serie-verde)" texto="melhor rede" />
            <Legenda cor="var(--serie-azul)" texto="rede mediana" />
            <Legenda cor="var(--serie-cinza)" texto="regras fixas (tracejada)" />
          </HStack>
          <Text type="supporting" color="secondary">
            A queda ao entrar numa fase é esperada: o problema ficou mais difícil (entrou a solução, o clima real, o
            ruído…). O que importa é ela voltar a subir e passar das regras fixas.
          </Text>
        </VStack>
      </Card>

      <Grid columns={2} gap={4}>
        {campeao && <Esqueceu campeao={campeao} />}
        <Comparar geracoes={geracoes} a={a} b={b} setA={setA} setB={setB} />
      </Grid>

      <Configuracao config={config} />
    </VStack>
  )
}

function Esqueceu({ campeao }: { campeao: Modelo }) {
  const p = provas(campeao)
  const esquecidas = p.filter((x) => x.esqueceu)
  return (
    <Card>
      <VStack gap={2}>
        <HStack gap={1} align="center">
          <Heading level={2}>Ele esqueceu algo?</Heading>
          <OQueEIsso id="esquecimentoCatastrofico" />
        </HStack>
        <Text type="supporting" color="secondary">
          O campeão atual ({campeao.id}, fase {campeao.fase}) refaz a prova de cada fase. Abaixo de{' '}
          {LIMIAR_ESQUECEU * 100}%, ele esqueceu.
        </Text>
        {p.map((x) => (
          <VStack key={x.fase} gap={0.5}>
            <HStack justify="between">
              <Text>
                Fase {x.fase} · {FASES.find((f) => f.numero === x.fase)?.nome}
                {x.aprendendo && ' · aprendendo agora'}
              </Text>
              <Text hasTabularNumbers weight={x.esqueceu ? 'medium' : 'normal'}>
                {formatarNumero(x.acerto * 100)}%
              </Text>
            </HStack>
            <ProgressBar
              label={`Prova da fase ${x.fase}`}
              isLabelHidden
              value={x.acerto * 100}
              variant={x.esqueceu ? 'warning' : x.aprendendo ? 'neutral' : 'success'}
            />
          </VStack>
        ))}
        {esquecidas.map((x) => (
          <Banner
            key={x.fase}
            status="warning"
            title={`Esqueceu um pouco da fase ${x.fase}`}
            description={x.sugestao}
            collapsible={false}
          />
        ))}
      </VStack>
    </Card>
  )
}

function Comparar({
  geracoes,
  a,
  b,
  setA,
  setB,
}: {
  geracoes: Geracao[]
  a: number
  b: number
  setA: (n: number) => void
  setB: (n: number) => void
}) {
  const ultima = geracoes.at(-1)!.numero
  const ga = geracoes.find((g) => g.numero === a)
  const gb = geracoes.find((g) => g.numero === b)
  type Linha = { id: string; metrica: string; a: string; b: string }
  const linhas: Linha[] =
    ga && gb
      ? [
          { id: 'fase', metrica: 'Fase', a: String(ga.fase), b: String(gb.fase) },
          { id: 'melhor', metrica: 'Melhor nota', a: nota(ga.melhor), b: nota(gb.melhor) },
          { id: 'mediana', metrica: 'Nota mediana', a: nota(ga.mediana), b: nota(gb.mediana) },
          { id: 'regras', metrica: 'Regras fixas (mesmo clima)', a: nota(ga.regras), b: nota(gb.regras) },
          { id: 'segundos', metrica: 'Segundos', a: formatarNumero(ga.segundos, 2), b: formatarNumero(gb.segundos, 2) },
        ]
      : []
  return (
    <Card>
      <VStack gap={2}>
        <Heading level={2}>Comparar gerações</Heading>
        <HStack gap={3}>
          <NumberInput label="Geração A" value={a} onChange={(v) => setA(limitar(v, ultima))} min={1} max={ultima} />
          <NumberInput label="Geração B" value={b} onChange={(v) => setB(limitar(v, ultima))} min={1} max={ultima} />
        </HStack>
        <Table<Linha>
          data={linhas}
          idKey="id"
          density="compact"
          columns={[
            { key: 'metrica', header: 'Métrica' },
            { key: 'a', header: `g${a}`, align: 'end' },
            { key: 'b', header: `g${b}`, align: 'end' },
          ]}
        />
        <Link href="/dev">Ver os campeões nas estufas lado a lado</Link>
      </VStack>
    </Card>
  )
}

const limitar = (v: number, max: number) => Math.min(max, Math.max(1, Math.round(v || 1)))

function Configuracao({ config }: { config: ConfigTreino }) {
  const itens: { nome: string; valor: string; termo: IdTermo }[] = [
    {
      nome: 'População',
      valor: formatarNumero(config.populacao),
      termo: 'populacao',
    },
    {
      nome: 'Elite',
      valor: `${formatarNumero(config.elite * 100)}%`,
      termo: 'elitismo',
    },
    {
      nome: 'Torneio',
      valor: String(config.torneio),
      termo: 'torneio',
    },
    {
      nome: 'Mutação',
      valor: formatarNumero(config.mutacao, 2),
      termo: 'mutacao',
    },
    {
      nome: 'Mistura de fases',
      valor: `${formatarNumero(config.misturaFases * 100)}%`,
      termo: 'misturaFases',
    },
    {
      nome: 'Arquitetura',
      valor: config.arquitetura.join(' → '),
      termo: 'mlp',
    },
    {
      nome: 'Passo do simulador',
      valor: `${config.passoMinutos} min`,
      termo: 'geracao',
    },
  ]
  return (
    <Card>
      <VStack gap={2}>
        <Heading level={2}>Configuração do treino</Heading>
        <Text type="supporting" color="secondary">
          Só leitura: quem muda é o treino, no backend.
        </Text>
        <section className={css.config}>
          {itens.map((i) => (
            <VStack key={i.nome} gap={0.5}>
              <HStack gap={1} align="center">
                <Text type="supporting" color="secondary">
                  {i.nome}
                </Text>
                <OQueEIsso id={i.termo} />
              </HStack>
              <Text size="lg" weight="medium" hasTabularNumbers>
                {i.valor}
              </Text>
            </VStack>
          ))}
        </section>
      </VStack>
    </Card>
  )
}

function Numero({ rotulo, valor, termo }: { rotulo: string; valor: string; termo: IdTermo }) {
  return (
    <Card>
      <VStack gap={0.5}>
        <Text size="2xl" weight="medium" hasTabularNumbers>
          {valor}
        </Text>
        <HStack gap={1} align="center">
          <Text type="supporting" color="secondary">
            {rotulo}
          </Text>
          <OQueEIsso id={termo} />
        </HStack>
      </VStack>
    </Card>
  )
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <HStack gap={1.5} align="center">
      <span className={css.ponto} style={{ background: cor }} aria-hidden />
      <Text type="supporting" color="secondary">
        {texto}
      </Text>
    </HStack>
  )
}

function duracao(segundos: number): string {
  const h = Math.floor(segundos / 3600)
  const m = Math.round((segundos % 3600) / 60)
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}
