import { Badge } from '@astryxdesign/core/Badge'

/**
 * Selo obrigatório enquanto os dados não forem de uma estufa real.
 * Regra do projeto: nada de exemplo apresentado como real.
 */
export function SeloDados({ origem }: { origem: 'exemplo' | 'simulada' | 'real' }) {
  if (origem === 'real') return null
  const texto = origem === 'exemplo' ? 'estufa simulada · dados de exemplo' : 'estufa simulada'
  return <Badge variant="neutral" label={texto} />
}
