/**
 * O aviso de quando o treino de verdade ainda não tem o que mostrar: nenhum
 * treino mandou dados, a primeira geração ainda não chegou, ou a nuvem falhou.
 * Sem isto, a tela ficaria num esboço cinza para sempre.
 */
import { Banner } from '@astryxdesign/core/Banner'
import { SemExecucaoAinda } from '../infrastructure/supabase'

export function AvisoTreino({ erro, semGeracoes }: { erro?: unknown; semGeracoes?: boolean }) {
  if (erro instanceof SemExecucaoAinda)
    return (
      <Banner
        status="info"
        title="Nenhum treino mandou dados ainda"
        description="Assim que o PC do treino rodar o treino/nuvem.py, as gerações aparecem aqui sozinhas."
        collapsible={false}
      />
    )
  if (erro)
    return (
      <Banner
        status="error"
        title="Não consegui ler o treino na nuvem"
        description={erro instanceof Error ? erro.message : String(erro)}
        collapsible={false}
      />
    )
  if (semGeracoes)
    return (
      <Banner
        status="info"
        title="Esperando a primeira geração"
        description="O treino começou; a curva aparece quando a primeira geração terminar."
        collapsible={false}
      />
    )
  return null
}
