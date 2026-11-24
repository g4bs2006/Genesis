/**
 * Gera os dados de exemplo do dashboard (modo demo e testes).
 *
 * Uso, de dashboard/:  node scripts/gerar-dados-exemplo.ts
 * (o Node 24 já roda TypeScript direto; `npx tsx scripts/gerar-dados-exemplo.ts` também serve)
 *
 * Por que um gerador e não JSON escrito à mão: são 4 estufas × 144 passos e
 * 3 ciclos × 840 passos. À mão, os números brigariam entre si (pH que cai sem
 * ninguém dosar, energia que não bate com o exaustor). Aqui uma estufa de
 * brinquedo simula a física e cada controlador decide de verdade; o que a tela
 * mostra é a consequência. O sorteio tem semente, então rodar de novo dá
 * exatamente os mesmos arquivos (o git só acusa mudança se o gerador mudar).
 *
 * Saídas:
 *   src/modules/estufa/infrastructure/dadosExemplo/estufas.json
 *   src/modules/treino/infrastructure/dadosExemplo/treino.json
 *   src/modules/treino/infrastructure/dadosExemplo/gravacao-g140.json (e g540, g812)
 *
 * shortcut: a física é de brinquedo (constantes ajustadas a olho para dar
 * curvas plausíveis), não o modelo do simulador em PyTorch; quando o treino
 * exportar dados de verdade, este script some.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { format, resolveConfig } from 'prettier'
import { massaEsperada } from '../src/modules/estufa/domain/crescimento.ts'
import { FAIXAS, estadoDe, valorDe, type Variavel } from '../src/modules/estufa/domain/faixas.ts'
import type {
  AcaoBarrada,
  Acoes,
  Controlador,
  Estufa,
  Evento,
  Leitura,
  Passo,
  ResumoCiclo,
} from '../src/modules/estufa/domain/contrato.ts'

// ---------------------------------------------------------------- sorteio

/** Sorteio com semente (mulberry32): mesma semente, mesma sequência. Math.random não deixa repetir. */
function criarSorteio(semente: number) {
  let s = semente >>> 0
  const proximo = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  // Box-Muller: transforma dois sorteios uniformes num ruído "em sino" (normal)
  const normal = () => Math.sqrt(-2 * Math.log(1 - proximo())) * Math.cos(2 * Math.PI * proximo())
  return { proximo, normal }
}
type Sorteio = ReturnType<typeof criarSorteio>

// ---------------------------------------------------------------- contas pequenas

const arred = (x: number, casas: number) => Math.round(x * 10 ** casas) / 10 ** casas
const limitar = (x: number, min = 0, max = 1) => Math.min(max, Math.max(min, x))
/** Número no jeito brasileiro: 27.1 -> "27,1" */
const br = (x: number, casas = 1) => x.toFixed(casas).replace('.', ',')

// ---------------------------------------------------------------- tempo

const MINUTO = 60_000
const PASSO_MS = 10 * MINUTO
const FUSO_MS = -3 * 60 * MINUTO // America/Sao_Paulo, sem horário de verão
const AGORA = Date.parse('2026-11-23T14:30:00-03:00')
const PASSOS_DIA = 144 // 24 h em passos de 10 min

/** ISO com o fuso de Brasília, que é o formato do contrato (Instante). */
const iso = (ms: number) => new Date(ms + FUSO_MS).toISOString().slice(0, 19) + '-03:00'
const horaDe = (ms: number) => {
  const d = new Date(ms + FUSO_MS)
  return d.getUTCHours() + d.getUTCMinutes() / 60
}
const hhmm = (ms: number) => iso(ms).slice(11, 16)
const diaDe = (ms: number) => iso(ms).slice(0, 10)

/** Tarifa branca de referência: barata de madrugada, cara das 18h às 21h. */
function tarifa(hora: number): number {
  if (hora >= 18 && hora < 21) return 1.52
  if ((hora >= 17 && hora < 18) || (hora >= 21 && hora < 22)) return 0.98
  return 0.68
}
const ehPico = (hora: number) => hora >= 18 && hora < 21

// ---------------------------------------------------------------- clima lá fora

type Dia = { media: number; amplitude: number; nuvens: number; onda: number; umidadeMedia: number }
type Fora = Leitura['fora']

/**
 * Clima de um instante: senoide com o mínimo às 3h e o máximo às 15h, sol entre
 * 5h15 e 18h45. "onda" soma calor extra de uma vez entre 15h e 15h30 (a perturbação
 * injetada: um degrau, para ver quem reage rápido).
 */
function foraEm(hora: number, dia: Dia, s: Sorteio): Fora {
  const onda = hora >= 15 && hora < 15.5 ? dia.onda : 0
  const ciclo = Math.sin((2 * Math.PI * (hora - 9)) / 24)
  const sol = hora > 5.25 && hora < 18.75 ? Math.sin((Math.PI * (hora - 5.25)) / 13.5) ** 1.2 : 0
  return {
    temperatura: dia.media + dia.amplitude * ciclo + onda + 0.15 * s.normal(),
    umidade: limitar(dia.umidadeMedia - 14 * ciclo + 4 * onda + s.normal(), 15, 100), // calor abafado: a névoa rende pouco
    radiacao: 950 * dia.nuvens * sol * (0.93 + 0.07 * s.proximo()),
  }
}

// ---------------------------------------------------------------- a estufa de brinquedo

type Estado = { t: number; ur: number; co2: number; ph: number; ec: number; tAgua: number; nivel: number; luz: number }

const EFEITO_ACIDO = 0.18 // quanto 1 ml de ácido baixa o pH do reservatório
const EFEITO_AB = 0.004 // quanto 1 ml de A+B sobe a EC
const EC_REPOSICAO = 1.0 // a água de reposição já leva um pouco de adubo
const RESERVATORIO_L = 500
const NEBULIZACAO_L_POR_H = 30
const NUTRIENTE_G_POR_ML = 0.25 // concentrado A+B a 250 g/L

