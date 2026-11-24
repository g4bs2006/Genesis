import { NavLink, useLocation } from 'react-router-dom'
import { rotaAtiva, type ItemNavegacao } from '../templates/tipos'
import css from './BarraAbas.module.css'

/**
 * Abas embaixo, no alcance do polegar. O Astryx não tem esse componente (o
 * MobileNav dele é menu sanduíche), então é nosso, feito só com tokens.
 */
export function BarraAbas({ itens }: { itens: ItemNavegacao[] }) {
  const { pathname } = useLocation()
  return (
    <nav className={css.barra} aria-label="Abas">
      {itens.map(({ rota, rotulo, icone, iconeAtivo }) => {
        const ativa = rotaAtiva(rota, pathname)
        const Icone = ativa && iconeAtivo ? iconeAtivo : icone
        return (
          <NavLink
            key={rota}
            to={rota}
            // só o conteúdo esmaece (base.css, .conteudo-pagina); as abas ficam paradas
            viewTransition
            className={({ isPending }) => (isPending ? `${css.aba} ${css.indo}` : css.aba)}
            aria-current={ativa ? 'page' : undefined}
          >
            <Icone aria-hidden />
            {rotulo}
          </NavLink>
        )
      })}
    </nav>
  )
}
