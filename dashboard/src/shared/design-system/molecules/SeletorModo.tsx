import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import type { Modo } from '@/shared/stores/preferencias'

/**
 * Produtor | Desenvolvedor. O mesmo app, dois públicos: o produtor (ou a banca
 * do TCC) vê a estufa e o dinheiro; o desenvolvedor vê o treino e a rede.
 */
export function SeletorModo({ valor, aoTrocar }: { valor: Modo; aoTrocar: (modo: Modo) => void }) {
  return (
    <SegmentedControl label="Modo do app" layout="fill" size="sm" value={valor} onChange={(v) => aoTrocar(v as Modo)}>
      <SegmentedControlItem value="produtor" label="Produtor" />
      <SegmentedControlItem value="desenvolvedor" label="Desenvolvedor" />
    </SegmentedControl>
  )
}
