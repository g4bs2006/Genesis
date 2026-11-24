import { useSyncExternalStore } from 'react'

// A partir daqui o app usa a casca do desktop (barra lateral e gráficos);
// abaixo, a do celular (abas embaixo e só o crucial). Mesmo corte do Tesserato.
const CONSULTA = '(min-width: 768px)'

function assinar(avisar: () => void) {
  const mql = window.matchMedia(CONSULTA)
  mql.addEventListener('change', avisar)
  return () => mql.removeEventListener('change', avisar)
}

/**
 * Hook (função do React que começa com "use" e pode guardar estado ou ouvir
 * algo de fora) que diz se a tela é larga. Ouve o navegador: girar o tablet
 * ou redimensionar a janela troca a casca na hora.
 */
export function useTelaLarga(): boolean {
  return useSyncExternalStore(assinar, () => window.matchMedia(CONSULTA).matches)
}
