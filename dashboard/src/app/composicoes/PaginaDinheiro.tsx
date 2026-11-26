/**
 * Dinheiro (Produtor), repaginado no passo 11. A pergunta do Gabriel: o que o
 * pequeno produtor faz hoje em planilha que o app pode fazer por ele? A
 * pesquisa (página do passo) mostrou: a conta do ciclo (quanto entra, quanto
 * sai, cada gasto numa linha), o ponto de equilíbrio e o caderno de entradas e
 * saídas. Esta página é isso, de cima para baixo, e cada número diz de onde veio.
 * Junta estufa (o consumo medido) e dinheiro (preços e lançamentos).
 */
import { useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { List, ListItem } from '@astryxdesign/core/List'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Table } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { PencilSquareIcon } from '@heroicons/react/24/outline'
import {
  CATEGORIAS_GASTO,
  contaDoCiclo,
  FormularioPrecos,
  formatarReais,
  formatarReaisCurto,
  MASSA_COMERCIAL_G,
  NOME_CATEGORIA,
  totaisDosLancamentos,
  useLancamentos,
  usePrecos,
  type Categoria,
  type ContaDoCiclo,
  type Precos,
} from '@/modules/dinheiro'
import { useEstufaAtual, useResumoCiclo, type Estufa, type ResumoCiclo } from '@/modules/estufa'
import { useAtraso } from '@/shared/hooks/useAtraso'
import { useTelaLarga } from '@/shared/hooks/useTelaLarga'
import { formatarNumero } from '@/shared/lib/formatar'
import { ControleReproducao } from './ControleReproducao'
import { Lancamentos } from './Lancamentos'

export function PaginaDinheiro() {
  const estufa = useEstufaAtual()
  const resumo = useResumoCiclo(estufa?.id ?? '')
  const precos = usePrecos()
  const [editando, setEditando] = useState(false)
  const pronto = estufa && resumo.data && precos.data
  const esboco = useAtraso(!pronto)
  return (
    <>
      {pronto ? (
        <Dinheiro estufa={estufa} resumo={resumo.data} precos={precos.data} aoEditar={() => setEditando(true)} />
      ) : (
        esboco && <Skeleton height={560} radius={3} />
      )}
      <FormularioPrecos aberto={editando} aoMudar={setEditando} />
    </>
  )
}

type Linha = { id: string; item: string; conta: string; origem: string; valor: string; forte?: boolean }

function Dinheiro({
  estufa,
  resumo,
  precos,
  aoEditar,
}: {
  estufa: Estufa
  resumo: ResumoCiclo
  precos: Precos
  aoEditar: () => void
}) {
  const c = contaDoCiclo(resumo, estufa.plantas, precos)
  const largo = useTelaLarga()
  return (
    <VStack gap={5} paddingBlock={6}>
      <HStack justify="between" align="end" wrap="wrap" gap={3}>
        <VStack gap={1}>
          <ControleReproducao />
          <Heading level={1}>Dinheiro</Heading>
          <Text color="secondary">
            A conta de um ciclo de {estufa.diasDoCiclo} dias, com {formatarNumero(estufa.plantas)} pés.
          </Text>
        </VStack>
        <Button label="Editar preços" icon={<PencilSquareIcon width={16} aria-hidden />} onClick={aoEditar} />
      </HStack>

      <Grid columns={{ minWidth: 300, repeat: 'fit' }} gap={4}>
        <Sobra conta={c} />
        <Equilibrio conta={c} />
      </Grid>

      <Card>
        <VStack gap={3}>
          <Heading level={2}>A conta do ciclo</Heading>
          {largo ? (
            <Table<Linha>
              data={linhasDaConta(c, precos)}
              idKey="id"
              density="compact"
              columns={[
                {
                  key: 'item',
                  header: 'Item',
                  renderCell: (l) => <Text weight={l.forte ? 'medium' : 'normal'}>{l.item}</Text>,
                },
                { key: 'conta', header: 'Conta', renderCell: (l) => <Text hasTabularNumbers>{l.conta}</Text> },
                {
                  key: 'origem',
                  header: 'De onde veio',
                  renderCell: (l) => (
                    <Text type="supporting" color="secondary">
                      {l.origem}
                    </Text>
                  ),
                },
                {
                  key: 'valor',
                  header: 'Valor',
                  align: 'end',
                  renderCell: (l) => (
                    <Text hasTabularNumbers weight={l.forte ? 'medium' : 'normal'}>
                      {l.valor}
                    </Text>
                  ),
                },
              ]}
            />
          ) : (
            <LinhasCelular
              linhas={linhasDaConta(c, precos).map((l) => ({
                id: l.id,
                item: l.item,
                valor: l.valor,
                detalhe: [l.conta, l.origem].filter(Boolean).join(' · '),
                forte: l.forte,
              }))}
            />
          )}
        </VStack>
      </Card>

      <PrevistoReal conta={c} />
      <Lancamentos />
    </VStack>
  )
}

