import { useEffect, useLayoutEffect } from 'react'
import { Outlet, ScrollRestoration, useLocation, useNavigate, useNavigation } from 'react-router-dom'
import { CascaCelular } from '@/shared/design-system/templates/CascaCelular'
import { CascaDesktop } from '@/shared/design-system/templates/CascaDesktop'
import { SeletorModo } from '@/shared/design-system/molecules/SeletorModo'
import { BotaoTema } from '@/shared/design-system/molecules/BotaoTema'
import { BarraProgresso } from '@/shared/design-system/atoms/BarraProgresso'
import { useTelaLarga } from '@/shared/hooks/useTelaLarga'
import { usePreferencias, type Modo } from '@/shared/stores/preferencias'
import { ListaEstufasLateral } from '@/modules/estufa'
import { CardTreinoLateral } from '@/modules/treino'
import { navegacao } from './navegacao'
import { TourDev } from './TourDev'

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
  const { modo: guardado, trocarModo, barraRecolhida, recolherBarra } = usePreferencias()
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

  // título da aba do navegador acompanha a página (e o leitor de tela anuncia)
  useEffect(() => {
    const item = [...navegacao.produtor.desktop, ...navegacao.desenvolvedor.desktop].find((i) => i.rota === pathname)
    const extra: Record<string, string> = { '/laboratorio/alface': 'Laboratório da alface' }
    const nome = item?.rotulo ?? extra[pathname]
    document.title = nome ? `${nome} · Genesis` : 'Genesis'
  }, [pathname])

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

  if (!largo)
    return (
      <CascaCelular
        abas={navegacao[modo].celular}
        topo={<SeletorModo valor={modo} aoTrocar={aoTrocarModo} tamanho="md" />}
      >
        {conteudo}
      </CascaCelular>
    )

  return (
    <CascaDesktop
      itens={navegacao[modo].desktop}
      extras={modo === 'produtor' ? <ListaEstufasLateral /> : <CardTreinoLateral />}
      rodape={<SeletorModo valor={modo} aoTrocar={aoTrocarModo} tamanho="sm" />}
      icones={<BotaoTema tamanho="sm" />}
      recolhida={barraRecolhida}
      aoRecolher={recolherBarra}
    >
      {conteudo}
      {modo === 'desenvolvedor' && <TourDev />}
    </CascaDesktop>
  )
}
