import { StatusDot } from '@astryxdesign/core/StatusDot'

export type Estado = 'ok' | 'atencao' | 'risco'

const VARIANTE = { ok: 'success', atencao: 'warning', risco: 'error' } as const
const ROTULO = { ok: 'na faixa', atencao: 'pede atenção', risco: 'fora da faixa' } as const

/** A bolinha do semáforo, com o nome do estado para leitor de tela e ao passar o mouse. */
export function SeloEstado({ estado }: { estado: Estado }) {
  return <StatusDot variant={VARIANTE[estado]} label={ROTULO[estado]} tooltip={ROTULO[estado]} />
}