const kg = (g: number) => formatarNumero(g / 1000, 1)

/** As linhas da planilha, de cima para baixo. Cada uma: a conta e de onde veio cada número. */
function linhasDaConta(c: ContaDoCiclo, p: Precos): Linha[] {
  const gravado = 'medido no ciclo gravado'
  const seu = 'seu preço (Editar preços)'
  return [
    {
      id: 'pes',
      item: 'Pés plantados',
      conta: formatarNumero(c.plantas),
      origem: 'o tamanho da estufa no simulador',
      valor: '',
    },
    {
      id: 'peso',
      item: 'Peso na colheita',
      conta: `${formatarNumero(c.massaPorPe)} g por pé · ${kg(c.massaPorPe * c.plantas)} kg no total`,
      origem: gravado,
      valor: '',
    },
    {
      id: 'preco',
      item: 'Preço por pé',
      conta: `${formatarReais(p.alfacePorPe)} o pé de ${MASSA_COMERCIAL_G} g × ${formatarNumero(c.fator, 2)} pelo peso = ${formatarReais(c.precoDoPe)}`,
      origem: `${seu}; pé maior vale até 10% a mais, abaixo de 120 g não vende`,
      valor: '',
    },
    {
      id: 'venda',
      item: 'Entra (venda)',
      conta: `${formatarNumero(c.plantas)} pés × ${formatarReais(c.precoDoPe)}`,
      origem: 'supõe que todos os pés são vendidos',
      valor: formatarReais(c.venda),
      forte: true,
    },
    {
      id: 'energia',
      item: NOME_CATEGORIA.energia,
      conta: `${formatarNumero(c.energiaKwh)} kWh × ${formatarReais(p.tarifaKwh)}`,
      origem: `kWh ${gravado} (exaustor, névoa e luz); tarifa: ${seu}`,
      valor: `− ${formatarReais(c.gastos.energia)}`,
    },
    {
      id: 'agua',
      item: NOME_CATEGORIA.agua,
      conta: `${formatarNumero(c.aguaL)} L × ${formatarReais(p.aguaPorM3)} por m³`,
      origem: `litros da névoa ${gravado}; tarifa: ${seu}`,
      valor: `− ${formatarReais(c.gastos.agua)}`,
    },
    {
      id: 'adubo',
      item: NOME_CATEGORIA.adubo,
      conta: 'o seu gasto no ciclo',
      origem: p.aduboPorCiclo ? seu : 'informe em Editar preços (a simulação ainda não dosa adubo)',
      valor: `− ${formatarReais(c.gastos.adubo)}`,
    },
    {
      id: 'mudas',
      item: NOME_CATEGORIA.mudas,
      conta: `${formatarNumero(c.plantas)} × ${formatarReais(p.mudaPorUnidade)}`,
      origem: seu,
      valor: `− ${formatarReais(c.gastos.mudas)}`,
    },
    {
      id: 'embalagem',
      item: NOME_CATEGORIA.embalagem,
      conta: `${formatarNumero(c.plantas)} × ${formatarReais(p.embalagemPorPe)}`,
      origem: p.embalagemPorPe ? seu : 'informe em Editar preços, se usar',
      valor: `− ${formatarReais(c.gastos.embalagem)}`,
    },
    {
      id: 'outros',
      item: NOME_CATEGORIA.outros,
      conta: 'por ciclo',
      origem: `${seu}: seu trabalho e a estrutura divididos por ciclo`,
      valor: `− ${formatarReais(c.gastos.outros)}`,
    },
    {
      id: 'gastos',
      item: 'Sai (gastos)',
      conta: 'a soma das linhas acima',
      origem: '',
      valor: `− ${formatarReais(c.totalGastos)}`,
      forte: true,
    },
    {
      id: 'sobra',
      item: c.sobra >= 0 ? 'Sobra' : 'Falta',
      conta: 'entra − sai',
      origem: '',
      valor: formatarReais(c.sobra),
      forte: true,
    },
  ]
}

function Sobra({ conta: c }: { conta: ContaDoCiclo }) {
  return (
    <Card>
      <VStack gap={1}>
        <Text type="label" color="secondary">
          {c.sobra >= 0 ? 'Sobra no ciclo (previsto)' : 'Prejuízo no ciclo (previsto)'}
        </Text>
        <Text size="3xl" weight="medium" hasTabularNumbers>
          {formatarReaisCurto(c.sobra)}
        </Text>
        <Text type="supporting" color="secondary" hasTabularNumbers>
          entra {formatarReaisCurto(c.venda)} da venda, sai {formatarReaisCurto(c.totalGastos)} de gastos
        </Text>
      </VStack>
    </Card>
  )
}

