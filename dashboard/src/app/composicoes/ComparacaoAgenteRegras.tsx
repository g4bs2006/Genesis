import { Skeleton } from '@astryxdesign/core/Skeleton'
import { proportional, Table } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { formatarReaisCurto, resultadoDoCiclo, usePrecos, vantagemDoAgente } from '@/modules/dinheiro'
import { useEstufaAtual, useEstufas, useResumoCiclo, type ResumoCiclo } from '@/modules/estufa'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { formatarNumero } from '@/shared/lib/formatar'
import { OQueEIsso } from '@/modules/glossario'

type Linha = { id: string; metrica: string; agente: string; regras: string; diferenca: string; melhor: boolean }

/**
 * A mesma estufa e o mesmo clima, controlados pelo agente e pelas regras fixas.
 * O número que vende o projeto: quanto o agente rende a mais por ciclo.
 */
export function ComparacaoAgenteRegras() {
  const estufas = useEstufas()
  const atual = useEstufaAtual()
  const agente =
    atual?.controlador.tipo === 'agente' ? atual : estufas.data?.find((e) => e.controlador.tipo === 'agente')
  const regras = estufas.data?.find((e) => e.controlador.tipo === 'regras')
  const ra = useResumoCiclo(agente?.id ?? '')
  const rr = useResumoCiclo(regras?.id ?? '')
  const precos = usePrecos()
  const pronto = agente && regras && ra.data && rr.data && precos.data
  const esboco = useAtraso(!pronto)

  if (estufas.data && (!agente || !regras))
    return <Text color="secondary">Para comparar, é preciso uma estufa com o agente e outra com as regras fixas.</Text>
  // reserva a altura mesmo antes do esboço aparecer: nada embaixo é empurrado
  if (!pronto)
    return (
      <span style={{ display: 'block', visibility: esboco ? 'visible' : 'hidden' }}>
        <Skeleton height={320} radius={3} />
      </span>
    )

  const plantas = agente.plantas
  const resultado = (r: ResumoCiclo) => resultadoDoCiclo(r, plantas, precos.data, 'medio').lucro
  const ganho = vantagemDoAgente(ra.data, rr.data, plantas, precos.data, 'medio')
  const linhas: Linha[] = [
    linha(
      'massa',
      'Massa por pé na colheita',
      ra.data.massaPorPe,
      rr.data.massaPorPe,
      (v) => `${formatarNumero(v)} g`,
      true,
    ),
    linha(
      'energia',
      'Energia no ciclo',
      ra.data.energiaKwh,
      rr.data.energiaKwh,
      (v) => `${formatarNumero(v)} kWh`,
      false,
    ),
    linha(
      'agua',
      'Água no ciclo',
      ra.data.aguaL / 1000,
      rr.data.aguaL / 1000,
      (v) => `${formatarNumero(v, 1)} m³`,
      false,
    ),
    linha(
      'fora',
      'Tempo fora da faixa',
      ra.data.foraDaFaixa * 100,
      rr.data.foraDaFaixa * 100,
      (v) => `${formatarNumero(v, 1)}%`,
      false,
    ),
    linha('lucro', 'Resultado do ciclo', resultado(ra.data), resultado(rr.data), formatarReaisCurto, true),
  ]

  return (
    <VStack gap={3}>
      <Text size="xl" weight="medium">
        {ganho >= 0
          ? `O agente rende ${formatarReaisCurto(ganho)} a mais por ciclo.`
          : `As regras fixas rendem ${formatarReaisCurto(-ganho)} a mais por ciclo.`}
      </Text>
      <Table<Linha>
        data={linhas}
        idKey="id"
        density="compact"
        columns={[
          { key: 'metrica', header: 'No mesmo clima', width: proportional(2, { minWidth: 150 }) },
          {
            key: 'agente',
            width: proportional(1, { minWidth: 88 }),
            header: 'Agente',
            align: 'end',
            renderCell: (l) => <Num destaque={l.melhor}>{l.agente}</Num>,
          },
          {
            key: 'regras',
            width: proportional(1, { minWidth: 88 }),
            header: 'Regras fixas',
            align: 'end',
            renderCell: (l) => <Num>{l.regras}</Num>,
          },
          {
            key: 'diferenca',
            width: proportional(1, { minWidth: 88 }),
            header: 'Diferença',
            align: 'end',
            renderCell: (l) => <Num>{l.diferenca}</Num>,
          },
        ]}
      />
      <OQueEIsso id="margem" rotulo={`${agente.nome} contra ${regras.nome} · ${plantas} pés · preço médio da alface`} />
    </VStack>
  )
}

function linha(
  id: string,
  metrica: string,
  a: number,
  r: number,
  fmt: (v: number) => string,
  maiorEhMelhor: boolean,
): Linha {
  const d = a - r
  return {
    id,
    metrica,
    agente: fmt(a),
    regras: fmt(r),
    diferenca: `${d > 0 ? '+' : d < 0 ? '−' : ''}${fmt(Math.abs(d))}`,
    melhor: maiorEhMelhor ? a >= r : a <= r,
  }
}

function Num({ children, destaque }: { children: React.ReactNode; destaque?: boolean }) {
  return (
    <Text hasTabularNumbers weight={destaque ? 'medium' : 'normal'} color={destaque ? 'primary' : 'secondary'}>
      {children}
    </Text>
  )
}
