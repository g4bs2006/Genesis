/**
 * Desenvolvedor · celular: só o resumo. O treino está rodando? Em que fase e
 * geração? Melhor nota e o último evento importante. Nada de gráfico grande.
 */
import { Badge } from '@astryxdesign/core/Badge'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { formatarReaisCurto } from '@/modules/dinheiro'
import { useEstufas, useEventos, type Evento } from '@/modules/estufa'
import { AvisoTreino, situacaoDasFases, useEstadoTreino, useGeracoes, useOrigemTreino } from '@/modules/treino'
import { CurvaAprendizado } from '@/shared/design-system/graficos/CurvaAprendizado'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { formatarData, formatarHora, formatarNumero } from '@/shared/lib/formatar'
import { useTelaLarga } from '@/shared/hooks/useTelaLarga'
import { PaginaEstufasLadoALado } from './PaginaEstufasLadoALado'
import { OQueEIsso } from '@/modules/glossario'

/** /dev: no desktop, as estufas lado a lado; no celular, o resumo. */
export function PaginaDev() {
  return useTelaLarga() ? <PaginaEstufasLadoALado /> : <PaginaResumoDev />
}

const IMPORTANTE: Evento['tipo'][] = ['erro', 'barrado', 'perturbacao']

function PaginaResumoDev() {
  const estado = useEstadoTreino()
  const geracoes = useGeracoes()
  const estufas = useEstufas()
  const agente = estufas.data?.find((e) => e.controlador.tipo === 'agente')
  const eventos = useEventos(agente?.id ?? '')
  const origem = useOrigemTreino()
  const erro = estado.error ?? geracoes.error
  const esboco = useAtraso((!estado.data || !geracoes.data) && !erro)
  if (erro && (!estado.data || !geracoes.data))
    return (
      <VStack gap={4} paddingBlock={4}>
        <Heading level={1}>Treino</Heading>
        <AvisoTreino erro={erro} />
      </VStack>
    )
  if (!estado.data || !geracoes.data) return esboco ? <Skeleton height={360} radius={3} /> : null

  const e = estado.data
  const ultima = geracoes.data.at(-1)
  const melhorDeTodas = geracoes.data.length ? Math.max(...geracoes.data.map((g) => g.melhor)) : null
  const evento = [...(eventos.data ?? [])]
    .filter((x) => IMPORTANTE.includes(x.tipo))
    .sort((a, b) => b.instante.localeCompare(a.instante))[0]

  return (
    <VStack gap={4} paddingBlock={4}>
      <Heading level={1}>Treino</Heading>
      <Card>
        <VStack gap={2}>
          <HStack gap={2} align="center">
            <StatusDot variant={e.rodando ? 'success' : 'neutral'} label={e.rodando ? 'rodando' : 'parado'} />
            <Text weight="medium">{e.rodando ? 'O treino está rodando' : 'O treino está parado'}</Text>
          </HStack>
          <Text color="secondary">
            {e.onde} · {origem === 'nuvem' ? 'ao vivo' : 'dados de exemplo'}
          </Text>
          <HStack gap={6}>
            <Numero rotulo="fase" valor={`${e.faseAtual} de 6`} />
            <Numero rotulo="geração" valor={formatarNumero(e.geracaoAtual)} />
          </HStack>
        </VStack>
      </Card>
      <Card>
        <HStack gap={6}>
          <Numero rotulo="melhor nota (última geração)" valor={ultima ? formatarReaisCurto(ultima.melhor) : '—'} />
          <Numero rotulo="melhor de todas" valor={melhorDeTodas === null ? '—' : formatarReaisCurto(melhorDeTodas)} />
        </HStack>
        <OQueEIsso id="nota" rotulo="nota = reais por ciclo" />
      </Card>
      {origem === 'nuvem' ? (
        // Treino de verdade: a curva das últimas gerações. (Os eventos vêm da
        // estufa de brinquedo, que não tem nada a ver com o treino rodando.)
        geracoes.data.length >= 2 && (
          <Card>
            <VStack gap={1}>
              <Text type="label" color="secondary">
                Últimas {Math.min(200, geracoes.data.length)} gerações
              </Text>
              <CurvaAprendizado
                geracoes={geracoes.data.slice(-200)}
                fases={situacaoDasFases(e)
                  .filter((f) => f.inicio !== undefined)
                  .map((f) => ({ fase: f.numero, inicio: f.inicio!, fim: f.fim ?? ultima!.numero }))}
                formatarNota={formatarReaisCurto}
                altura={180}
              />
            </VStack>
          </Card>
        )
      ) : (
        <Card>
          <VStack gap={1}>
            <Text type="label" color="secondary">
              Último evento importante
            </Text>
            {evento ? (
              <>
                <HStack gap={2} align="center">
                  <Badge
                    variant={evento.tipo === 'erro' ? 'error' : evento.tipo === 'barrado' ? 'warning' : 'info'}
                    label={evento.tipo}
                  />
                  <Text weight="medium">{evento.titulo}</Text>
                </HStack>
                <Text type="supporting" color="secondary">
                  {formatarData(evento.instante)} {formatarHora(evento.instante)} · {evento.detalhe}
                </Text>
              </>
            ) : (
              <Text color="secondary">Nada importante aconteceu.</Text>
            )}
          </VStack>
        </Card>
      )}
    </VStack>
  )
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <VStack gap={0.5}>
      <Text size="2xl" weight="medium" hasTabularNumbers>
        {valor}
      </Text>
      <Text type="supporting" color="secondary">
        {rotulo}
      </Text>
    </VStack>
  )
}
