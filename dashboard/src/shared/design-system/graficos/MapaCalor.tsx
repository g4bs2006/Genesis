import css from './MapaCalor.module.css'

type Props = {
  linhas: string[]
  colunas: string[]
  /** valores[linha][coluna], 0..1 */
  valores: number[][]
  formatar: (v: number) => string
  rotulo: string
}

/**
 * Mapa de calor: quanto mais forte o vermelho, pior. Zero fica neutro (sem
 * cor), para a cor só aparecer onde há problema. O número fica escrito em
 * cada célula: a cor ajuda, mas não é a única forma de ler (acessibilidade).
 */
export function MapaCalor({ linhas, colunas, valores, formatar, rotulo }: Props) {
  const max = Math.max(0.0001, ...valores.flat())
  return (
    <table className={css.tabela} aria-label={rotulo}>
      <thead>
        <tr>
          <th />
          {colunas.map((c) => (
            <th key={c} scope="col" className={css.cabeca}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((l, i) => (
          <tr key={l}>
            <th scope="row" className={css.linha}>
              {l}
            </th>
            {colunas.map((c, j) => {
              const v = valores[i]?.[j] ?? 0
              return (
                <td key={c} className={css.celula}>
                  <span
                    className={css.fundo}
                    style={{ opacity: v > 0 ? 0.12 + 0.68 * (v / max) : 0 }}
                    aria-hidden
                  />
                  <span className={css.valor}>{formatar(v)}</span>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
