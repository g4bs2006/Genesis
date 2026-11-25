/**
 * Desenvolvedor · Estufas lado a lado: os controladores (campeões, PID,
 * regras) no mesmo clima, comparados em dinheiro, massa, energia e erros.
 * Junta estufa, alface e dinheiro: por isso mora em composicoes.
 */
import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Badge } from '@astryxdesign/core/Badge'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { AlfaceImagem, aparenciaMedia, descreverPlanta } from '@/modules/alface'
import { formatarReaisCurto, resultadoDoCiclo, usePrecos } from '@/modules/dinheiro'
import {
  FAIXAS,
  PERTURBACOES,
  useEstufas,
  useJanela,
  useRelogio,
  useResumos,
  valorDe,
  valorExibido,
  type Controlador,
  type Estufa,
  type Passo,
  type Perturbacao,
  type ResumoCiclo,
  type Variavel,
} from '@/modules/estufa'
import { corDaSerie } from '@/shared/design-system/graficos/estilo'
import { GraficoSerie } from '@/shared/design-system/graficos/GraficoSerie'
import { MapaCalor } from '@/shared/design-system/graficos/MapaCalor'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { formatarData, formatarHora, formatarNumero } from '@/shared/lib/formatar'
import { origemDosDados } from '../dependencias'
import css from './PaginaEstufasLadoALado.module.css'
import { OQueEIsso } from '@/modules/glossario'

const NOME_CONTROLADOR: Record<Controlador['tipo'], string> = {
  agente: 'agente',
  regras: 'regras fixas',
  pid: 'PID',
  nada: 'sem controle',
}
const NOME_PERTURBACAO: Record<Perturbacao, string> = {
  ondaDeCalor: 'Onda de calor',
  phDescalibra: 'Sensor de pH descalibra',
  bombaTrava: 'Bomba trava',
  quedaDeEnergia: 'Queda de energia',
  ruidoSensores: 'Ruído nos sensores',
  tarifaDePico: 'Tarifa de pico',
}
const VARIAVEIS_COMPARADAS: Variavel[] = ['temperatura', 'umidade', 'ph', 'ec', 'temperaturaAgua']

export function PaginaEstufasLadoALado() {
  const estufas = useEstufas()
  const esboco = useAtraso(!estufas.data)
  if (!estufas.data) return esboco ? <Skeleton height={600} radius={3} /> : null
  return <LadoALado estufas={estufas.data} />
}

