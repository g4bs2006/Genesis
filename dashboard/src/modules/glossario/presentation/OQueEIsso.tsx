import { InfoTip } from '@astryxdesign/core/InfoTip'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { termo, type IdTermo } from '../domain/termos'

/**
 * O "o que é isso?" (ⓘ) de qualquer número técnico. O texto vem do glossário
 * central (domain/termos.ts): mudou lá, muda em toda a interface.
 */
export function OQueEIsso({ id }: { id: IdTermo }) {
  const t = termo(id)
  return (
    <InfoTip
      label={`O que é ${t.nome}?`}
      content={
        <VStack gap={1}>
          <Text weight="medium">
            {t.nome} · {t.curto}
          </Text>
          <Text type="supporting">{t.explicacao}</Text>
          {t.exemplo && (
            <Text type="supporting" color="secondary">
              {t.exemplo}
            </Text>
          )}
        </VStack>
      }
    />
  )
}
