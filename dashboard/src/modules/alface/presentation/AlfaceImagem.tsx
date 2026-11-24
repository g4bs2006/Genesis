import { memo, useState } from 'react'
import { escolherDesenho, type NomeDesenho, type ParametrosAlface } from '../domain/escolherDesenho'
import css from './AlfaceImagem.module.css'
import { DESENHOS } from './desenhos'

type Props = {
  parametros: ParametrosAlface
  /** descrição para leitor de tela, ex.: "Alface de 182 g, saudável" */
  rotulo: string
  /** largura máxima em px (a imagem é quadrada e acompanha o espaço) */
  largura?: number
}

/**
 * A alface da estufa. Quando o estado muda (cresceu, murchou, amarelou), o
 * desenho novo aparece por cima do antigo num esmaecer de ~340ms; com
 * movimento reduzido, troca direto (base.css).
 */
export const AlfaceImagem = memo(function AlfaceImagem({ parametros, rotulo, largura }: Props) {
  const nome = escolherDesenho(parametros)
  // o desenho anterior fica embaixo até o novo terminar de aparecer
  const [anterior, setAnterior] = useState<{ atual: NomeDesenho; antes: NomeDesenho | null }>({
    atual: nome,
    antes: null,
  })
  if (anterior.atual !== nome) setAnterior({ atual: nome, antes: anterior.atual })

  return (
    <span className={css.quadro} style={{ maxWidth: largura }} role="img" aria-label={rotulo}>
      {anterior.antes && <img className={css.imagem} src={DESENHOS[anterior.antes]} alt="" aria-hidden />}
      <img
        key={nome}
        className={`${css.imagem} ${anterior.antes ? css.entrando : ''}`}
        src={DESENHOS[nome]}
        alt=""
        aria-hidden
        decoding="async"
        onAnimationEnd={() => setAnterior({ atual: nome, antes: null })}
      />
    </span>
  )
})