/** O ponto de equilíbrio numa frase, com a conta embaixo. */
function Equilibrio({ conta: c }: { conta: ContaDoCiclo }) {
  return (
    <Card>
      <VStack gap={1}>
        <Text type="label" color="secondary">
          Ponto de equilíbrio
        </Text>
        <Text size="xl" weight="medium">
          {Number.isFinite(c.precoMinimoPorPe)
            ? `Abaixo de ${formatarReais(c.precoMinimoPorPe)} o pé, você perde dinheiro.`
            : 'Com este peso, a alface não chega ao tamanho de venda.'}
        </Text>
        <Text type="supporting" color="secondary" hasTabularNumbers>
          {Number.isFinite(c.precoMinimoPorPe)
            ? `gastos de ${formatarReais(c.totalGastos)} ÷ ${formatarNumero(c.plantas)} pés ÷ ${formatarNumero(c.fator, 2)} pelo peso (preço do pé de ${MASSA_COMERCIAL_G} g)`
            : 'abaixo de 120 g por pé não se vende'}
        </Text>
      </VStack>
    </Card>
  )
}

type LinhaComparacao = { id: Categoria | 'sobra'; item: string; previsto: number; real: number }

/** O previsto do ciclo lado a lado com o que o produtor lançou de verdade. */
function PrevistoReal({ conta: c }: { conta: ContaDoCiclo }) {
  const largo = useTelaLarga()
  const lancamentos = useLancamentos()
  const t = totaisDosLancamentos(lancamentos.data ?? [])
  const linhas: LinhaComparacao[] = [
    { id: 'venda', item: NOME_CATEGORIA.venda, previsto: c.venda, real: t.venda },
    ...CATEGORIAS_GASTO.map((k) => ({ id: k, item: NOME_CATEGORIA[k], previsto: c.gastos[k], real: t[k] })),
    { id: 'sobra', item: 'Sobra', previsto: c.sobra, real: t.sobra },
  ]
  return (
    <Card>
      <VStack gap={3}>
        <VStack gap={0.5}>
          <Heading level={2}>Previsto × real</Heading>
          <Text type="supporting" color="secondary">
            Previsto: a conta acima. Real: a soma dos seus lançamentos, logo abaixo.
          </Text>
        </VStack>
        {largo ? (
          <Table<LinhaComparacao>
            data={linhas}
            idKey="id"
            density="compact"
            columns={[
              {
                key: 'item',
                header: 'Item',
                renderCell: (l) => <Text weight={l.id === 'sobra' ? 'medium' : 'normal'}>{l.item}</Text>,
              },
              { key: 'previsto', header: 'Previsto', align: 'end', renderCell: (l) => formatarReais(l.previsto) },
              { key: 'real', header: 'Real', align: 'end', renderCell: (l) => formatarReais(l.real) },
              {
                key: 'diferenca',
                header: 'Real − previsto',
                align: 'end',
                renderCell: (l) => {
                  const d = l.real - l.previsto
                  return `${d > 0 ? '+' : d < 0 ? '−' : ''}${formatarReais(Math.abs(d))}`
                },
              },
            ]}
          />
        ) : (
          <LinhasCelular
            linhas={linhas.map((l) => ({
              id: l.id,
              item: l.item,
              valor: `real ${formatarReais(l.real)}`,
              detalhe: `previsto ${formatarReais(l.previsto)}`,
              forte: l.id === 'sobra',
            }))}
          />
        )}
      </VStack>
    </Card>
  )
}

/** No celular, cada linha da conta vira item e valor na mesma linha, e a conta e a origem embaixo. */
function LinhasCelular({
  linhas,
}: {
  linhas: { id: string; item: string; valor: string; detalhe: string; forte?: boolean }[]
}) {
  return (
    <List hasDividers density="compact" edge="flush">
      {linhas.map((l) => (
        <ListItem
          key={l.id}
          label={<Text weight={l.forte ? 'medium' : 'normal'}>{l.item}</Text>}
          description={
            l.detalhe ? (
              <Text type="supporting" color="secondary">
                {l.detalhe}
              </Text>
            ) : undefined
          }
          endContent={
            <Text hasTabularNumbers weight={l.forte ? 'medium' : 'normal'} textWrap="nowrap">
              {l.valor}
            </Text>
          }
        />
      ))}
    </List>
  )
}
