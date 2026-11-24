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
      {itens.map(({ rota, rotulo, icone: Icone }) => (
        <NavLink key={rota} to={rota} className={css.aba} aria-current={rotaAtiva(rota, pathname) ? 'page' : undefined}>
          <Icone aria-hidden />
          {rotulo}
        </NavLink>
      ))}
    </nav>
  )
}
