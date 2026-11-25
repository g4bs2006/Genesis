import { flushSync } from 'react-dom'

/**
 * Troca de tema sem "meio-termo": o navegador fotografa a tela, aplica o tema
 * novo de uma vez (flushSync) e cruza as duas imagens em 200ms. Sem a API
 * (navegadores antigos), troca direto. Usada por Ajustes e pelo botão sol/lua.
 */
export function trocarComTransicao(trocar: () => void) {
  if (!document.startViewTransition) return trocar()
  document.startViewTransition(() => flushSync(trocar))
}
