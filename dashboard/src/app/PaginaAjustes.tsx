import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useInstalarApp } from '@/shared/hooks/useInstalarApp'
import { useTelaLarga } from '@/shared/hooks/useTelaLarga'

/**
 * Ajustes: por enquanto, só o aviso de que eles vão chegar aqui (decisão do
 * Gabriel, passo 08). Tema e modo têm botão próprio na moldura; os preços
 * foram para o Dinheiro; o glossário saiu. Instalar o app só faz sentido no
 * celular, então só aparece nele.
 */
export function PaginaAjustes() {
  const largo = useTelaLarga()
  return (
    <VStack gap={4} paddingBlock={6}>
      <Heading level={1}>Ajustes</Heading>
      <Card>
        <VStack gap={1}>
          <Text weight="medium">Os ajustes vão chegar aqui.</Text>
          <Text color="secondary">
            Quando o Genesis estiver ligado a uma estufa de verdade, é aqui que você vai escolher a estufa, os alarmes e
            quem pode ver os dados.
          </Text>
        </VStack>
      </Card>
      {!largo && <InstalarApp />}
    </VStack>
  )
}

function InstalarApp() {
  const app = useInstalarApp()
  return (
    <Card>
      <VStack gap={2}>
        <Heading level={2}>Instalar o app</Heading>
        {app.instalado ? (
          <Text color="secondary">O Genesis já está instalado neste aparelho.</Text>
        ) : app.podeInstalar ? (
          <Button label="Instalar o Genesis" variant="primary" clickAction={app.instalar} />
        ) : app.ehIos ? (
          <Text color="secondary">No iPhone: toque em Compartilhar e depois em “Adicionar à Tela de Início”.</Text>
        ) : (
          <Text color="secondary">Use o menu do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”.</Text>
        )}
      </VStack>
    </Card>
  )
}
