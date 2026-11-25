import { HStack } from '@astryxdesign/core/HStack'
import { InfoTip } from '@astryxdesign/core/InfoTip'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { termo, type IdTermo } from '../domain/termos'

/**
 * O "o que é isso?" (ⓘ) de qualquer termo técnico: o jeito único de mostrar
 * dica no app. O texto vem do glossário central (domain/termos.ts): mudou lá,
 * muda em toda a interface.
 *
 * Com `rotulo`, desenha também o nome ao lado do ⓘ (legendas do Modelo).
 *
 * Por que `color="inherit"`: o balão do Astryx tem fundo invertido (escuro no
 * tema claro, claro no escuro) e já põe a cor de letra certa. O <Text> sozinho
 * força a cor de texto da página (preta no claro), e a dica ficava preta sobre
 * preto, ilegível. Esse era o defeito do "?" (passo 07).
 */
export function OQueEIsso({ id, rotulo }: { id: IdTermo; rotulo?: string }) {
  const t = termo(id)
  const dica = (
    <InfoTip
      label={`O que é ${t.nome}?`}
      content={
        <VStack gap={1}>
          <Text weight="medium" color="inherit">
            {t.nome} · {t.curto}
          </Text>
          <Text type="supporting" color="inherit">
            {t.explicacao}
          </Text>
          {t.exemplo && (
            <Text type="supporting" color="inherit">
              {t.exemplo}
            </Text>
          )}
        </VStack>
      }
    />
  )
  if (!rotulo) return dica
  return (
    <HStack gap={1} align="center">
      <Text type="supporting" color="secondary">
        {rotulo}
      </Text>
      {dica}
    </HStack>
  )
}
