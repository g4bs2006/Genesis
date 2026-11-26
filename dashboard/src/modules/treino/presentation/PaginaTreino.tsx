/**
 * Desenvolvedor · Treino e gerações: como a neuroevolução está indo.
 * Só usa o módulo treino; por isso mora nele.
 */
import { useState } from 'react'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Link } from '@astryxdesign/core/Link'
import { NumberInput } from '@astryxdesign/core/NumberInput'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { proportional, Table } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { CurvaAprendizado } from '@/shared/design-system/graficos/CurvaAprendizado'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { formatarNumero } from '@/shared/lib/formatar'
import type { ConfigTreino, EstadoTreino, Geracao } from '../domain/contrato'
import { useConfigTreino, useEstadoTreino, useGeracoes, useOrigemTreino } from './dados'
import { AvisoTreino } from './AvisoTreino'

const nota = (v: number) => `R$ ${formatarNumero(v)}`

export function PaginaTreino() {
  const estado = useEstadoTreino()
  const geracoes = useGeracoes()
  const config = useConfigTreino()
  const pronto = estado.data && geracoes.data && config.data
  const erro = estado.error ?? geracoes.error ?? config.error
  const esboco = useAtraso(!pronto && !erro)
  if (erro && !pronto) return <AvisoTreino erro={erro} />
  if (!pronto) return esboco ? <Skeleton height={640} radius={3} /> : null
  if (geracoes.data.length === 0) return <AvisoTreino semGeracoes />
  return <Treino estado={estado.data} geracoes={geracoes.data} config={config.data} />
}

function Treino({ estado, geracoes, config }: { estado: EstadoTreino; geracoes: Geracao[]; config: ConfigTreino }) {
  const ultima = geracoes.at(-1)!
  const recentes = geracoes.slice(-20)
  const mediaSegundos = recentes.reduce((s, g) => s + g.segundos, 0) / recentes.length
  const rodandoHa = geracoes.reduce((s, g) => s + g.segundos, 0)
  const melhorDeTodas = Math.max(...geracoes.map((g) => g.melhor))
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

      {/* colunas pela largura mínima: no celular os números descem, não quebram no meio */}
      <Grid columns={{ minWidth: 160, repeat: 'fit' }} gap={3}>
        <Numero rotulo="geração" valor={formatarNumero(ultima.numero)} />
        <Numero rotulo="segundos por geração" valor={formatarNumero(mediaSegundos, 1)} />
        <Numero rotulo="tempo rodando" valor={duracao(rodandoHa)} />
        <Numero rotulo="melhor nota" valor={nota(melhorDeTodas)} />
      </Grid>

      <Card>
        <VStack gap={2}>
          <Heading level={2}>Curva de aprendizado</Heading>
          <CurvaAprendizado geracoes={geracoes} formatarNota={nota} marcas={[a, b]} />
        </VStack>
      </Card>

      <Comparar geracoes={geracoes} a={a} b={b} setA={setA} setB={setB} />

      <Configuracao config={config} />
    </VStack>
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
            // a métrica tem piso de largura: no celular a tabela rola de lado em vez de partir palavras
            { key: 'metrica', header: 'Métrica', width: proportional(2, { minWidth: 150 }) },
            { key: 'a', width: proportional(1, { minWidth: 88 }), header: `g${a}`, align: 'end' },
            { key: 'b', width: proportional(1, { minWidth: 88 }), header: `g${b}`, align: 'end' },
          ]}
        />
        <Link href="/dev">Ver os campeões nas estufas lado a lado</Link>
      </VStack>
    </Card>
  )
}

const limitar = (v: number, max: number) => Math.min(max, Math.max(1, Math.round(v || 1)))

function Configuracao({ config }: { config: ConfigTreino }) {
  const itens: { nome: string; valor: string }[] = [
    {
      nome: 'População',
      valor: formatarNumero(config.populacao),
    },
    {
      nome: 'Elite',
      valor: `${formatarNumero(config.elite * 100)}%`,
    },
    {
      nome: 'Torneio',
      valor: String(config.torneio),
    },
    {
      nome: 'Mutação',
      valor: formatarNumero(config.mutacao, 2),
    },
    {
      nome: 'Arquitetura',
      valor: config.arquitetura.join(' → '),
    },
    {
      nome: 'Passo do simulador',
      valor: `${config.passoMinutos} min`,
    },
  ]
  return (
    <Card>
      <VStack gap={2}>
        <Heading level={2}>Configuração do treino</Heading>
        <Text type="supporting" color="secondary">
          Só leitura: quem muda é o treino, no backend.
        </Text>
        <Grid columns={{ minWidth: 160, repeat: 'fit' }} gap={4}>
          {itens.map((i) => (
            <VStack key={i.nome} gap={0.5}>
              <Text type="supporting" color="secondary">
                {i.nome}
              </Text>
              <Text size="lg" weight="medium" hasTabularNumbers>
                {i.valor}
              </Text>
            </VStack>
          ))}
        </Grid>
      </VStack>
    </Card>
  )
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <Card>
      <VStack gap={0.5}>
        <Text size="2xl" weight="medium" hasTabularNumbers>
          {valor}
        </Text>
        <Text type="supporting" color="secondary">
          {rotulo}
        </Text>
      </VStack>
    </Card>
  )
}

function duracao(segundos: number): string {
  const h = Math.floor(segundos / 3600)
  const m = Math.round((segundos % 3600) / 60)
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}
