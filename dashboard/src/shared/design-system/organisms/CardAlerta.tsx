import { Banner } from '@astryxdesign/core/Banner'

/**
 * O alerta em linguagem humana: o que está errado e o que o agente já fez.
 * Ex.: "pH acima da faixa: 6,6 e subindo." / "O agente já dosou 4 ml de ácido há 20 min."
 */
export function CardAlerta({ titulo, feito, estado }: { titulo: string; feito: string; estado: 'atencao' | 'risco' }) {
  return (
    <Banner status={estado === 'risco' ? 'error' : 'warning'} title={titulo} description={feito} collapsible={false} />
  )
}