/** Quanto a planta "bebe" neste passo: mais com sol, mais quando está grande. */
const absorcao = (fora: Fora, fatorPlanta: number) => (0.25 + 0.75 * Math.min(1, fora.radiacao / 900)) * fatorPlanta

/** Potência elétrica (kW). Exaustor ao cubo: meia velocidade gasta 1/8 (lei dos ventiladores). */
const potenciaKw = (a: Acoes) =>
  1.1 * a.exaustor ** 3 + 0.15 * a.nebulizacao + (a.bomba ? 0.18 : 0) + 1.5 * a.luz + (a.reposicaoAgua ? 0.4 : 0)

type Consumo = { energiaKwh: number; aguaL: number; nutrienteG: number; acidoMl: number }

/** Avança a estufa 10 minutos com as ações já filtradas pela segurança. */
function avancar(e: Estado, a: Acoes, fora: Fora, fatorPlanta: number, derivaPh: number, consumo: Consumo) {
  const fracSol = Math.min(1, fora.radiacao / 900)
  // Ar: tende ao "alvo" (fora + sol que entra - frio da nebulização) aos poucos
  const ganhoSol = 0.0095 * fora.radiacao * (1 - 0.65 * a.sombreamento) * (1 - 0.55 * a.exaustor)
  const frioNevoa = 16 * a.nebulizacao * (1 - e.ur / 100) // evaporar água esfria mais com ar seco
  const alvoT = fora.temperatura + (fora.radiacao > 0 ? ganhoSol : 1.8 * (1 - 0.5 * a.exaustor)) - frioNevoa
  e.t += 0.45 * (alvoT - e.t)
  const alvoUr = fora.umidade + 7 + 5 * fracSol + 25 * a.nebulizacao - 6 * a.exaustor - 0.5 * (e.t - fora.temperatura)
  e.ur += 0.25 * (limitar(alvoUr, 25, 98) - e.ur)
  // CO₂: à noite a planta respira (sobe); de dia consome (cai) se ninguém ventila
  const alvoCo2 = 430 + (fracSol === 0 ? 200 * (1 - 0.7 * a.exaustor) : 0) - 90 * fracSol * (1 - a.exaustor)
  e.co2 += 0.3 * (alvoCo2 - e.co2)
  e.luz = fora.radiacao * 0.95 * (1 - 0.6 * a.sombreamento) + 150 * a.luz
  e.tAgua += 0.04 * (0.5 * e.t + 0.5 * 21 - e.tAgua) // reservatório enterrado: muda devagar

  // Solução: a planta tira água e nutriente; ao absorver nitrato, o pH sobe
  const bebe = absorcao(fora, fatorPlanta)
  e.nivel -= 0.0032 * bebe
  e.ec -= 0.0028 * bebe
  e.ph += derivaPh * bebe - EFEITO_ACIDO * a.dosagemAcido
  if (a.reposicaoAgua) {
    const antes = e.nivel
    e.nivel = Math.min(0.95, e.nivel + 0.15)
    e.ec = (e.ec * antes + EC_REPOSICAO * (e.nivel - antes)) / e.nivel // mistura: dilui
    consumo.aguaL += (e.nivel - antes) * RESERVATORIO_L
  }
  e.ec += EFEITO_AB * a.dosagemAB
  e.ph = limitar(e.ph, 3.5, 8.5)
  e.ec = Math.max(0.2, e.ec)

  consumo.energiaKwh += potenciaKw(a) / 6
  consumo.aguaL += (NEBULIZACAO_L_POR_H * a.nebulizacao) / 6
  consumo.nutrienteG += a.dosagemAB * NUTRIENTE_G_POR_ML
  consumo.acidoMl += a.dosagemAcido
}

/** Os sensores: o estado verdadeiro mais um ruído pequeno (fase 4 do currículo). */
function ler(estufaId: string, ms: number, e: Estado, fora: Fora, s: Sorteio, ruidoPh = 0.01): Leitura {
  const temperatura = arred(e.t + 0.08 * s.normal(), 1)
  const umidade = Math.round(limitar(e.ur + 0.6 * s.normal(), 0, 100))
  const saturacao = 0.6108 * Math.exp((17.27 * temperatura) / (temperatura + 237.3)) // kPa
  return {
    estufaId,
    instante: iso(ms),
    ar: {
      temperatura,
      umidade,
      vpd: arred(saturacao * (1 - umidade / 100), 2),
      co2: Math.round(e.co2 + 6 * s.normal()),
      luz: Math.round(e.luz),
    },
    solucao: {
      ph: arred(e.ph + ruidoPh * s.normal(), 2),
      ec: arred(e.ec + 0.01 * s.normal(), 2),
      temperaturaAgua: arred(e.tAgua + 0.05 * s.normal(), 1),
      nivel: arred(limitar(e.nivel), 2),
    },
    fora: {
      temperatura: arred(fora.temperatura, 1),
      umidade: Math.round(fora.umidade),
      radiacao: Math.round(fora.radiacao),
    },
    tarifaKwh: tarifa(horaDe(ms)),
  }
}

// ---------------------------------------------------------------- controladores

/** Decide as ações a partir da leitura, das leituras anteriores e das ações do passo anterior. */
type Politica = (l: Leitura, historico: Leitura[], anterior: Acoes) => Acoes

const PARADO: Acoes = {
  exaustor: 0,
  nebulizacao: 0,
  sombreamento: 0,
  luz: 0,
  dosagemAB: 0,
  dosagemAcido: 0,
  reposicaoAgua: false,
  bomba: true,
}

/** Arredonda as ações para o JSON não carregar 15 casas decimais. */
const acoes = (a: Acoes): Acoes => ({
  ...a,
  exaustor: arred(limitar(a.exaustor), 2),
  nebulizacao: arred(limitar(a.nebulizacao), 2),
  sombreamento: arred(limitar(a.sombreamento), 2),
  luz: arred(limitar(a.luz), 2),
  dosagemAB: arred(a.dosagemAB, 1),
  dosagemAcido: arred(a.dosagemAcido, 1),
})

