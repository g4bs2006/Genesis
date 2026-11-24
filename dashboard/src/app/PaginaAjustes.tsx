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
        <SegmentedControl label="Tema" layout="fill" value={tema} onChange={(v) => trocarTema(v as Tema)}>
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
            navegar(novo === 'produtor' ? '/' : '/dev')
          }}
        />
        <Text type="supporting" color="secondary">
          Produtor mostra a estufa e o dinheiro. Desenvolvedor mostra o treino e a rede neural.
        </Text>
      </VStack>
    </VStack>
  )
}
