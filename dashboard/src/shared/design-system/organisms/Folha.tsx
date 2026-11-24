import type { ReactNode } from 'react'
import { BottomSheet } from '@astryxdesign/core/BottomSheet'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { Heading } from '@astryxdesign/core/Heading'
import { useTelaLarga } from '../../hooks/useTelaLarga'

type Props = { titulo: string; aberta: boolean; aoMudar: (aberta: boolean) => void; children: ReactNode }

/**
 * Formulário sempre numa "folha" (regra do Tesserato): diálogo no desktop e
 * painel que sobe de baixo no celular, no alcance do polegar.
 */
export function Folha({ titulo, aberta, aoMudar, children }: Props) {
  const largo = useTelaLarga()
  if (largo)
    return (
      <Dialog isOpen={aberta} onOpenChange={aoMudar} purpose="form" width={520} maxHeight="85dvh">
        <DialogHeader title={titulo} onOpenChange={aoMudar} />
        {children}
      </Dialog>
    )
  return (
    <BottomSheet isOpen={aberta} onOpenChange={aoMudar} purpose="form" label={titulo} height="tall" padding={4}>
      <Heading level={2}>{titulo}</Heading>
      {children}
    </BottomSheet>
  )
}
