import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { CascaVisor } from '@/shared/design-system/templates/CascaVisor'

// shortcut: esboço até a Fase 6 (visor de verdade)
export function PaginaVisor() {
  return (
    <CascaVisor>
      <VStack gap={2}>
        <Heading level={1}>Visor</Heading>
        <Text color="secondary">A tela fixa da estufa chega na Fase 6.</Text>
      </VStack>
    </CascaVisor>
  )
}
