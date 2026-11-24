/**
 * Visor: a tela fixa na estufa (TV ou tablet), lida de longe, sem toque.
 * Junta estufa e alface, por isso mora em app/composicoes.
 * Sem botão, sem link, sem hover: só lê. A CascaVisor esconde o cursor.
 */
import { useEffect, useState } from 'react'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { AlfaceImagem, aparenciaMedia, descreverPlanta } from '@/modules/alface'
import {
  estadoConfirmado,
  estadoConfirmadoDoGrupo,
  FAIXAS,
  GRUPOS_CELULAR,
  massaEsperada,
  useEstufaAtual,
  useJanela,
  valorDe,
  type Estufa,
  type Grupo,
  type Passo,
  type Variavel,
} from '@/modules/estufa'
import { CascaVisor } from '@/shared/design-system/templates/CascaVisor'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { useWakeLock } from '@/shared/hooks/useWakeLock'
import { formatarHora, formatarNumero } from '@/shared/lib/formatar'
import { useAlertaEstavel } from './useAlertaEstavel'
import { ehExemplo, faixaTexto, formatarVariavel } from './variaveis'
import css from './PaginaVisor.module.css'

const MINUTO = 60_000
/** sem leitura nova por mais que isto (relógio da parede): avisa e esmaece os números */
const PARADO_MS = 2 * MINUTO
const ROTULO_ESTADO = { ok: 'na faixa', atencao: 'pede atenção', risco: 'fora da faixa' } as const

export function PaginaVisor() {
  useWakeLock()
  const estufa = useEstufaAtual()
  return <CascaVisor>{estufa ? <Visor estufa={estufa} /> : <EsbocoVisor />}</CascaVisor>
}

function Visor({ estufa }: { estufa: Estufa }) {
  const { passos, atual } = useJanela(estufa.id)
  const agora = useRelogioParede()
  const parado = useParado(atual?.leitura.instante)
  if (!atual) return <EsbocoVisor />
  const faltam = Math.max(0, Math.ceil(estufa.diasDoCiclo - estufa.diaDoCiclo))
  const parametros = aparenciaMedia(
    passos.slice(-6).map((p) => p.leitura),
    estufa.massaPorPe,
  )
  return (
    <section className={`${css.tela} surgir`} data-parado={parado} aria-label={`Visor da ${estufa.nome}`}>
      <header className={css.topo}>
        <hgroup className={css.titulo}>
          <h1 className={css.nome}>{estufa.nome}</h1>
          <p className={css.ciclo}>
            Dia {Math.floor(estufa.diaDoCiclo)} de {estufa.diasDoCiclo} ·{' '}
            {faltam === 0 ? 'colheita hoje' : `colheita em ${faltam} ${faltam === 1 ? 'dia' : 'dias'}`}
          </p>
        </hgroup>
        <p className={css.relogioBloco}>
          <time className={css.relogio} dateTime={new Date(agora).toISOString()}>
            {formatarHora(new Date(agora).toISOString())}
          </time>
          {parado && (
            <span className={css.parado} role="status">
              última leitura às {formatarHora(atual.leitura.instante)}
            </span>
          )}
        </p>
      </header>

      <figure className={css.alface}>
        <span className={css.desenho}>
          <AlfaceImagem parametros={parametros} rotulo={descreverPlanta(parametros)} />
        </span>
        <figcaption className={css.massa}>
          <span className={css.valor}>{formatarNumero(estufa.massaPorPe)}</span>
          <span className={css.unidade}>g por pé</span>
          <span className={css.meta}>meta de hoje {formatarNumero(massaEsperada(estufa.diaDoCiclo))} g</span>
        </figcaption>
      </figure>

      <section className={css.cards} aria-label="Variáveis">
        {GRUPOS_CELULAR.map((g) => (
          <CardVisor key={g.id} grupo={g} passo={atual} passos={passos} />
        ))}
      </section>

      <FaixaAlerta passos={passos} />
    </section>
  )
}

