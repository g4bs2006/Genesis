import { useState } from 'react'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { TERMOS, type Termo } from '../domain/termos'
import css from './PaginaGlossario.module.css'

const semAcento = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** Todos os termos num lugar só, com busca (sem acento: "pH", "vpd", "mutacao"). */
export function PaginaGlossario() {
  const [busca, setBusca] = useState('')
  const termos = (Object.values(TERMOS) as Termo[])
    .filter((t) => semAcento(`${t.nome} ${t.curto} ${t.explicacao}`).includes(semAcento(busca)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  return (
    <VStack gap={4} paddingBlock={6}>
      <VStack gap={1}>
        <Heading level={1}>Glossário</Heading>
        <Text color="secondary">
          Os termos do Genesis em português simples: da estufa, do dinheiro e da rede neural.
        </Text>
      </VStack>
      <TextInput
        label="Buscar termo"
        isLabelHidden
        placeholder="Buscar (ex.: VPD, mutação)"
        value={busca}
        onChange={setBusca}
      />
      <section className={css.lista}>
        {termos.map((t) => (
          <Card key={t.id} padding={3}>
            <VStack gap={1}>
              <Text weight="medium">
                {t.nome} <Text color="secondary">· {t.curto}</Text>
              </Text>
              <Text type="supporting">{t.explicacao}</Text>
              {t.exemplo && (
                <Text type="supporting" color="secondary">
                  {t.exemplo}
                </Text>
              )}
            </VStack>
          </Card>
        ))}
        {termos.length === 0 && <Text color="secondary">Nenhum termo com “{busca}”.</Text>}
      </section>
    </VStack>
  )
}
