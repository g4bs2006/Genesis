import { Heading } from '@astryxdesign/core/Heading'
import { Link } from '@astryxdesign/core/Link'
import { VStack } from '@astryxdesign/core/VStack'

/** Endereço que não existe (ou uma página que saiu, como /glossario). */
export function PaginaNaoEncontrada() {
  return (
    <VStack gap={3} paddingBlock={6} hAlign="start">
      <Heading level={1}>Página não encontrada</Heading>
      <Link href="/">Voltar para o Agora</Link>
    </VStack>
  )
}