/** Repor água: começa abaixo do gatilho e continua até 90%. */
const querRepor = (l: Leitura, anterior: Acoes, gatilho: number) =>
  l.solucao.nivel < gatilho || (anterior.reposicaoAgua && l.solucao.nivel < 0.9)

/**
 * Agente campeão da fase 4 (g812): proporcional e antecipado. Fecha a tela pela
 * radiação lá fora (antes de a luz de dentro passar do ponto), ventila de leve o
 * dia todo (repõe CO₂ quase de graça, por causa da lei do cubo), só doseia ácido
 * depois de 3 leituras seguidas altas (aprendeu a não reagir a ruído) e adia a
 * reposição de água para fora do horário caro quando há folga.
 * O preço de desconfiar do sensor: reage à média das 3 últimas temperaturas,
 * então um calor que chega de uma vez (a onda de calor) o pega 20 min atrasado.
 */
const agenteFase4: Politica = (l, historico, anterior) => {
  const ultimas = [...historico.slice(-2), l]
  const T = ultimas.reduce((soma, x) => soma + x.ar.temperatura, 0) / ultimas.length
  const dia = l.fora.radiacao > 0
  const phAlto = ultimas.length === 3 && ultimas.every((x) => x.solucao.ph > 6.55)
  const repor = querRepor(l, anterior, 0.45)
  return acoes({
    exaustor: dia
      ? limitar(Math.max(0.3 + (T - 22.5) / 3.5, l.ar.co2 < 415 ? 0.6 : 0), 0.3, 1)
      : l.ar.umidade > 72
        ? 0.3
        : 0.1,
    // névoa esfria de dia e, no começo da noite seca, segura a umidade acima de 60%;
    // a névoa diminui conforme o ar enche de umidade (perto de 85% ela só molharia a folha)
    nebulizacao: Math.max(
      dia ? ((T - 23.5) / 1.5) * limitar((86 - l.ar.umidade) / 10) : 0,
      l.ar.umidade < 62 ? 0.3 : 0,
    ),
    // tela pela radiação lá fora (antecipa) e, se o ar já esquentou, fecha mais
    sombreamento: Math.min(0.8, Math.max(0, (l.fora.radiacao - 450) / 400) + (dia ? Math.max(0, (T - 24.5) / 2) : 0)),
    luz: 0,
    dosagemAB: l.solucao.ec < 1.35 ? 8 : 0,
    dosagemAcido: phAlto ? Math.min(6, (l.solucao.ph - 5.6) / EFEITO_ACIDO) : 0,
    reposicaoAgua: repor && !(ehPico(horaDe(Date.parse(l.instante))) && l.solucao.nivel > 0.35),
    bomba: true,
  })
}

/** Campeão da fase 3 (g540): bom no clima e na tarifa, mas ainda reage a uma leitura de pH sozinha. */
const agenteFase3: Politica = (l, _historico, anterior) => {
  const T = l.ar.temperatura
  const dia = l.fora.radiacao > 0
  const repor = querRepor(l, anterior, 0.45)
  return acoes({
    exaustor: dia ? limitar(0.3 + (T - 21) / 3) : l.ar.umidade > 72 ? 0.35 : 0.15,
    nebulizacao: dia && l.ar.umidade < 75 ? (T - 24) / 2 : 0,
    sombreamento: Math.min(0.8, (l.fora.radiacao - 500) / 380),
    luz: 0,
    dosagemAB: l.solucao.ec < 1.32 ? 10 : 0,
    // mira 5,5, colado no limite: com o ruído do sensor, às vezes passa do ponto
    dosagemAcido: l.solucao.ph > 6.45 ? Math.min(6, (l.solucao.ph - 5.5) / EFEITO_ACIDO) : 0,
    reposicaoAgua: repor && !(ehPico(horaDe(Date.parse(l.instante))) && l.solucao.nivel > 0.35),
    bomba: true,
  })
}

/** Campeão da fase 1 (g140): só aprendeu o clima do ar; na solução, doseia por relógio, às cegas. */
const agenteFase1: Politica = (l, historico, anterior) => {
  const T = l.ar.temperatura
  const dia = l.fora.radiacao > 0
  const aCada6h = historico.length % 36 === 0
  return acoes({
    exaustor: dia ? limitar((T - 22) / 3) : 0.1,
    nebulizacao: dia && T > 25 ? 0.6 : 0,
    sombreamento: l.fora.radiacao > 550 ? 0.7 : 0,
    luz: 0,
    dosagemAB: aCada6h ? 12 : 0,
    dosagemAcido: aCada6h ? 2 : 0,
    reposicaoAgua: querRepor(l, anterior, 0.4),
    bomba: true,
  })
}

/** PID: corrige pelo erro de agora, pelo acumulado e pela velocidade. Suave, mas só reage. */
function criarPid(): Politica {
  let acumulado = 0
  let erroAnterior = 0
  return (l, _historico, anterior) => {
    const erro = l.ar.temperatura - 23.5
    acumulado = limitar(acumulado + erro / 6, -4, 8) // limite: o acumulado não "dispara" (anti-windup)
    const derivada = erro - erroAnterior
    erroAnterior = erro
    const dia = l.fora.radiacao > 0
    return acoes({
      exaustor: dia ? 0.35 + 0.35 * erro + 0.06 * acumulado + 0.2 * derivada : 0.2,
      nebulizacao: dia ? 0.4 * (l.ar.temperatura - 24.5) * limitar((84 - l.ar.umidade) / 10) : 0,
      sombreamento: (l.ar.luz - 380) / 300 + anterior.sombreamento * 0.6,
      luz: 0,
      dosagemAB: Math.max(0, 25 * (1.5 - l.solucao.ec)),
      dosagemAcido: Math.max(0, 6 * (l.solucao.ph - 6.25)),
      reposicaoAgua: querRepor(l, anterior, 0.45),
      bomba: true,
    })
  }
}