/** Um card grande: a variável principal do grupo; a secundária embaixo (o nível vira barra). */
function CardVisor({ grupo, passo, passos }: { grupo: Grupo; passo: Passo; passos: Passo[] }) {
  const [principal, secundaria] = grupo.variaveis as [Variavel, Variavel | undefined]
  const estado = estadoConfirmadoDoGrupo(passos, grupo.variaveis)
  return (
    <article className={css.card} data-estado={estado} aria-label={`${grupo.nome}, ${ROTULO_ESTADO[estado]}`}>
      <p className={css.cardTopo}>
        <span className={css.cardNome}>{grupo.nome}</span>
        {grupo.variaveis.some((v) => ehExemplo(passo, v)) && <span className={css.exemplo}>exemplo</span>}
        <span className={css.bolinha} data-estado={estado} aria-hidden />
      </p>
      <p className={css.cardValor}>
        <span className={css.valor}>{formatarVariavel(principal, valorDe(passo.leitura, principal))}</span>
        {FAIXAS[principal].unidade && <span className={css.unidade}>{FAIXAS[principal].unidade}</span>}
      </p>
      {secundaria === 'nivel' ? (
        <Reservatorio passo={passo} passos={passos} />
      ) : (
        <p className={css.detalhe}>
          {secundaria
            ? `${FAIXAS[secundaria].nome} ${formatarVariavel(secundaria, valorDe(passo.leitura, secundaria))} ${FAIXAS[secundaria].unidade}`
            : grupo.apoio}
        </p>
      )}
      <p className={css.faixa}>faixa {faixaTexto(principal)}</p>
    </article>
  )
}

function Reservatorio({ passo, passos }: { passo: Passo; passos: Passo[] }) {
  const nivel = Math.min(1, Math.max(0, valorDe(passo.leitura, 'nivel')))
  const texto = `${formatarVariavel('nivel', nivel)}%`
  return (
    <p className={css.reservatorio}>
      <span
        className={css.barra}
        role="meter"
        aria-label="Reservatório"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(nivel * 100)}
        aria-valuetext={texto}
        data-estado={estadoConfirmado(passos, 'nivel')}
      >
        <span className={css.barraCheia} style={{ inlineSize: `${nivel * 100}%` }} />
      </span>
      <span className={css.detalhe}>Reservatório {texto}</span>
    </p>
  )
}

/** O mesmo alerta do Agora; sem alerta, uma faixa calma. */
function FaixaAlerta({ passos }: { passos: Passo[] }) {
  const alerta = useAlertaEstavel(passos)
  const ativo = alerta.aberto && alerta.ultimo
  return (
    <footer className={css.alerta} data-estado={ativo ? alerta.ultimo?.estado : 'ok'} aria-live="polite">
      {ativo ? (
        <>
          <strong className={css.alertaTitulo}>{alerta.ultimo?.titulo}</strong>
          <span className={css.alertaFeito}>{alerta.ultimo?.feito}</span>
        </>
      ) : (
        <strong className={css.alertaTitulo}>Tudo na faixa</strong>
      )}
    </footer>
  )
}

/** Hora da parede, virando a cada minuto; volta da rede (evento online) também redesenha. */
function useRelogioParede(): number {
  const [agora, setAgora] = useState(Date.now)
  useEffect(() => {
    let t = 0
    const virar = () => {
      setAgora(Date.now())
      t = window.setTimeout(virar, MINUTO - (Date.now() % MINUTO))
    }
    t = window.setTimeout(virar, MINUTO - (Date.now() % MINUTO))
    const voltou = () => setAgora(Date.now())
    window.addEventListener('online', voltou)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('online', voltou)
    }
  }, [])
  return agora
}

/** `true` quando a leitura `instante` ficou mais de 2 min (de parede) sem ser substituída. */
function useParado(instante: string | undefined): boolean {
  const [paradoEm, setParadoEm] = useState<string>()
  useEffect(() => {
    if (!instante) return
    const t = window.setTimeout(() => setParadoEm(instante), PARADO_MS)
    return () => window.clearTimeout(t)
  }, [instante])
  return !!instante && paradoEm === instante
}

/** Esboço com o tamanho da tela final: nada pula quando os dados chegam. */
function EsbocoVisor() {
  const mostrar = useAtraso(true)
  if (!mostrar) return null
  return (
    <section className={css.tela} aria-busy="true" aria-label="Carregando o visor">
      <header className={css.topo}>
        <Skeleton height="var(--visor-titulo)" width="40%" radius={2} />
        <Skeleton height="var(--visor-relogio)" width="20%" radius={2} index={1} />
      </header>
      <section className={css.alface}>
        <Skeleton height="100%" radius={4} index={2} />
      </section>
      <section className={css.cards}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} radius={4} index={i + 3} />
        ))}
      </section>
      <Skeleton height="var(--visor-alerta)" radius={3} index={7} />
    </section>
  )
}
