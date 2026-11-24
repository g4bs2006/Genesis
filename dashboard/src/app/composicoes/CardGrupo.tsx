import { CardVariavel } from '@/shared/design-system/molecules/CardVariavel'
import {
  estadoConfirmadoDoGrupo,
  FAIXAS,
  tendencia,
  valorDe,
  type Grupo,
  type Passo,
  type Variavel,
} from '@/modules/estufa'
import { OQueEIsso } from '@/modules/glossario'
import { ehExemplo, faixaTexto, formatarVariavel, TERMO_DA_VARIAVEL } from './variaveis'

const SETA = { subindo: '↑', caindo: '↓', estavel: '' } as const

/** Um card da grade 2×2 do celular: a variável principal do grupo e a secundária como detalhe. */
export function CardGrupo({ grupo, passo, passos }: { grupo: Grupo; passo: Passo; passos: Passo[] }) {
  const [principal, secundaria] = grupo.variaveis as [Variavel, Variavel | undefined]
  const f = FAIXAS[principal]
  const seta = SETA[tendencia(passos, principal)]
  const detalhe = secundaria
    ? `${FAIXAS[secundaria].nome} ${formatarVariavel(secundaria, valorDe(passo.leitura, secundaria))}${
        secundaria === 'nivel' ? '%' : ` ${FAIXAS[secundaria].unidade}`
      }${FAIXAS[secundaria].apoio ? ` · ${FAIXAS[secundaria].apoio}` : ''}`
    : grupo.apoio
  return (
    <CardVariavel
      dica={(() => {
        const t = TERMO_DA_VARIAVEL[principal] ?? (secundaria ? TERMO_DA_VARIAVEL[secundaria] : undefined)
        return t ? <OQueEIsso id={t} /> : undefined
      })()}
      tamanho="compacto"
      nome={grupo.nome}
      valor={formatarVariavel(principal, valorDe(passo.leitura, principal))}
      tendencia={seta}
      unidade={f.unidade}
      faixa={faixaTexto(principal)}
      estado={estadoConfirmadoDoGrupo(passos, grupo.variaveis)}
      detalhe={detalhe}
      exemplo={grupo.variaveis.some((v) => ehExemplo(passo, v))}
    />
  )
}