function LadoALado({ estufas }: { estufas: Estufa[] }) {
  const resumos = useResumos(estufas.map((e) => e.id))
  const precos = usePrecos()
  const { estado: relogio, controle } = useRelogio()
  const cliente = useQueryClient()
  const [variavel, setVariavel] = useState<Variavel>('temperatura')
  const [instante, setInstante] = useState<number | null>(null)
  const [passos, setPassos] = useState<Record<string, Passo[]>>({})
  const aoPassos = useCallback((id: string, p: Passo[]) => setPassos((a) => ({ ...a, [id]: p })), [])

  // ranking pelo resultado em R$ (preço médio); sem preços ainda, a ordem original
  const lucro = (i: number) => {
    const r = resumos[i]?.data
    return r && precos.data ? resultadoDoCiclo(r, estufas[i]!.plantas, precos.data, 'medio').lucro : null
  }
  const ordem = estufas
    .map((e, i) => ({ e, i, lucro: lucro(i) }))
    .sort((a, b) => (b.lucro ?? -Infinity) - (a.lucro ?? -Infinity))

  const injetar = (p: Perturbacao) => {
    controle?.injetar(p)
    // a perturbação vira Evento em todas as estufas: a lista precisa recarregar
    setTimeout(() => cliente.invalidateQueries({ queryKey: ['eventos'] }), 300)
  }
  const acelerado = (relogio?.velocidade ?? 1) > 1
  const semSimulador = 'Disponível com o simulador (npm run dev)'
  const semBackend = 'Chega com o simulador do backend (clima do INMET e estufas novas)'
  const primeiroPasso = Object.values(passos)[0]?.at(-1)

  return (
    <VStack gap={5} paddingBlock={6}>
      <HStack justify="between" align="end" wrap="wrap" gap={3}>
        <VStack gap={1}>
          <Heading level={1}>Estufas lado a lado</Heading>
          <HStack gap={2} align="center" wrap="wrap">
            <Text color="secondary">
              O mesmo clima para todos
              {primeiroPasso &&
                ` · ${formatarData(primeiroPasso.leitura.instante)} ${formatarHora(primeiroPasso.leitura.instante)}`}
            </Text>
            <Badge
              variant="neutral"
              label={origemDosDados === 'exemplo' ? 'clima de exemplo' : 'simulador de brinquedo'}
            />
          </HStack>
        </VStack>
        <HStack gap={2} wrap="wrap">
          <Button label="Escolher o clima" isDisabled tooltip={semBackend} />
          <Button label="+ Estufa" isDisabled tooltip={semBackend} />
          <Button
            label={acelerado ? 'Voltar ao normal' : 'Rodar ciclo acelerado'}
            variant="primary"
            isDisabled={!controle}
            tooltip={semSimulador}
            onClick={() => controle?.acelerar(acelerado ? 1 : 60)}
          />
        </HStack>
      </HStack>
      {/* botão apagado sem motivo parece defeito: uma linha diz por quê (a dica não abre em botão desabilitado) */}
      {!controle && (
        <Text type="supporting" color="secondary">
          Botões apagados: o clima, as estufas e as perturbações precisam do simulador (npm run dev).
        </Text>
      )}

      <section className={css.cartoes}>
        {ordem.map(({ e, i }, posicao) => (
          <CartaoEstufa
            key={e.id}
            estufa={e}
            posicao={posicao + 1}
            cor={corDaSerie(i)}
            resumo={resumos[i]?.data}
            lucro={lucro(i)}
            instante={instante}
            aoPassos={aoPassos}
          />
        ))}
      </section>

      <Card>
        <VStack gap={3}>
          <HStack justify="between" align="center" wrap="wrap" gap={2}>
            <Heading level={2}>Uma variável nas {estufas.length} estufas</Heading>
            <SegmentedControl label="Variável" value={variavel} onChange={(v) => setVariavel(v as Variavel)}>
              {VARIAVEIS_COMPARADAS.map((v) => (
                <SegmentedControlItem key={v} value={v} label={FAIXAS[v].nome} />
              ))}
            </SegmentedControl>
          </HStack>
          <GraficoSerie
            series={estufas.map((e, i) => ({
              nome: e.nome,
              cor: corDaSerie(i),
              pontos: (passos[e.id] ?? []).map((p) => ({
                t: Date.parse(p.leitura.instante),
                v: valorExibido(variavel, valorDe(p.leitura, variavel)),
              })),
            }))}
            faixa={[valorExibido(variavel, FAIXAS[variavel].min), valorExibido(variavel, FAIXAS[variavel].max)]}
            altura={340}
            rotulo={`${FAIXAS[variavel].nome} nas estufas, nas últimas 24 horas`}
            formatarValor={(v) => `${formatarNumero(v, FAIXAS[variavel].casas)} ${FAIXAS[variavel].unidade}`}
            formatarTempo={(t) => formatarHora(new Date(t).toISOString())}
            instante={instante}
            aoMoverInstante={setInstante}
          />
          <Text type="supporting" color="secondary">
            Passe o ponteiro no gráfico: as alfaces mostram aquele instante.
          </Text>
        </VStack>
      </Card>

      <Grid columns={2} gap={4}>
        <Card>
          <VStack gap={2}>
            <Heading level={2}>Onde cada um erra</Heading>
            <Text type="supporting" color="secondary">
              % do tempo fora da faixa, por variável e por controlador.
            </Text>
            <MapaDeErros estufas={estufas} resumos={resumos.map((r) => r.data)} />
          </VStack>
        </Card>
        <Card>
          <VStack gap={2}>
            <HStack gap={1} align="center">
              <Heading level={2}>Injetar perturbação</Heading>
              <OQueEIsso id="perturbacao" />
            </HStack>
            <Grid columns={2} gap={2}>
              {PERTURBACOES.map((p) => (
                <Button
                  key={p}
                  label={NOME_PERTURBACAO[p]}
                  isDisabled={!controle}
                  tooltip={semSimulador}
                  onClick={() => injetar(p)}
                />
              ))}
            </Grid>
          </VStack>
        </Card>
      </Grid>
    </VStack>
  )
}

function CartaoEstufa({
  estufa,
  posicao,
  cor,
  resumo,
  lucro,
  instante,
  aoPassos,
}: {
  estufa: Estufa
  posicao: number
  cor: string
  resumo: ResumoCiclo | undefined
  lucro: number | null
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

  // a alface no instante escolhido no gráfico (ou agora)
  const indice = instante == null ? passos.length - 1 : maisPerto(passos, instante)
  const recentes = passos.slice(Math.max(0, indice - 5), indice + 1).map((p) => p.leitura)
  const parametros = aparenciaMedia(recentes, estufa.massaPorPe)

  return (
    <Card className={css.cartao}>
      <VStack gap={2}>
        <HStack justify="between" align="center">
          <HStack gap={1.5} align="center">
            <span className={css.ponto} style={{ background: cor }} aria-hidden />
            <Text weight="medium">{estufa.nome}</Text>
          </HStack>
          <Text type="code" color="secondary">
            #{posicao}
          </Text>
        </HStack>
        <Text type="supporting" color="secondary">
          {NOME_CONTROLADOR[estufa.controlador.tipo]}
          {estufa.controlador.tipo === 'agente' && ` · ${estufa.controlador.modeloId}`}
        </Text>
        <AlfaceImagem parametros={parametros} rotulo={descreverPlanta(parametros)} largura={180} />
        <Text size="xl" weight="medium" hasTabularNumbers>
          {lucro == null ? '—' : formatarReaisCurto(lucro)}
        </Text>
        {resumo && (
          <dl className={css.numeros}>
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
  if (variaveis.length === 0) return <Skeleton height={200} radius={2} />
  return (
    <MapaCalor
      linhas={variaveis.map((v) => FAIXAS[v]?.nome ?? v)}
      colunas={estufas.map((e) => e.nome)}
      valores={variaveis.map((v) => resumos.map((r) => r?.foraPorVariavel[v] ?? 0))}
      formatar={(x) => `${formatarNumero(x * 100, 1)}%`}
      rotulo="Porcentagem do tempo fora da faixa por variável e por estufa"
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
