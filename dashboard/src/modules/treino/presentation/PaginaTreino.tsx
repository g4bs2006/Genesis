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
import { InfoTip } from '@astryxdesign/core/InfoTip'
import { Link } from '@astryxdesign/core/Link'
import { NumberInput } from '@astryxdesign/core/NumberInput'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Table } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { CurvaAprendizado } from '@/shared/design-system/graficos/CurvaAprendizado'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { formatarNumero } from '@/shared/lib/formatar'
import type { ConfigTreino, EstadoTreino, Geracao, Modelo } from '../domain/contrato'
import { FASES, LIMIAR_ESQUECEU, provas, situacaoDasFases } from '../domain/curriculo'
import { useConfigTreino, useEstadoTreino, useGeracoes, useModelos } from './dados'
import css from './PaginaTreino.module.css'

const nota = (v: number) => `R$ ${formatarNumero(v)}`

export function PaginaTreino() {
  const estado = useEstadoTreino()
  const geracoes = useGeracoes()
  const modelos = useModelos()
  const config = useConfigTreino()
  const pronto = estado.data && geracoes.data && modelos.data && config.data
  const esboco = useAtraso(!pronto)
  if (!pronto) return esboco ? <Skeleton height={640} radius={3} /> : null
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
  const [a, setA] = useState(Math.max(1, ultima.numero - 270))
  const [b, setB] = useState(ultima.numero)

  return (
    <VStack gap={5} paddingBlock={6}>
      <VStack gap={1}>
        <Heading level={1}>Treino e gerações</Heading>
        <Text color="secondary">
          {estado.rodando ? 'Rodando' : 'Parado'} em {estado.onde} · dados de exemplo até o treino real exportar os seus
        </Text>
      </VStack>

      <Grid columns={4} gap={3}>
        <Numero
          rotulo="geração"
          valor={formatarNumero(ultima.numero)}
          dica="Uma rodada inteira: todas as redes cultivam um ciclo e as melhores geram a próxima população."
        />
        <Numero
          rotulo="segundos por geração"
          valor={formatarNumero(mediaSegundos, 1)}
          dica="Média das últimas 20 gerações na GPU. Cada geração simula um ciclo de 35 dias para cada rede da população."
        />
        <Numero
          rotulo="tempo rodando"
          valor={duracao(rodandoHa)}
          dica="Soma do tempo de todas as gerações até agora."
        />
        <Numero
          rotulo="melhor nota"
          valor={nota(melhorDeTodas)}
          dica="Nota = reais por ciclo: venda menos gastos, menos uma punição pelo tempo fora da faixa."
        />
      </Grid>

      <VStack gap={2}>
        <HStack gap={1} align="center">
          <Heading level={2}>Currículo</Heading>
          <InfoTip content="O treino vai de fase em fase, como uma escola: cada fase acrescenta um obstáculo novo. Passa de fase quando o campeão cumpre o critério." />
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
          <InfoTip content="Esquecimento catastrófico: ao aprender uma fase nova, a rede pode desaprender as antigas. O campeão refaz a prova de cada fase já vista." />
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
            { key: 'metrica', header: '' },
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
  const itens: { nome: string; valor: string; dica: string }[] = [
    {
      nome: 'População',
      valor: formatarNumero(config.populacao),
      dica: 'Quantas redes cultivam juntas em cada geração, cada uma na sua estufa simulada.',
    },
    {
      nome: 'Elite',
      valor: `${formatarNumero(config.elite * 100)}%`,
      dica: 'Elitismo: as melhores passam intactas para a próxima geração, para o melhor nunca se perder.',
    },
    {
      nome: 'Torneio',
      valor: String(config.torneio),
      dica: 'Para escolher cada pai, sorteia-se este número de redes e a melhor delas vence.',
    },
    {
      nome: 'Mutação',
      valor: formatarNumero(config.mutacao, 2),
      dica: 'O tamanho do ruído somado aos pesos dos filhos. É de onde surge coisa nova.',
    },
    {
      nome: 'Mistura de fases',
      valor: `${formatarNumero(config.misturaFases * 100)}%`,
      dica: 'Parte dos cenários de cada geração vem das fases anteriores, para não esquecer o que já aprendeu.',
    },
    {
      nome: 'Arquitetura',
      valor: config.arquitetura.join(' → '),
      dica: 'Entradas, neurônios de cada camada escondida e saídas da rede (uma por atuador).',
    },
    {
      nome: 'Passo do simulador',
      valor: `${config.passoMinutos} min`,
      dica: 'A cada passo, a rede lê os sensores e decide; o simulador avança este tempo.',
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
                <InfoTip content={i.dica} label={`O que é ${i.nome}?`} />
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

function Numero({ rotulo, valor, dica }: { rotulo: string; valor: string; dica: string }) {
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
          <InfoTip content={dica} label={`O que é ${rotulo}?`} />
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
