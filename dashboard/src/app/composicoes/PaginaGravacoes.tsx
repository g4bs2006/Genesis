/**
 * Desenvolvedor · Gravações: campeões de gerações diferentes reproduzindo o
 * mesmo ciclo lado a lado, num relógio só. A alface cresce, os medidores
 * mexem e os atuadores acendem conforme as AÇÕES GRAVADAS no treino; a rede
 * não roda aqui (ver reproducao.ts e docs/plano.md, "Mostrar a evolução").
 * Junta treino, estufa e alface: por isso mora em composicoes.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { List, ListItem } from '@astryxdesign/core/List'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Selector } from '@astryxdesign/core/Selector'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Slider } from '@astryxdesign/core/Slider'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { AlfaceImagem, aparenciaMedia, descreverPlanta } from '@/modules/alface'
import {
  estadoDoGrupo,
  FAIXAS,
  GRUPOS_CELULAR,
  massaNoDia,
  valorDe,
  valorExibido,
  type EstadoVariavel,
  type Grupo,
  type Passo,
} from '@/modules/estufa'
import {
  AvisoTreino,
  useGravacao,
  useGravacoes,
  useModelos,
  type Gravacao,
  type ResumoGravacao,
} from '@/modules/treino'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { formatarData, formatarHora, formatarNumero } from '@/shared/lib/formatar'
import { MiniRede } from './MiniRede'
import css from './PaginaGravacoes.module.css'
import {
  alternar,
  andar,
  avancar,
  buscar,
  criarReproducao,
  diaDoPasso,
  eventosDaGravacao,
  lerParametros,
  MAXIMO_LADO_A_LADO,
  montarBusca,
  mudarVelocidade,
  passoAtual,
  passoDoInstante,
  VELOCIDADES,
  type EventoGravacao,
} from './reproducao'

export function PaginaGravacoes() {
  const lista = useGravacoes()
  const esboco = useAtraso(!lista.data)
  if (lista.error) return <AvisoTreino erro={lista.error} />
  if (!lista.data) return esboco ? <Skeleton height={600} radius={3} /> : null
  // só monta a reprodução com a lista em mãos: os parâmetros do link são conferidos contra ela
  return <Reproducao resumos={lista.data} />
}

/** "Dia 3 · 14:00": dia contado a partir de 1, como o produtor conta. */
function rotuloDoPasso(passos: readonly Passo[], i: number): string {
  const p = passos[Math.min(i, passos.length - 1)]
  if (!p) return `Passo ${i}`
  return `Dia ${Math.floor(diaDoPasso(passos, i)) + 1} · ${formatarHora(p.leitura.instante)}`
}

