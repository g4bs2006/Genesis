import { memo } from 'react'
import { CardVariavel } from '@/shared/design-system/molecules/CardVariavel'
import { Sparkline } from '@/shared/design-system/graficos/Sparkline'
import { estadoConfirmadoDoGrupo, FAIXAS, valorDe, valorExibido, type Passo, type Variavel } from '@/modules/estufa'
import { ehExemplo, faixaTexto, formatarVariavel } from './variaveis'

/**
 * Card do desktop: valor, faixa e sparkline de 24 h (cinza; colorida só fora
 * do normal). A segunda variável do grupo (ex.: VPD junto da umidade) vira detalhe.
 */
/** memo: com 8 cards na tela, só redesenha o que mudou */
export const CardVariavelDesktop = memo(function CardVariavelDesktop({
  variaveis,
  passo,
  passos,
}: {
  variaveis: Variavel[]
  passo: Passo
  passos: Passo[]
}) {
  const [v, segunda] = variaveis as [Variavel, Variavel | undefined]
  const f = FAIXAS[v]
  const estado = estadoConfirmadoDoGrupo(passos, variaveis)
  const unidade = (x: Variavel) => (x === 'nivel' ? '%' : FAIXAS[x].unidade)
  const detalhe = segunda
    ? `${FAIXAS[segunda].nome} ${formatarVariavel(segunda, valorDe(passo.leitura, segunda))} ${unidade(segunda)}${
        FAIXAS[segunda].apoio ? ` · ${FAIXAS[segunda].apoio}` : ''
      }`
    : f.apoio
  return (
    <CardVariavel
      nome={f.nome}
      valor={formatarVariavel(v, valorDe(passo.leitura, v))}
      unidade={unidade(v)}
      faixa={v === 'luz' ? undefined : faixaTexto(v)}
      estado={estado}
      detalhe={detalhe}
      exemplo={variaveis.some((x) => ehExemplo(passo, x))}
      grafico={
        <Sparkline
          valores={passos.map((p) => valorExibido(v, valorDe(p.leitura, v)))}
          estado={estado}
          faixa={v === 'luz' ? undefined : [valorExibido(v, f.min), valorExibido(v, f.max)]}
          rotulo={`${f.nome} nas últimas 24 horas`}
        />
      }
    />
  )
})
