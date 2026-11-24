import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { SeloDados } from '@/shared/design-system/molecules/SeloDados'
import { origemDosDados } from './dependencias'

/** Lugar reservado de uma tela que ainda vai ser feita (some fase a fase). */
export function PaginaEsboco({ titulo, fase }: { titulo: string; fase: number }) {
  return (
    <VStack gap={3} paddingBlock={6} hAlign="start">
      <SeloDados origem={origemDosDados} />
      <Heading level={1}>{titulo}</Heading>
      <Text color="secondary">Esta tela chega na Fase {fase}.</Text>
    </VStack>
  )
}
