import css from './BarraProgresso.module.css'

/**
 * Barra fina no topo enquanto a próxima página carrega. Só aparece se a
 * espera passar de 300ms (atraso no CSS): carregamento rápido não pisca nada.
 * Nunca esconde as abas nem a barra lateral; a página atual fica na tela.
 */
export function BarraProgresso({ ativa }: { ativa: boolean }) {
  if (!ativa) return null
  return <span className={css.barra} role="progressbar" aria-label="Carregando a página" />
}