/** Regras fixas (liga/desliga com folga): o jeito de muita estufa hoje. */
const regrasFixas: Politica = (l, _historico, anterior) => {
  const T = l.ar.temperatura
  const ligaExaustor = T > 25 ? 1 : T < 23 ? 0 : anterior.exaustor
  const ligaNevoa = T > 27 ? 1 : T < 25.5 ? 0 : anterior.nebulizacao
  const fecha = l.ar.luz > 550 ? 0.8 : l.fora.radiacao < 450 ? 0 : anterior.sombreamento
  return acoes({
    exaustor: l.fora.radiacao > 0 ? ligaExaustor : 0,
    nebulizacao: l.fora.radiacao > 0 ? ligaNevoa : 0,
    sombreamento: fecha,
    luz: 0,
    dosagemAB: l.solucao.ec < 1.25 ? 30 : 0,
    dosagemAcido: l.solucao.ph > 6.5 && anterior.dosagemAcido === 0 ? 5 : 0,
    reposicaoAgua: querRepor(l, anterior, 0.5),
    bomba: true,
  })
}

/** Camada de segurança: barra o que pode estragar a planta, seja quem for que pediu. */
function seguranca(l: Leitura, pedido: Acoes): { acoes: Acoes; barradas: AcaoBarrada[] } {
  const barradas: AcaoBarrada[] = []
  const final = { ...pedido }
  if (pedido.dosagemAcido > 0 && l.solucao.ph < 5.8) {
    barradas.push({
      atuador: 'dosagemAcido',
      pedido: pedido.dosagemAcido,
      motivo: `pH ${br(l.solucao.ph)} já está perto do mínimo (5,5): mais ácido machucaria a raiz`,
    })
    final.dosagemAcido = 0
  }
  if (pedido.dosagemAB > 0 && l.solucao.ec > 1.9) {
    barradas.push({
      atuador: 'dosagemAB',
      pedido: pedido.dosagemAB,
      motivo: `EC ${br(l.solucao.ec, 2)} já está alta: mais adubo salinizaria a água`,
    })
    final.dosagemAB = 0
  }
  return { acoes: final, barradas }
}

// ---------------------------------------------------------------- simulação

type Ajustes = {
  /** Pedido extra do controlador (o "roteiro"); passa pela segurança como qualquer outro. */
  pedidoExtra?: (anterior: Acoes) => Partial<Acoes> | undefined
  ruidoPh?: (i: number) => number
}

function simular(
  estufaId: string,
  politica: Politica,
  estado: Estado,
  instantes: number[],
  foras: Fora[],
  fatorPlanta: (i: number) => number,
  derivaPh: number,
  s: Sorteio,
  ajustes: Ajustes = {},
): { passos: Passo[]; consumo: Consumo } {
  const passos: Passo[] = []
  const historico: Leitura[] = []
  const consumo: Consumo = { energiaKwh: 0, aguaL: 0, nutrienteG: 0, acidoMl: 0 }
  let anterior = PARADO
  instantes.forEach((ms, i) => {
    const fora = foras[i]!
    const leitura = ler(estufaId, ms, estado, fora, s, ajustes.ruidoPh?.(i))
    const pedido = { ...politica(leitura, historico, anterior), ...ajustes.pedidoExtra?.(anterior) }
    const { acoes: final, barradas } = seguranca(leitura, pedido)
    passos.push({ leitura, acoes: final, barradas })
    historico.push(leitura)
    anterior = final
    avancar(estado, final, fora, fatorPlanta(i), derivaPh, consumo)
  })
  return { passos, consumo }
}

// ---------------------------------------------------------------- o dia de hoje nas 4 estufas

const climaSorteio = criarSorteio(2311)
const ONTEM: Dia = { media: 21.5, amplitude: 5.25, nuvens: 1, onda: 2.5, umidadeMedia: 60 }
const HOJE: Dia = { ...ONTEM, media: 22, amplitude: 5, onda: 0, nuvens: 0.97 }
const INICIO_ONDA = Date.parse('2026-11-22T15:00:00-03:00')

const instantesDia = Array.from({ length: PASSOS_DIA }, (_, i) => AGORA - (PASSOS_DIA - 1 - i) * PASSO_MS)
const instantesAquecimento = instantesDia.map((ms) => ms - PASSOS_DIA * PASSO_MS)
const foraDe = (ms: number) => foraEm(horaDe(ms), diaDe(ms) === '2026-11-22' ? ONTEM : HOJE, climaSorteio)
const forasAquecimento = instantesAquecimento.map((ms) => foraEm(horaDe(ms), HOJE, climaSorteio))
const forasDia = instantesDia.map(foraDe)

/*
 * Roteiro da estufa 1 (o rascunho aprovado):
 *  - 15h de ontem: o pH está acima de 6,55 há três leituras e o agente doseia ácido até ~5,6;
 *  - 15h10: ainda olhando as leituras velhas, pede mais ácido com o pH real em 5,6; a segurança barra;
 *  - daí até agora o pH sobe devagar, sem dose, até 6,6 (o "1 ponto pede atenção").
 * A deriva do pH é calibrada para fechar essa conta com a absorção do dia.
 */
const PASSO_BARRADO = instantesDia.findIndex((ms) => hhmm(ms) === '15:10')
const somaAbsorcao = (de: number, ate: number) =>
  forasDia.slice(de, ate).reduce((soma, fora) => soma + absorcao(fora, 1), 0)
const DERIVA_PH = (6.58 - 5.6) / somaAbsorcao(PASSO_BARRADO, PASSOS_DIA - 1)

type Configuracao = {
  estufa: Omit<Estufa, 'origem' | 'plantas' | 'diaDoCiclo' | 'diasDoCiclo'>
  politica: () => Politica
  ph: number
  nivel: number
  ec: number
  ajustes?: Ajustes
}

