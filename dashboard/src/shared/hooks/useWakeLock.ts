import { useEffect } from 'react'

/**
 * Mantém a tela acesa enquanto o componente está montado (o visor fixo na
 * estufa). O navegador solta a trava quando a aba some; ao voltar, pede de
 * novo. Sem suporte (navegador antigo, http sem TLS): não faz nada.
 */
export function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let trava: WakeLockSentinel | null = null
    let montado = true
    const pedir = () => {
      if (document.visibilityState !== 'visible') return
      navigator.wakeLock
        .request('screen')
        .then((t) => {
          if (montado) trava = t
          else void t.release()
        })
        // recusado (bateria fraca, política do navegador): a tela só pode apagar, nada a fazer
        .catch(() => {})
    }
    pedir()
    document.addEventListener('visibilitychange', pedir)
    return () => {
      montado = false
      document.removeEventListener('visibilitychange', pedir)
      void trava?.release()
    }
  }, [])
}
