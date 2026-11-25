import { IconButton } from '@astryxdesign/core/IconButton'
import { useTheme } from '@astryxdesign/core/theme'
import { IconeLua, IconeSol } from '../atoms/Icones'
import { trocarComTransicao } from '@/shared/lib/trocarComTransicao'
import { usePreferencias } from '@/shared/stores/preferencias'

/**
 * Sol/lua: um clique alterna claro ↔ escuro. Parte do tema que está NA TELA
 * (`useTheme().mode` já resolve "sistema" para claro ou escuro), então com
 * "sistema" o primeiro clique vai para o oposto do que se vê. "Sistema"
 * continua em Ajustes.
 */
export function BotaoTema({ tamanho = 'md' }: { tamanho?: 'sm' | 'md' | 'lg' }) {
  const { mode } = useTheme()
  const trocarTema = usePreferencias((p) => p.trocarTema)
  const escuro = mode === 'dark'
  const rotulo = escuro ? 'Usar tema claro' : 'Usar tema escuro'
  return (
    <IconButton
      label={rotulo}
      tooltip={rotulo}
      variant="ghost"
      size={tamanho}
      // mostra o destino do clique: no escuro aparece o sol
      icon={escuro ? <IconeSol width={18} /> : <IconeLua width={18} />}
      onClick={() => trocarComTransicao(() => trocarTema(escuro ? 'claro' : 'escuro'))}
    />
  )
}