const CONFIGURACOES: Configuracao[] = [
  {
    estufa: { id: 'estufa-1', nome: 'Estufa 1', controlador: { tipo: 'agente', modeloId: 'g812' }, massaPorPe: 182 },
    politica: () => agenteFase4,
    ph: 6.57, // acima de 6,55: o agente doseia na terceira leitura, às 15h
    nivel: 0.45 + 0.0032 * forasDia.slice(0, 22).reduce((soma, fora) => soma + absorcao(fora, 1), 0),
    ec: 1.52,
    ajustes: {
      pedidoExtra: (anterior) => (anterior.dosagemAcido > 0 ? { dosagemAcido: 2 } : undefined),
      // sem ruído no pH no fim: o rascunho pede 6,6 cravado agora
      ruidoPh: (i) => (i >= PASSOS_DIA - 6 ? 0 : 0.01),
    },
  },
  {
    estufa: {
      id: 'campeao-f3',
      nome: 'Campeão fase 3',
      controlador: { tipo: 'agente', modeloId: 'g540' },
      massaPorPe: 178,
    },
    politica: () => agenteFase3,
    ph: 6.1,
    nivel: 0.7,
    ec: 1.48,
  },
  {
    estufa: { id: 'pid', nome: 'PID', controlador: { tipo: 'pid' }, massaPorPe: 173 },
    politica: criarPid,
    ph: 6.2,
    nivel: 0.8,
    ec: 1.5,
  },
  {
    estufa: { id: 'regras', nome: 'Regras fixas', controlador: { tipo: 'regras' }, massaPorPe: 165 },
    politica: () => regrasFixas,
    ph: 6.3,
    nivel: 0.62,
    ec: 1.45,
  },
]

const DIA_DO_CICLO = 23
const DIAS_DO_CICLO = 35
const VARIAVEIS_RESUMO = ['temperatura', 'umidade', 'co2', 'ph', 'ec', 'temperaturaAgua', 'nivel'] as const

const fora = (l: Leitura, v: Variavel) => estadoDe(valorDe(l, v), FAIXAS[v]) !== 'ok'

/** Sequências seguidas de passos que cumprem a condição: [início, fim] (fim incluso). */
function trechos(passos: Passo[], condicao: (p: Passo) => boolean): [number, number][] {
  const lista: [number, number][] = []
  passos.forEach((p, i) => {
    if (!condicao(p)) return
    const ultimo = lista[lista.length - 1]
    if (ultimo && ultimo[1] === i - 1) ultimo[1] = i
    else lista.push([i, i])
  })
  return lista
}

