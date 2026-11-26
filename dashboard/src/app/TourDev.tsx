import { useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { usePreferencias } from '@/shared/stores/preferencias'

const PASSOS = [
  {
    titulo: 'O modo Desenvolvedor',
    texto:
      'Aqui fica o lado de dentro do Genesis: como a rede neural foi treinada, como ela decide e como se sai contra as regras fixas.',
  },
  {
    titulo: 'Estufas lado a lado',
    texto:
      'Os campeões do treino e as regras fixas no mesmo clima. Passe o ponteiro no gráfico para ver todas as alfaces naquele instante.',
  },
  {
    titulo: 'Treino e Modelo',
    texto:
      'Treino mostra a evolução geração a geração. Modelo abre a rede por dentro: quais entradas pesaram em cada decisão.',
  },
  {
    titulo: 'Gravações e a Vitrine',
    texto:
      'Gravações reproduz um ciclo inteiro acelerado, com as ações gravadas no treino. Na Vitrine do produtor você escolhe qual gravação o modo Produtor mostra, e em que velocidade.',
  },
]

/** Tour curto na primeira visita ao modo Desenvolvedor (desktop). Aparece uma vez só. */
export function TourDev() {
  const { tourDevVisto, marcarTourDev } = usePreferencias()
  const [passo, setPasso] = useState(0)
  if (tourDevVisto) return null
  const atual = PASSOS[passo]!
  const ultimo = passo === PASSOS.length - 1
  return (
    <Dialog isOpen onOpenChange={(aberto) => !aberto && marcarTourDev()} width={460}>
      <DialogHeader title={atual.titulo} onOpenChange={() => marcarTourDev()} />
      <VStack gap={4} padding={4}>
        <Text>{atual.texto}</Text>
        <HStack justify="between" align="center">
          <Text type="code" color="secondary">
            {passo + 1} de {PASSOS.length}
          </Text>
          <HStack gap={2}>
            {!ultimo && <Button label="Pular" variant="ghost" onClick={marcarTourDev} />}
            <Button
              label={ultimo ? 'Começar' : 'Próximo'}
              variant="primary"
              onClick={() => (ultimo ? marcarTourDev() : setPasso(passo + 1))}
            />
          </HStack>
        </HStack>
      </VStack>
    </Dialog>
  )
}