function Reproducao({ resumos }: { resumos: ResumoGravacao[] }) {
  const [busca] = useSearchParams()
  // os parâmetros só valem na chegada (link copiado ou pulo vindo da página Modelo)
  const [inicial] = useState(() => {
    const p = lerParametros(busca)
    const existentes = p.ids.filter((id) => resumos.some((r) => r.id === id))
    if (existentes.length > 0 || !p.evento) return { ids: existentes, t: p.t, evento: null }
    // ?evento=<instante>: abre a gravação mais recente e, quando ela chegar, pula para aquele horário
    const recente = resumos.toSorted((a, b) => Date.parse(b.criadaEm) - Date.parse(a.criadaEm))[0]
    return {
      ids: recente ? [recente.id] : [],
      t: null,
      evento: recente ? { id: recente.id, instante: p.evento } : null,
    }
  })
  const [selecionadas, setSelecionadas] = useState<string[]>(inicial.ids)
  const [estado, setEstado] = useState(() => criarReproducao(inicial.t ?? 0))
  const [gravacoes, setGravacoes] = useState<Record<string, Gravacao>>({})
  const [eventoEscolhido, setEventoEscolhido] = useState<string | undefined>()
  const [copia, setCopia] = useState<'copiado' | 'falhou' | null>(null)
  const eventoPendente = useRef(inicial.evento)

  // o relógio vai até o fim da gravação mais longa; as mais curtas param no último passo delas
  const total = Math.max(0, ...resumos.filter((r) => selecionadas.includes(r.id)).map((r) => r.passos))
  const passo = Math.min(passoAtual(estado), Math.max(0, total - 1))

  const aoCarregar = useCallback((g: Gravacao) => {
    setGravacoes((a) => (a[g.id] ? a : { ...a, [g.id]: g }))
    const pendente = eventoPendente.current
    if (pendente?.id === g.id) {
      eventoPendente.current = null
      const alvo = passoDoInstante(g.passos, pendente.instante)
      setEstado((e) => buscar(e, alvo, g.passos.length))
    }
  }, [])

  // Relógio: requestAnimationFrame chama a função a cada quadro da tela
  // (~60 vezes por segundo) com o horário do quadro. O relógio anda o tempo
  // que passou desde o quadro anterior, então a velocidade é a mesma num
  // monitor de 60 Hz ou de 144 Hz, e a aba em segundo plano não acumula passos.
  useEffect(() => {
    if (!estado.tocando) return
    let anterior: number | null = null
    let quadro = requestAnimationFrame(function tique(agora) {
      if (anterior !== null) {
        const ms = agora - anterior
        setEstado((e) => avancar(e, ms, total))
      }
      anterior = agora
      quadro = requestAnimationFrame(tique)
    })
    return () => cancelAnimationFrame(quadro)
  }, [estado.tocando, total])

  // Teclado: espaço toca/pausa; setas andam 1 passo (com Shift, 1 dia).
  // Ignora quando o foco está num controle, que já usa essas teclas (a régua anda com as setas, o botão com espaço).
  useEffect(() => {
    const aoTeclar = (ev: KeyboardEvent) => {
      if (ev.altKey || ev.ctrlKey || ev.metaKey) return
      const alvo = ev.target instanceof Element ? ev.target : null
      if (alvo?.closest('input, textarea, select, button, a, [role="slider"], [role="radio"], [role="combobox"]'))
        return
      const delta = ev.shiftKey ? 24 : 1
      if (ev.key === ' ') setEstado((e) => alternar(e, total))
      else if (ev.key === 'ArrowRight') setEstado((e) => andar(e, delta, total))
      else if (ev.key === 'ArrowLeft') setEstado((e) => andar(e, -delta, total))
      else return
      ev.preventDefault() // sem isso o espaço rola a página
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [total])

  const alternarSelecao = (id: string) =>
    setSelecionadas((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length < MAXIMO_LADO_A_LADO ? [...s, id] : s,
    )

  // eventos de todas as gravações abertas, em ordem de tempo
  const eventos = useMemo(() => {
    const todos: (EventoGravacao & { chave: string; rotulo: string })[] = []
    for (const id of selecionadas) {
      const g = gravacoes[id]
      if (!g) continue
      eventosDaGravacao(g.passos).forEach((ev, i) =>
        todos.push({
          ...ev,
          chave: `${id}:${i}`,
          rotulo: `${rotuloDoPasso(g.passos, ev.passo)} · ${ev.texto} (${g.modeloId})`,
        }),
      )
    }
    return todos.sort((a, b) => a.passo - b.passo)
  }, [selecionadas, gravacoes])

  const copiarLink = async () => {
    const url = `${location.origin}${location.pathname}${montarBusca(selecionadas, passo)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopia('copiado')
    } catch {
      // a área de transferência só existe em https/localhost e com permissão
      setCopia('falhou')
    }
    setTimeout(() => setCopia(null), 2000)
  }

  const referencia = selecionadas.map((id) => gravacoes[id]).find(Boolean)
  const diasDoCiclo = referencia ? Math.ceil(diaDoPasso(referencia.passos, referencia.passos.length - 1)) : 0
  const relogio = referencia
    ? `${rotuloDoPasso(referencia.passos, passo).replace(' ·', ` de ${diasDoCiclo} ·`)}`
    : `Passo ${passo} de ${total}`

  return (
    <VStack gap={5} paddingBlock={6}>
      <VStack gap={1}>
        <HStack gap={1} align="center">
          <Heading level={1}>Gravações</Heading>
        </HStack>
        <Text color="secondary">Escolha até {MAXIMO_LADO_A_LADO} ciclos gravados para ver no mesmo relógio.</Text>
      </VStack>

      <Card>
        <List hasDividers header={<Heading level={2}>Gravações disponíveis</Heading>}>
          {resumos.map((r) => {
            const marcada = selecionadas.includes(r.id)
            return (
              <ListItem
                key={r.id}
                // nó em vez de texto: o título quebra linha no celular em vez de perder a fase
                label={<Text>{r.titulo}</Text>}
                description={`modelo ${r.modeloId} · semente ${r.semente} · gravada em ${formatarData(r.criadaEm)}, ${formatarHora(r.criadaEm)}`}
                endContent={
                  <Text type="supporting" color="secondary" hasTabularNumbers>
                    {formatarNumero(r.passos)} passos
                  </Text>
                }
                isSelected={marcada}
                isDisabled={!marcada && selecionadas.length >= MAXIMO_LADO_A_LADO}
                onClick={() => alternarSelecao(r.id)}
              />
            )
          })}
        </List>
      </Card>

      {selecionadas.length === 0 ? (
        <Text color="secondary">Escolha uma ou mais gravações na lista para reproduzir.</Text>
      ) : (
        <>
          <Card>
            <VStack gap={3}>
              <HStack className={css.controles} gap={3} align="center" wrap="wrap">
                <Button
                  label={estado.tocando ? 'Pausar' : 'Tocar'}
                  variant="primary"
                  onClick={() => setEstado((e) => alternar(e, total))}
                />
                <SegmentedControl
                  label="Velocidade"
                  value={String(estado.velocidade)}
                  onChange={(v) => {
                    const velocidade = VELOCIDADES.find((x) => String(x) === v)
                    if (velocidade) setEstado((e) => mudarVelocidade(e, velocidade))
                  }}
                >
                  {VELOCIDADES.map((v) => (
                    <SegmentedControlItem key={v} value={String(v)} label={`${v}×`} />
                  ))}
                </SegmentedControl>
                <Text weight="medium" className={css.relogio}>
                  {relogio}
                </Text>
              </HStack>
              <Slider
                label="Instante do ciclo"
                isLabelHidden
                min={0}
                max={Math.max(0, total - 1)}
                value={passo}
                onChange={(v: number) => setEstado((e) => buscar(e, v, total))}
                formatValue={(v) => (referencia ? rotuloDoPasso(referencia.passos, v) : `Passo ${v}`)}
              />
              <HStack className={css.controles} gap={3} align="center" wrap="wrap">
                <Selector
                  label="Pular para um evento"
                  placeholder={eventos.length ? `${eventos.length} eventos` : 'Carregando eventos…'}
                  options={eventos.map((ev) => ({ value: ev.chave, label: ev.rotulo }))}
                  value={eventoEscolhido}
                  hasSearch
                  searchPlaceholder="Filtrar (ex.: pH, barrou)"
                  isDisabled={eventos.length === 0}
                  onChange={(chave) => {
                    const ev = eventos.find((x) => x.chave === chave)
                    setEventoEscolhido(chave ?? undefined)
                    if (ev) setEstado((e) => buscar({ ...e, tocando: false }, ev.passo, total))
                  }}
                />
                <Button
                  label={
                    copia === 'copiado'
                      ? 'Link copiado'
                      : copia === 'falhou'
                        ? 'Não deu para copiar'
                        : 'Copiar link deste instante'
                  }
                  onClick={() => void copiarLink()}
                />
              </HStack>
            </VStack>
          </Card>

          <section className={css.paineis}>
            {selecionadas.map((id) => {
              const resumo = resumos.find((r) => r.id === id)
              return resumo && <Painel key={id} resumo={resumo} passo={passo} aoCarregar={aoCarregar} />
            })}
          </section>
        </>
      )}
    </VStack>
  )
}

/**
 * Uma gravação no instante do relógio. memo: o relógio atualiza a página a
 * cada quadro, mas o painel só redesenha quando o passo inteiro muda.
 */
const Painel = memo(function Painel({
  resumo,
  passo,
  aoCarregar,
}: {
  resumo: ResumoGravacao
  passo: number
  aoCarregar: (g: Gravacao) => void
}) {
  // cada gravação tem ~0,5 MB e só é baixada quando aberta (import dinâmico)
  const { data: gravacao, error } = useGravacao(resumo.id)
  const modelo = useModelos().data?.find((m) => m.id === resumo.modeloId)
  const esboco = useAtraso(!gravacao && !error)
  useEffect(() => {
    if (gravacao) aoCarregar(gravacao)
  }, [gravacao, aoCarregar])

  return (
    <Card className={css.painel}>
      <section aria-label={`Reprodução de ${resumo.titulo}`}>
        <VStack gap={3}>
          <VStack gap={0.5}>
            {/* uma linha: os painéis lado a lado ficam alinhados (o título inteiro aparece no hover) */}
            <Text weight="medium" maxLines={1}>
              {resumo.titulo}
            </Text>
            <Text type="supporting" color="secondary">
              modelo {resumo.modeloId} · semente {resumo.semente}
            </Text>
          </VStack>
          {error ? (
            <Text color="secondary">Não deu para carregar esta gravação.</Text>
          ) : gravacao ? (
            <>
              <Instante
                passos={gravacao.passos}
                massaPorDia={gravacao.massaPorDia}
                passo={Math.min(passo, gravacao.passos.length - 1)}
              />
              <MiniRede modelo={modelo} passos={gravacao.passos} passo={Math.min(passo, gravacao.passos.length - 1)} />
            </>
          ) : (
            esboco && <Skeleton height={420} radius={2} />
          )}
        </VStack>
      </section>
    </Card>
  )
})

function Instante({ passos, massaPorDia, passo }: { passos: Passo[]; massaPorDia?: number[]; passo: number }) {
  const atual = passos[passo]
  if (!atual) return null
  const dia = diaDoPasso(passos, passo)
  // A massa vem da gravação (massaPorDia, desde o passo 09). A cara da planta
  // (murcha, amarela, queimada) vem das leituras gravadas dos últimos 6 passos.
  // Gravação antiga, sem massa: o desenho fica sem tamanho (0 g), nada inventado.
  const recentes = passos.slice(Math.max(0, passo - 5), passo + 1).map((p) => p.leitura)
  const massa = massaPorDia ? massaNoDia(massaPorDia, dia) : 0
  const parametros = aparenciaMedia(recentes, massa)
  const { acoes } = atual

  return (
    <VStack gap={3}>
      <Text className={css.relogio} color="secondary">
        {rotuloDoPasso(passos, passo)}
      </Text>
      <AlfaceImagem
        parametros={parametros}
        rotulo={massaPorDia ? `${descreverPlanta(parametros)}, ${Math.round(massa)} g` : descreverPlanta(parametros)}
        largura={160}
      />
      <span className={css.medidores}>
        {GRUPOS_CELULAR.map((g) => (
          <Medidor key={g.id} grupo={g} passo={atual} />
        ))}
      </span>
      <VStack gap={1.5}>
        <ProgressBar label="Exaustor" value={acoes.exaustor * 100} hasValueLabel variant={tom(acoes.exaustor)} />
        <ProgressBar
          label="Nebulização"
          value={acoes.nebulizacao * 100}
          hasValueLabel
          variant={tom(acoes.nebulizacao)}
        />
        <ProgressBar
          label="Sombreamento"
          value={acoes.sombreamento * 100}
          hasValueLabel
          variant={tom(acoes.sombreamento)}
        />
        <ProgressBar label="Luz" value={acoes.luz * 100} hasValueLabel variant={tom(acoes.luz)} />
      </VStack>
      {/* doses acendem só no passo em que acontecem (um "piscar"); bomba e reposição ficam acesas enquanto ligadas */}
      <ul className={css.luzes} aria-label="Atuadores neste passo">
        <Luz nome="Nutriente" ligado={acoes.dosagemAB > 0} detalhe={`${formatarNumero(acoes.dosagemAB)} ml`} />
        <Luz nome="Ácido" ligado={acoes.dosagemAcido > 0} detalhe={`${formatarNumero(acoes.dosagemAcido)} ml`} />
        <Luz nome="Bomba" ligado={acoes.bomba} />
        <Luz nome="Reposição" ligado={acoes.reposicaoAgua} />
      </ul>
      {atual.barradas.length > 0 && (
        <Text type="supporting" color="secondary">
          Segurança barrou: {atual.barradas.map((b) => b.motivo).join('; ')}
        </Text>
      )}
    </VStack>
  )
}

// cor só quando informa: a barra ganha o tom de destaque apenas com o atuador ligado
const tom = (fracao: number) => (fracao > 0 ? 'accent' : 'neutral')

const TEXTO_ESTADO: Record<EstadoVariavel, string> = { ok: 'na faixa', atencao: 'atenção', risco: 'fora da faixa' }

/**
 * Medidor de um grupo (Ar, pH, Nutrientes, Água): o valor da variável
 * principal numa régua em que a faixa boa ocupa o meio. O estado é o pior do
 * grupo (ex.: Ar junta temperatura e VPD).
 */
function Medidor({ grupo, passo }: { grupo: Grupo; passo: Passo }) {
  const v = grupo.variaveis[0]!
  const faixa = FAIXAS[v]
  const valor = valorExibido(v, valorDe(passo.leitura, v))
  const min = valorExibido(v, faixa.min)
  const max = valorExibido(v, faixa.max)
  // a régua vai de meia faixa abaixo a meia faixa acima: dá para ver quanto saiu
  const largura = max - min
  const [inicio, fim] = [min - largura / 2, max + largura / 2]
  const pos = (x: number) => `${((Math.min(Math.max(x, inicio), fim) - inicio) / (fim - inicio)) * 100}%`
  const estado = estadoDoGrupo(passo, grupo)
  const unidade = v === 'nivel' ? '%' : faixa.unidade ? ` ${faixa.unidade}` : ''
  const texto = `${formatarNumero(valor, faixa.casas)}${unidade}`

  return (
    <span className={css.medidor}>
      <span className={css.medidorTopo}>
        {grupo.nome}
        <span className={css.medidorValor}>{texto}</span>
      </span>
      <span
        className={css.regua}
        role="meter"
        aria-label={grupo.nome}
        aria-valuemin={inicio}
        aria-valuemax={fim}
        aria-valuenow={valor}
        aria-valuetext={`${texto}, ${TEXTO_ESTADO[estado]}`}
      >
        <span className={css.faixaBoa} style={{ left: pos(min), right: `calc(100% - ${pos(max)})` }} />
        <span className={css.ponto} data-estado={estado} style={{ left: pos(valor) }} />
      </span>
    </span>
  )
}

function Luz({ nome, ligado, detalhe }: { nome: string; ligado: boolean; detalhe?: string }) {
  return (
    <li className={css.luz} data-ligado={ligado}>
      <span className={css.lampada} role="img" aria-label={ligado ? 'ligado' : 'desligado'} />
      {nome}
      {ligado && detalhe ? ` ${detalhe}` : ''}
    </li>
  )
}