function eventosDe(estufa: Estufa, passos: Passo[], passosRegras: Passo[]): Evento[] {
  const eventos: Evento[] = []
  const quando = (i: number) => passos[i]!.leitura.instante
  const ms = (i: number) => Date.parse(quando(i))
  const novo = (i: number, e: Omit<Evento, 'estufaId' | 'instante' | 'passo'>) =>
    eventos.push({ estufaId: estufa.id, instante: quando(i), passo: i, ...e })

  eventos.push({
    estufaId: estufa.id,
    instante: iso(INICIO_ONDA),
    tipo: 'perturbacao',
    titulo: 'Onda de calor',
    detalhe: `Injetada nas quatro estufas ao mesmo tempo: +${br(ONTEM.onda)} °C lá fora de uma vez, das 15h às 15h30 de ontem.`,
    variavel: 'temperatura',
  })

  // Sombreamento de manhã: quem fechou a tela primeiro?
  const manha = (p: Passo) => horaDe(Date.parse(p.leitura.instante)) > 5 && horaDe(Date.parse(p.leitura.instante)) < 12
  const fechou = passos.findIndex((p) => manha(p) && p.acoes.sombreamento > 0)
  const fechouRegras = passosRegras.findIndex((p) => manha(p) && p.acoes.sombreamento > 0)
  const antecedencia = ((fechouRegras - fechou) * PASSO_MS) / MINUTO
  if (estufa.controlador.tipo !== 'regras' && fechou >= 0 && antecedencia >= 20) {
    novo(fechou, {
      tipo: 'acerto',
      titulo: `Abriu o sombreamento ${antecedencia} min antes das regras`,
      detalhe: `Às ${hhmm(ms(fechou))} o sol lá fora já passava de ${passos[fechou]!.leitura.fora.radiacao} W/m² e subindo; fechou a tela aos poucos antes de a luz de dentro passar do ponto. As regras só reagiram às ${hhmm(ms(fechouRegras))}.`,
      variavel: 'luz',
    })
  }

  // Ar quente: o trecho mais longo acima da faixa
  const quentes = trechos(passos, (p) => p.leitura.ar.temperatura > FAIXAS.temperatura.max)
  const maisLongo = quentes.sort((a, b) => b[1] - b[0] - (a[1] - a[0]))[0]
  if (maisLongo) {
    const [ini, fim] = maisLongo
    const pico = Math.max(...passos.slice(ini, fim + 1).map((p) => p.leitura.ar.temperatura))
    const a = passos[ini]!.acoes
    novo(ini, {
      tipo: 'erro',
      titulo: `Ar a ${br(pico)} °C por ${(fim - ini + 1) * 10} min`,
      detalhe: `Passou de ${FAIXAS.temperatura.max} °C às ${hhmm(ms(ini))} com exaustor a ${Math.round(a.exaustor * 100)}% e nebulização a ${Math.round(a.nebulizacao * 100)}%.`,
      variavel: 'temperatura',
    })
  }

  // O que a segurança barrou
  passos.forEach((p, i) =>
    p.barradas.forEach((b) =>
      novo(i, {
        tipo: 'barrado',
        titulo:
          b.atuador === 'dosagemAcido'
            ? `Tentou dosar ácido com pH real ${br(p.leitura.solucao.ph)}: a segurança barrou`
            : `Tentou dosar adubo com EC ${br(p.leitura.solucao.ec, 2)}: a segurança barrou`,
        detalhe: `Pediu ${br(b.pedido)} ml. ${b.motivo}.`,
        variavel: b.atuador === 'dosagemAcido' ? 'ph' : 'ec',
      }),
    ),
  )

  // Reposição de água × horário de pico
  const hora = (i: number) => horaDe(ms(i))
  const adiou = passos.findIndex((p, i) => p.leitura.solucao.nivel < 0.45 && ehPico(hora(i)) && !p.acoes.reposicaoAgua)
  const repos = passos.findIndex((p, i) => i > adiou && p.acoes.reposicaoAgua)
  if (estufa.controlador.tipo === 'agente' && adiou >= 0 && repos > adiou) {
    novo(repos, {
      tipo: 'acerto',
      titulo: 'Adiou a reposição de água para depois do horário de pico',
      detalhe: `O reservatório chegou a ${Math.round(passos[adiou]!.leitura.solucao.nivel * 100)}% às ${hhmm(ms(adiou))}, com a energia a R$ ${br(passos[adiou]!.leitura.tarifaKwh, 2)}/kWh. Esperou até ${hhmm(ms(repos))} (R$ ${br(passos[repos]!.leitura.tarifaKwh, 2)}/kWh), ainda acima do mínimo de 30%.`,
      variavel: 'nivel',
    })
  }
  const repoNoPico = passos.findIndex((p, i) => p.acoes.reposicaoAgua && ehPico(hora(i)))
  if (estufa.controlador.tipo !== 'agente' && repoNoPico >= 0) {
    novo(repoNoPico, {
      tipo: 'erro',
      titulo: 'Repôs água no horário de pico',
      detalhe: `O reservatório baixou de ${estufa.controlador.tipo === 'regras' ? '50' : '45'}% às ${hhmm(ms(repoNoPico))} e a bomba de reposição ligou com a energia a R$ ${br(passos[repoNoPico]!.leitura.tarifaKwh, 2)}/kWh.`,
      variavel: 'nivel',
    })
  }

  // pH fora da faixa (só trechos que já terminaram; o de agora a tela mostra no card)
  trechos(passos, (p) => fora(p.leitura, 'ph'))
    .filter(([, fim]) => fim < passos.length - 1)
    .forEach(([ini, fim]) => {
      const valores = passos.slice(ini, fim + 1).map((p) => p.leitura.solucao.ph)
      const pior = valores[0]! < FAIXAS.ph.min ? Math.min(...valores) : Math.max(...valores)
      novo(ini, {
        tipo: 'erro',
        titulo: `pH a ${br(pior, 2)} por ${(fim - ini + 1) * 10} min`, // 2 casas: "6,5" pareceria dentro da faixa
        detalhe:
          pior < FAIXAS.ph.min
            ? 'Ácido demais de uma vez: o pH passou do ponto para baixo.'
            : 'O pH subiu além de 6,5 antes da correção.',
        variavel: 'ph',
      })
    })

  // Doses de ácido do agente da fase 4: o "esperou confirmar" é o que ele aprendeu de novo
  if (estufa.controlador.tipo === 'agente' && estufa.controlador.modeloId === 'g812') {
    passos.forEach((p, i) => {
      if (p.acoes.dosagemAcido > 0)
        novo(i, {
          tipo: 'acerto',
          titulo: `Dosou ${br(p.acoes.dosagemAcido)} ml de ácido com pH ${br(p.leitura.solucao.ph)}`,
          detalhe: 'Esperou três leituras seguidas acima de 6,55 para não reagir a ruído do sensor.',
          variavel: 'ph',
        })
    })
  }

  return eventos.sort((a, b) => Date.parse(a.instante) - Date.parse(b.instante))
}

const estufas: Estufa[] = []
const passosPorEstufa: Record<string, Passo[]> = {}
const consumos: Record<string, Consumo> = {}

CONFIGURACOES.forEach((c, n) => {
  const s = criarSorteio(100 + n)
  const politica = c.politica()
  // Aquece um dia antes, para a estufa não começar num estado inventado
  const estado: Estado = { t: 20, ur: 70, co2: 450, ph: 6, ec: 1.5, tAgua: 20, nivel: 0.8, luz: 0 }
  simular(c.estufa.id, politica, estado, instantesAquecimento, forasAquecimento, () => 1, 0, s)
  Object.assign(estado, { ph: c.ph, nivel: c.nivel, ec: c.ec })
  const { passos, consumo } = simular(
    c.estufa.id,
    politica,
    estado,
    instantesDia,
    forasDia,
    () => 1,
    DERIVA_PH,
    s,
    c.ajustes,
  )
  estufas.push({ ...c.estufa, origem: 'simulada', plantas: 1000, diaDoCiclo: DIA_DO_CICLO, diasDoCiclo: DIAS_DO_CICLO })
  passosPorEstufa[c.estufa.id] = passos
  consumos[c.estufa.id] = consumo
})

const passosRegras = passosPorEstufa['regras']!
const eventos = estufas.flatMap((e) => eventosDe(e, passosPorEstufa[e.id]!, passosRegras))

/**
 * Resumo do ciclo: consumo e tempo fora da faixa do último dia, projetados para
 * os 35 dias; massa na colheita pela curva de crescimento na mesma proporção
 * da massa de hoje. shortcut: um dia não é o ciclo; quando o simulador
 * guardar o ciclo inteiro, o resumo vem somado de verdade.
 */
