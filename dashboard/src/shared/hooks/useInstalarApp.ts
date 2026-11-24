import { useEffect, useState } from 'react'

/** O evento que o Chrome/Edge/Android disparam quando o app pode ser instalado. */
type EventoInstalar = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const jaInstalado = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

/**
 * Instalar o app (PWA). O navegador avisa quando dá para instalar; guardamos
 * esse aviso para disparar o pedido quando a pessoa tocar no botão.
 * No iPhone não existe o aviso: a instalação é por Compartilhar → Tela de Início.
 */
export function useInstalarApp() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null)
  const [instalado, setInstalado] = useState(jaInstalado)
  useEffect(() => {
    const aoPoder = (e: Event) => {
      e.preventDefault() // segura o aviso automático; o botão decide a hora
      setEvento(e as EventoInstalar)
    }
    const aoInstalar = () => setInstalado(true)
    window.addEventListener('beforeinstallprompt', aoPoder)
    window.addEventListener('appinstalled', aoInstalar)
    return () => {
      window.removeEventListener('beforeinstallprompt', aoPoder)
      window.removeEventListener('appinstalled', aoInstalar)
    }
  }, [])
  const ehIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  return {
    instalado,
    podeInstalar: !!evento,
    ehIos,
    instalar: async () => {
      if (!evento) return
      await evento.prompt()
      if ((await evento.userChoice).outcome === 'accepted') setInstalado(true)
      setEvento(null)
    },
  }
}
