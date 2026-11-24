import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { List, ListItem } from '@astryxdesign/core/List'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { CheckIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { FormularioPrecos } from '@/modules/dinheiro'
import { useEstufaAtual, useEstufas } from '@/modules/estufa'
import { SeletorModo } from '@/shared/design-system/molecules/SeletorModo'
import { useInstalarApp } from '@/shared/hooks/useInstalarApp'
import { usePreferencias, type Modo, type Tema } from '@/shared/stores/preferencias'

/** Ajustes: estufa, tema, modo e instalar o app. (Preços entram com o Dinheiro, Fase 5.) */
export function PaginaAjustes() {
  const { modo, tema, trocarModo, trocarTema, escolherEstufa } = usePreferencias()
  const navegar = useNavigate()
  const estufas = useEstufas()
  const atual = useEstufaAtual()
  const app = useInstalarApp()
  const [precos, setPrecos] = useState(false)

  return (
    <VStack gap={6} paddingBlock={4} maxWidth={560}>
      <Heading level={1}>Ajustes</Heading>

      <Secao titulo="Estufa" apoio="Qual estufa o Agora, o Ciclo e o Dinheiro mostram.">
        <Card padding={2}>
          <List edge="padded">
            {estufas.data?.map((e) => (
              <ListItem
                key={e.id}
                label={e.nome}
                description={`${e.plantas} pés · dia ${Math.floor(e.diaDoCiclo)} de ${e.diasDoCiclo} · ${e.origem}`}
                isSelected={e.id === atual?.id}
                endContent={e.id === atual?.id ? <CheckIcon width={18} aria-hidden /> : undefined}
                onClick={() => escolherEstufa(e.id)}
              />
            ))}
          </List>
        </Card>
      </Secao>

      <Secao
        titulo="Preços"
        apoio="Alface, energia, nutrientes, água, mudas e custos fixos: a conta do Dinheiro usa os seus."
      >
        <Button label="Editar preços" onClick={() => setPrecos(true)} />
        <FormularioPrecos aberto={precos} aoMudar={setPrecos} />
      </Secao>

      <Secao titulo="Tema">
        <SegmentedControl
          label="Tema"
          layout="fill"
          size="lg"
          value={tema}
          onChange={(v) => trocarComTransicao(() => trocarTema(v as Tema))}
        >
          <SegmentedControlItem value="sistema" label="Sistema" />
          <SegmentedControlItem value="claro" label="Claro" />
          <SegmentedControlItem value="escuro" label="Escuro" />
        </SegmentedControl>
      </Secao>

      <Secao
        titulo="Modo"
        apoio="Produtor mostra a estufa e o dinheiro. Desenvolvedor mostra o treino e a rede neural."
      >
        <SeletorModo
          valor={modo}
          aoTrocar={(novo: Modo) => {
            trocarModo(novo)
            navegar(novo === 'produtor' ? '/' : '/dev', { viewTransition: true })
          }}
        />
      </Secao>

      <Secao
        titulo="Instalar o app"
        apoio="Com o app instalado, o Genesis abre como um aplicativo, em tela cheia, e funciona sem internet."
      >
        {app.instalado ? (
          <Text color="secondary">O Genesis já está instalado neste aparelho.</Text>
        ) : app.podeInstalar ? (
          <Button label="Instalar o Genesis" variant="primary" clickAction={app.instalar} />
        ) : app.ehIos ? (
          <Text color="secondary">No iPhone: toque em Compartilhar e depois em “Adicionar à Tela de Início”.</Text>
        ) : (
          <Text color="secondary">Use o menu do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”.</Text>
        )}
      </Secao>
    </VStack>
  )
}

function Secao({ titulo, apoio, children }: { titulo: string; apoio?: string; children: React.ReactNode }) {
  return (
    <VStack gap={2}>
      <VStack gap={0.5}>
        <Heading level={2}>{titulo}</Heading>
        {apoio && (
          <Text type="supporting" color="secondary">
            {apoio}
          </Text>
        )}
      </VStack>
      {children}
    </VStack>
  )
}

/**
 * Troca de tema sem "meio-termo": o navegador fotografa a tela, aplica o tema
 * novo de uma vez (flushSync) e cruza as duas imagens em 200ms. Sem a API
 * (navegadores antigos), troca direto.
 */
function trocarComTransicao(trocar: () => void) {
  if (!document.startViewTransition) return trocar()
  document.startViewTransition(() => flushSync(trocar))
}