const resumos: ResumoCiclo[] = estufas.map((e) => {
  const passos = passosPorEstufa[e.id]!
  const c = consumos[e.id]!
  const fracao = (cond: (l: Leitura) => boolean) =>
    arred(passos.filter((p) => cond(p.leitura)).length / passos.length, 3)
  return {
    estufaId: e.id,
    massaPorPe: Math.round((massaEsperada(DIAS_DO_CICLO) * e.massaPorPe) / massaEsperada(DIA_DO_CICLO)),
    energiaKwh: Math.round(c.energiaKwh * DIAS_DO_CICLO),
    aguaL: Math.round(c.aguaL * DIAS_DO_CICLO),
    nutrienteG: Math.round(c.nutrienteG * DIAS_DO_CICLO),
    acidoMl: Math.round(c.acidoMl * DIAS_DO_CICLO),
    foraDaFaixa: fracao((l) => VARIAVEIS_RESUMO.some((v) => fora(l, v))),
    foraPorVariavel: Object.fromEntries(VARIAVEIS_RESUMO.map((v) => [v, fracao((l) => fora(l, v))])),
    barradas: passos.reduce((soma, p) => soma + p.barradas.length, 0) * DIAS_DO_CICLO,
  }
})

// ---------------------------------------------------------------- treino

const treinoSorteio = criarSorteio(812)
const INICIO_FASE: Record<1 | 2 | 3 | 4, number> = { 1: 1, 2: 141, 3: 361, 4: 541 }
const ULTIMA_GERACAO = 812
const faseDa = (n: number): 1 | 2 | 3 | 4 => (n >= 541 ? 4 : n >= 361 ? 3 : n >= 141 ? 2 : 1)
/** Curva de cada fase: a nota começa baixa (obstáculo novo) e sobe cada vez mais devagar. */
const CURVA: Record<1 | 2 | 3 | 4, { base: number; ganho: number; regras: number; duracao: number }> = {
  1: { base: -120, ganho: 255, regras: 86, duracao: 140 },
  2: { base: 42, ganho: 96, regras: 71, duracao: 220 },
  3: { base: 28, ganho: 104, regras: 57, duracao: 180 },
  4: { base: 66, ganho: 58, regras: 47, duracao: 380 }, // ainda não acabou: a curva segue subindo
}
const geracoes = Array.from({ length: ULTIMA_GERACAO }, (_, k) => {
  const numero = k + 1
  const fase = faseDa(numero)
  const c = CURVA[fase]
  const p = (numero - INICIO_FASE[fase]) / c.duracao
  const melhor = c.base + c.ganho * (1 - Math.exp(-3.5 * p)) + 4 * treinoSorteio.normal()
  return {
    numero,
    fase,
    melhor: arred(melhor, 1),
    mediana: arred(melhor - 45 - 55 * (1 - Math.min(1, p)) + 6 * treinoSorteio.normal(), 1),
    regras: arred(c.regras + 2 * treinoSorteio.normal(), 1),
    segundos: arred(limitar(1.55 + 0.35 * (fase - 1) + 0.12 * treinoSorteio.normal(), 1.5, 3), 2),
  }
})

// relógio do treino: de trás para frente a partir de agora
const terminouEm = new Map<number, number>()
let relogio = AGORA
for (let k = geracoes.length - 1; k >= 0; k--) {
  terminouEm.set(geracoes[k]!.numero, relogio)
  relogio -= geracoes[k]!.segundos * 1000
}
const iniciadoEm = Math.round(relogio / 1000) * 1000

const ARQUITETURA = [20, 32, 32, 8]
/** Pesos de uma MLP: cada camada tem entrada×saída pesos mais um viés por saída. */
const totalPesos = (arq: number[]) => arq.slice(1).reduce((soma, saida, i) => soma + arq[i]! * saida + saida, 0)

const modelos = (
  [
    [140, 1, { 1: 0.95 }],
    [360, 2, { 1: 0.93, 2: 0.94 }],
    [540, 3, { 1: 0.94, 2: 0.92, 3: 0.93 }],
    // esqueceu um pouco da fase 2 (pH e EC) ao aprender a ignorar ruído: alerta de < 90%
    [812, 4, { 1: 0.95, 2: 0.86, 3: 0.92, 4: 0.88 }],
  ] as const
).map(([geracao, fase, prova]) => {
  const s = criarSorteio(geracao)
  return {
    id: `g${geracao}`,
    geracao,
    fase,
    arquitetura: ARQUITETURA,
    pesos: Array.from({ length: totalPesos(ARQUITETURA) }, () => arred(0.5 * s.normal(), 3)),
    provaPorFase: Object.fromEntries(Object.entries(prova)),
  }
})

const estadoTreino = {
  rodando: true,
  onde: 'PC do Gabriel · RX 7600',
  faseAtual: 4,
  geracaoAtual: ULTIMA_GERACAO,
  iniciadoEm: iso(iniciadoEm),
  criterioPassagem: '< 5% fora da faixa e nota > regras',
  inicioPorFase: Object.fromEntries(Object.entries(INICIO_FASE)),
}

const configuracao = {
  populacao: 1024,
  elite: 0.05,
  torneio: 4,
  mutacao: 0.05,
  misturaFases: 0.3,
  arquitetura: ARQUITETURA,
  passoMinutos: 10,
}

// ---------------------------------------------------------------- gravações: um ciclo acelerado

/**
 * Os três campeões no MESMO clima (mesma semente): é a "justiça na nota" do
 * plano, senão um teria sorte com o tempo e o outro não. Simula de 10 em 10 min
 * e guarda um passo por hora (35 × 24 = 840) para o arquivo não pesar.
 */
