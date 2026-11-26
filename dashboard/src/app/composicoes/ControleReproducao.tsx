/**
 * O selo e o botão da reprodução no modo Produtor. Ainda não existe estufa de
 * verdade: o que a tela mostra é um ciclo gravado no simulador do treino,
 * tocado acelerado (decisão 0007). O selo diz isso sem jargão; o botão pausa
 * (a apresentação deixa andando).
 */
import { Badge } from '@astryxdesign/core/Badge'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { PauseIcon, PlayIcon } from '@heroicons/react/24/solid'
import { useRelogio } from '@/modules/estufa'
import { rotuloVelocidade } from './velocidades'

export function ControleReproducao() {
  const { estado, controle } = useRelogio()
  if (!estado || !controle) return null
  return (
    <HStack gap={2} align="center" wrap="wrap">
      <Badge
        variant="neutral"
        label={`ciclo gravado no simulador · ${estado.pausado ? 'pausado' : rotuloVelocidade(estado.velocidade)}`}
      />
      <Button
        label={estado.pausado ? 'Continuar' : 'Pausar'}
        size="sm"
        variant="ghost"
        icon={estado.pausado ? <PlayIcon width={14} aria-hidden /> : <PauseIcon width={14} aria-hidden />}
        onClick={() => (estado.pausado ? controle.continuar() : controle.pausar())}
      />
    </HStack>
  )
}
