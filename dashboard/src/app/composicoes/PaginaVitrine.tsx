/**
 * Desenvolvedor · Vitrine do produtor (passo 10, decisão 0007): qual gravação
 * alimenta o modo Produtor (Agora, Histórico, Ciclo, Dinheiro e o Visor) e em
 * que velocidade ela toca. A escolha fica só neste navegador (usePreferencias):
 * o banco não aceita escrita anônima, e assim continua.
 * Junta estufa (a reprodução) e treino (o resumo de cada gravação).
 */
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { List, ListItem } from '@astryxdesign/core/List'
import { Button } from '@astryxdesign/core/Button'
import { CheckIcon } from '@heroicons/react/24/outline'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { CardAlface } from '@/modules/alface'
import { useEstufaAtual, useEstufas, usePassoAtual, useRelogio, type Estufa } from '@/modules/estufa'
import { useGravacoes, type ResumoGravacao } from '@/modules/treino'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { formatarNumero } from '@/shared/lib/formatar'
import { usePreferencias } from '@/shared/stores/preferencias'
import { rotuloVelocidade, VELOCIDADES_REPRODUCAO } from './velocidades'

type Linha = { id: string; estufa: Estufa; resumo: ResumoGravacao | undefined }

export function PaginaVitrine() {
  const estufas = useEstufas()
  const gravacoes = useGravacoes()
  const esboco = useAtraso(!estufas.data)
  if (!estufas.data) return esboco ? <Skeleton height={520} radius={3} /> : null
  const linhas = estufas.data.map((e) => ({ id: e.id, estufa: e, resumo: gravacoes.data?.find((g) => g.id === e.id) }))
  return <Vitrine linhas={linhas} />
}

function Vitrine({ linhas }: { linhas: Linha[] }) {
  const atual = useEstufaAtual()
  const { estufaId, escolherEstufa, trocarVelocidade } = usePreferencias()
  const { estado, controle } = useRelogio()
  const numero = (v: number | undefined, casas = 0, unidade = '') =>
    v === undefined ? '—' : `${formatarNumero(v, casas)}${unidade}`

  return (
    <VStack gap={5} paddingBlock={6}>
      <VStack gap={1}>
        <Heading level={1}>Vitrine do produtor</Heading>
        <Text color="secondary">
          A gravação que o modo Produtor mostra (Agora, Histórico, Ciclo, Dinheiro e o Visor), tocada do dia 0 ao fim e
          de novo. Fica salvo neste navegador.
        </Text>
      </VStack>

      <Card>
        <VStack gap={3}>
          <HStack justify="between" align="center" wrap="wrap" gap={2}>
            <Heading level={2}>Gravação</Heading>
            <Text type="supporting" color="secondary">
              {estufaId ? 'escolhida por você' : 'padrão: o campeão mais recente'}
            </Text>
          </HStack>
          <List edge="flush" hasDividers>
            {linhas.map((l) => {
              const r = l.resumo?.resumo
              return (
                <ListItem
                  key={l.id}
                  label={l.estufa.nome}
                  description={
                    r
                      ? `${numero(r.massaPorPe, 0, ' g')} por pé · ${numero(r.foraDaFaixa * 100, 1, '%')} fora da faixa · ${numero(r.energiaKwh, 0, ' kWh')} · nota R$ ${numero(r.nota)}`
                      : 'sem resumo do ciclo'
                  }
                  isSelected={l.id === atual?.id}
                  endContent={l.id === atual?.id ? <CheckIcon width={18} aria-hidden /> : undefined}
                  onClick={() => escolherEstufa(l.id)}
                />
              )
            })}
          </List>
          {estufaId && (
            <Button
              label="Voltar ao padrão (campeão mais recente)"
              variant="ghost"
              onClick={() => escolherEstufa(null)}
            />
          )}
          <Text type="supporting" color="secondary">
            Números do ciclo inteiro de cada gravação, todas no mesmo clima.
          </Text>
        </VStack>
      </Card>

      <Card>
        <VStack gap={2}>
          <Heading level={2}>Velocidade</Heading>
          <SegmentedControl
            label="Velocidade da reprodução"
            value={String(estado?.velocidade ?? '')}
            onChange={(v) => {
              trocarVelocidade(Number(v))
              controle?.acelerar(Number(v))
            }}
          >
            {VELOCIDADES_REPRODUCAO.map((v) => (
              <SegmentedControlItem key={v} value={String(v)} label={rotuloVelocidade(v)} />
            ))}
          </SegmentedControl>
          <Text type="supporting" color="secondary">
            O ciclo de 35 dias leva {duracaoDoCiclo(estado?.velocidade ?? VELOCIDADES_REPRODUCAO[1])} nesta velocidade.
          </Text>
        </VStack>
      </Card>

      {atual && <OQueOProdutorVe estufa={atual} />}
    </VStack>
  )
}

function OQueOProdutorVe({ estufa }: { estufa: Estufa }) {
  const passo = usePassoAtual(estufa.id)
  if (!passo) return <Skeleton height={240} radius={3} />
  return (
    <VStack gap={2}>
      <Heading level={2}>O que o produtor vê agora</Heading>
      <CardAlface estufa={estufa} leitura={passo.leitura} deitado />
    </VStack>
  )
}

/** 5040 passos / passos por segundo, em minutos ou horas */
function duracaoDoCiclo(passosPorSegundo: number): string {
  const segundos = 5040 / passosPorSegundo
  return segundos >= 3600 ? `${formatarNumero(segundos / 3600, 1)} h` : `${Math.round(segundos / 60)} min`
}