const SEMENTE_GRAVACAO = 4242
const INICIO_CICLO = Date.parse('2026-10-31T00:00:00-03:00')
const climaCiclo = criarSorteio(SEMENTE_GRAVACAO)
const diasCiclo: Dia[] = Array.from({ length: DIAS_DO_CICLO }, () => ({
  media: 20.5 + 3.5 * climaCiclo.proximo(),
  amplitude: 4 + 2 * climaCiclo.proximo(),
  nuvens: 0.45 + 0.55 * climaCiclo.proximo(),
  onda: climaCiclo.proximo() < 0.15 ? 1 + 2 * climaCiclo.proximo() : 0,
  umidadeMedia: 55 + 12 * climaCiclo.proximo(),
}))
const instantesCiclo = Array.from({ length: DIAS_DO_CICLO * PASSOS_DIA }, (_, i) => INICIO_CICLO + i * PASSO_MS)
const forasCiclo = instantesCiclo.map((ms, i) => foraEm(horaDe(ms), diasCiclo[Math.floor(i / PASSOS_DIA)]!, climaCiclo))
const fatorCiclo = (i: number) => 0.2 + (0.8 * massaEsperada(i / PASSOS_DIA)) / massaEsperada(DIAS_DO_CICLO)

const gravacoes = (
  [
    ['g140', agenteFase1, 'Geração 140 · campeão da fase 1'],
    ['g540', agenteFase3, 'Geração 540 · campeão da fase 3'],
    ['g812', agenteFase4, 'Geração 812 · campeão atual (fase 4)'],
  ] as const
).map(([modeloId, politica, titulo]) => {
  const id = `gravacao-${modeloId}`
  const estado: Estado = { t: 20, ur: 70, co2: 450, ph: 6, ec: 1.5, tAgua: 20, nivel: 0.9, luz: 0 }
  const { passos } = simular(id, politica, estado, instantesCiclo, forasCiclo, fatorCiclo, 0.006, criarSorteio(7))
  const porHora = passos.filter((_, i) => i % 6 === 0)
  const geracao = Number(modeloId.slice(1))
  return {
    gravacao: { id, semente: SEMENTE_GRAVACAO, modeloId, passos: porHora },
    resumo: {
      id,
      semente: SEMENTE_GRAVACAO,
      modeloId,
      titulo,
      criadaEm: iso(Math.round(terminouEm.get(geracao)! / 1000) * 1000),
      passos: porHora.length,
    },
  }
})

// ---------------------------------------------------------------- conferência antes de gravar

function conferir(condicao: boolean, mensagem: string): asserts condicao {
  if (!condicao) throw new Error(`Dados de exemplo incoerentes: ${mensagem}`)
}
const VARIAVEIS = Object.keys(FAIXAS) as Variavel[]
const ultimaE1 = passosPorEstufa['estufa-1']!.at(-1)!.leitura
const estadosE1 = VARIAVEIS.map((v) => [v, estadoDe(valorDe(ultimaE1, v), FAIXAS[v])] as const)
conferir(
  estadosE1.filter(([, e]) => e === 'atencao').length === 1 && estadosE1.every(([, e]) => e !== 'risco'),
  `estufa-1 agora deveria ter 1 ponto de atenção: ${JSON.stringify(estadosE1)}`,
)
conferir(ultimaE1.instante === '2026-11-23T14:30:00-03:00', 'último passo fora de hora')
const titulosE1 = eventos.filter((e) => e.estufaId === 'estufa-1').map((e) => e.titulo)
for (const comeco of ['Abriu o sombreamento', 'Ar a ', 'Tentou dosar ácido', 'Adiou a reposição', 'Onda de calor'])
  conferir(
    titulosE1.some((t) => t.startsWith(comeco)),
    `falta o evento "${comeco}…" na estufa-1: ${titulosE1.join(' | ')}`,
  )
// do melhor para o pior, como no rascunho: agente g812, campeão da fase 3, PID, regras
resumos.slice(1).forEach((pior, i) => {
  const melhor = resumos[i]!
  conferir(
    melhor.foraDaFaixa < pior.foraDaFaixa && melhor.massaPorPe > pior.massaPorPe,
    `${melhor.estufaId} deveria ganhar de ${pior.estufaId}`,
  )
})
conferir(
  resumos.every((r) => r === resumos[0] || resumos[0]!.energiaKwh < r.energiaKwh),
  'o agente deveria gastar menos energia',
)
const temperaturasFora = forasDia.map((f) => f.temperatura)
conferir(Math.min(...temperaturasFora) > 16.5 && Math.max(...temperaturasFora) < 29.5, 'clima de fora fora de 17–29 °C')
modelos.forEach((m) => conferir(m.pesos.length === totalPesos(m.arquitetura), `pesos de ${m.id}`))

// ---------------------------------------------------------------- escrita

const PASTA_ESTUFA = 'src/modules/estufa/infrastructure/dadosExemplo'
const PASTA_TREINO = 'src/modules/treino/infrastructure/dadosExemplo'

/** Grava já no formato do Prettier do projeto, senão o `prettier --check` reclama a cada geração. */
async function gravar(caminho: string, dados: unknown) {
  mkdirSync(dirname(caminho), { recursive: true })
  const opcoes = await resolveConfig(caminho)
  writeFileSync(caminho, await format(JSON.stringify(dados), { ...opcoes, parser: 'json' }))
  console.log(`  ${caminho}`)
}

const controladorTexto = (c: Controlador) => (c.tipo === 'agente' ? `agente ${c.modeloId}` : c.tipo)
console.log('Dados de exemplo:')
for (const r of resumos) {
  const e = estufas.find((x) => x.id === r.estufaId)!
  console.log(
    `  ${e.id.padEnd(11)} ${controladorTexto(e.controlador).padEnd(12)} fora ${(r.foraDaFaixa * 100).toFixed(1)}%  ${r.energiaKwh} kWh  ${r.massaPorPe} g  barradas ${r.barradas}  ${JSON.stringify(r.foraPorVariavel)}`,
  )
}
await gravar(`${PASTA_ESTUFA}/estufas.json`, { estufas, passos: passosPorEstufa, eventos, resumos })
await gravar(`${PASTA_TREINO}/treino.json`, {
  estado: estadoTreino,
  geracoes,
  modelos,
  configuracao,
  gravacoes: gravacoes.map((g) => g.resumo),
})
for (const g of gravacoes) await gravar(`${PASTA_TREINO}/${g.gravacao.id}.json`, g.gravacao)
