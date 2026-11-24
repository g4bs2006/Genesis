import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Heading } from '@astryxdesign/core/Heading'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { SeletorModo } from '@/shared/design-system/molecules/SeletorModo'
import { usePreferencias, type Modo, type Tema } from '@/shared/stores/preferencias'

// shortcut: só tema e modo na Fase 0; preços, estufa e "instalar o app" chegam na Fase 3
export function PaginaAjustes() {
  const { modo, tema, trocarModo, trocarTema } = usePreferencias()
  const navegar = useNavigate()
  return (
    <VStack gap={5} paddingBlock={6} maxWidth={480}>
      <Heading level={1}>Ajustes</Heading>
      <VStack gap={1.5}>
        <Text type="label">Tema</Text>
        <SegmentedControl
          label="Tema"
          layout="fill"
          value={tema}
          onChange={(v) => trocarComTransicao(() => trocarTema(v as Tema))}
        >
          <SegmentedControlItem value="sistema" label="Sistema" />
          <SegmentedControlItem value="claro" label="Claro" />
          <SegmentedControlItem value="escuro" label="Escuro" />
        </SegmentedControl>
      </VStack>
      <VStack gap={1.5}>
        <Text type="label">Modo</Text>
        <SeletorModo
          valor={modo}
          aoTrocar={(novo: Modo) => {
            trocarModo(novo)
            navegar(novo === 'produtor' ? '/' : '/dev', { viewTransition: true })
          }}
        />
        <Text type="supporting" color="secondary">
          Produtor mostra a estufa e o dinheiro. Desenvolvedor mostra o treino e a rede neural.
        </Text>
      </VStack>
    </VStack>
  )
}

/**
 * Troca de tema sem "meio-termo": o navegador fotografa a tela, aplica o tema
 * novo de uma vez (flushSync) e cruza as duas imagens em 200ms. Sem a API
 * (navegadores antigos), troca direto.
 */
function trocarComTransicao(trocar: () => void) {
  if (!document.startViewTransition) return trocar()
  document.startViewTransition(() => flushSync(trocar))
}
