import { useNavigate } from 'react-router-dom'
import { SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { usePreferencias } from '@/shared/stores/preferencias'
import type { Controlador } from '../domain/contrato'
import { useEstufaAtual, useEstufas } from './dados'

const NOME_CONTROLADOR: Record<Controlador['tipo'], string> = {
  agente: 'agente',
  regras: 'regras fixas',
  pid: 'PID',
  nada: 'sem controle',
}

/** As estufas na barra lateral do Produtor; tocar numa abre o Agora dela. */
export function ListaEstufasLateral() {
  const { data, isPending } = useEstufas()
  const atual = useEstufaAtual()
  const escolher = usePreferencias((p) => p.escolherEstufa)
  const navegar = useNavigate()
  const esboco = useAtraso(isPending)

  return (
    <SideNavSection title="Estufas">
      {esboco && (
        <VStack gap={0.5} paddingInline={2}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={34} radius={2} index={i} />
          ))}
        </VStack>
      )}
      {data?.map((estufa) => (
        <SideNavItem
          key={estufa.id}
          label={estufa.nome}
          endContent={
            <Text type="supporting" color="secondary">
              {NOME_CONTROLADOR[estufa.controlador.tipo]}
            </Text>
          }
          isSelected={estufa.id === atual?.id}
          onClick={() => {
            escolher(estufa.id)
            navegar('/', { viewTransition: true })
          }}
        />
      ))}
    </SideNavSection>
  )
}
