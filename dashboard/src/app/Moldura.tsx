import { useEffect, useLayoutEffect } from 'react'
import { Outlet, ScrollRestoration, useLocation, useNavigate, useNavigation } from 'react-router-dom'
import { CascaCelular } from '@/shared/design-system/templates/CascaCelular'
import { CascaDesktop } from '@/shared/design-system/templates/CascaDesktop'
import { SeletorModo } from '@/shared/design-system/molecules/SeletorModo'
import { BarraProgresso } from '@/shared/design-system/atoms/BarraProgresso'
import { useTelaLarga } from '@/shared/hooks/useTelaLarga'
import { usePreferencias, type Modo } from '@/shared/stores/preferencias'
import { ListaEstufasLateral } from '@/modules/estufa'
import { CardTreinoLateral } from '@/modules/treino'
import { navegacao } from './navegacao'

/** /dev é sempre Desenvolvedor; Ajustes vale para os dois; o resto é Produtor. */
function modoDaRota(caminho: string, guardado: Modo): Modo {
  if (caminho.startsWith('/dev')) return 'desenvolvedor'
  if (caminho === '/ajustes') return guardado
  return 'produtor'
}

/**
 * Escolhe a casca (celular ou desktop) e os itens do modo atual.
 * `<Outlet />` é onde o React Router põe a página da rota aberta.
 */
export function Moldura() {
  const largo = useTelaLarga()
  const { modo: guardado, trocarModo } = usePreferencias()
  const navegar = useNavigate()
  const { pathname } = useLocation()
  // O modo sai da rota já na renderização: abrir /dev/treino nunca pisca a
  // barra do Produtor. O efeito só guarda a escolha.
  const modo = modoDaRota(pathname, guardado)
  useEffect(() => {
    if (modo !== guardado) trocarModo(modo)
  }, [modo, guardado, trocarModo])

  // A rolagem do desktop mora num container interno (o ScrollRestoration só
  // cuida da janela): página nova ou estufa nova começa do topo.
  const estufaId = usePreferencias((p) => p.estufaId)
  useLayoutEffect(() => {
    document.querySelector('.astryx-layout-content')?.scrollTo(0, 0)
  }, [pathname, estufaId])

  // Página nova ainda carregando (código sob demanda): barrinha no topo
  const carregando = useNavigation().state === 'loading'

  const aoTrocarModo = (novo: Modo) => {
    trocarModo(novo)
    // viewTransition: menu e conteúdo trocam juntos, num esmaecer curto
    navegar(novo === 'produtor' ? '/' : '/dev', { viewTransition: true })
  }

  const conteudo = (
    <>
      <BarraProgresso ativa={carregando} />
      <ScrollRestoration />
      <Outlet />
    </>
  )

  if (!largo) return <CascaCelular abas={navegacao[modo].celular}>{conteudo}</CascaCelular>

  return (
    <CascaDesktop
      itens={navegacao[modo].desktop}
      extras={modo === 'produtor' ? <ListaEstufasLateral /> : <CardTreinoLateral />}
      rodape={<SeletorModo valor={modo} aoTrocar={aoTrocarModo} />}
    >
      {conteudo}
    </CascaDesktop>
  )
}
