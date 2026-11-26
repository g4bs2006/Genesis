/**
 * Lançamentos reais (passo 11): o caderno de entradas e saídas do produtor.
 * Cada venda e cada gasto numa linha, salvos neste navegador (ainda não há
 * login), com exportação para planilha (CSV).
 */
import { useState, type ComponentProps } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { DateInput } from '@astryxdesign/core/DateInput'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { NumberInput } from '@astryxdesign/core/NumberInput'
import { Selector } from '@astryxdesign/core/Selector'
import { Table } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline'
import {
  CATEGORIAS_GASTO,
  formatarReais,
  Lancamento,
  lancamentosParaCsv,
  NOME_CATEGORIA,
  useLancamentos,
  useMudarLancamentos,
  type Categoria,
} from '@/modules/dinheiro'
import { formatarData } from '@/shared/lib/formatar'

type Data = ComponentProps<typeof DateInput>['value']
// AAAA-MM-DD no fuso do aparelho (o sueco escreve a data assim)
const hoje = () => new Date().toLocaleDateString('sv-SE') as NonNullable<Data>

export function Lancamentos() {
  const lista = useLancamentos()
  const { adicionar, remover } = useMudarLancamentos()
  const [data, setData] = useState(hoje)
  const [categoria, setCategoria] = useState<Categoria>('venda')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState(0)
  const novo = Lancamento.safeParse({ id: crypto.randomUUID(), data, categoria, descricao, valor })

  const baixarCsv = () => {
    // Blob: um "arquivo" criado na memória do navegador, baixado pelo link
    const blob = new Blob(['﻿' + lancamentosParaCsv(lista.data ?? [])], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'genesis-lancamentos.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const ordenados = [...(lista.data ?? [])].sort((a, b) => b.data.localeCompare(a.data))

  return (
    <Card>
      <VStack gap={3}>
        <HStack justify="between" align="center" wrap="wrap" gap={2}>
          <VStack gap={0.5}>
            <Heading level={2}>Lançamentos</Heading>
            <Text type="supporting" color="secondary">
              O que você vendeu e gastou de verdade. Fica salvo neste navegador.
            </Text>
          </VStack>
          <Button
            label="Exportar CSV"
            icon={<ArrowDownTrayIcon width={16} aria-hidden />}
            onClick={baixarCsv}
            isDisabled={ordenados.length === 0}
          />
        </HStack>

        <Grid columns={{ minWidth: 170, repeat: 'fit' }} gap={3} align="end">
          <DateInput label="Data" value={data} onChange={(v) => v && setData(v)} />
          <Selector
            label="O quê"
            value={categoria}
            onChange={(v) => v && setCategoria(v as Categoria)}
            options={[
              { type: 'section', title: 'Entrada', options: [{ value: 'venda', label: NOME_CATEGORIA.venda }] },
              {
                type: 'section',
                title: 'Saída',
                options: CATEGORIAS_GASTO.map((c) => ({ value: c, label: NOME_CATEGORIA[c] })),
              },
            ]}
          />
          <TextInput label="Detalhe" value={descricao} onChange={setDescricao} placeholder="ex.: feira de sábado" />
          <NumberInput
            label="Valor"
            value={valor}
            min={0}
            step={0.01}
            units="R$"
            onChange={(v) => setValor(Number.isFinite(v) ? Math.max(0, v) : 0)}
          />
          <Button
            label="Lançar"
            variant="primary"
            isDisabled={!novo.success}
            clickAction={async () => {
              if (!novo.success) return
              await adicionar.mutateAsync(novo.data)
              setDescricao('')
              setValor(0)
            }}
          />
        </Grid>

        {ordenados.length === 0 ? (
          <Text color="secondary">Nenhum lançamento ainda.</Text>
        ) : (
          <Table<Lancamento>
            data={ordenados}
            idKey="id"
            density="compact"
            columns={[
              { key: 'data', header: 'Data', renderCell: (l) => formatarData(`${l.data}T12:00:00-03:00`) },
              { key: 'categoria', header: 'O quê', renderCell: (l) => NOME_CATEGORIA[l.categoria] },
              { key: 'descricao', header: 'Detalhe', renderCell: (l) => l.descricao },
              {
                key: 'valor',
                header: 'Valor',
                align: 'end',
                renderCell: (l) => `${l.categoria === 'venda' ? '+' : '−'} ${formatarReais(l.valor)}`,
              },
              {
                key: 'apagar',
                header: '',
                align: 'end',
                renderCell: (l) => (
                  <Button
                    label={`Apagar o lançamento de ${formatarReais(l.valor)}`}
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    icon={<TrashIcon width={16} aria-hidden />}
                    onClick={() => remover.mutate(l.id)}
                  />
                ),
              },
            ]}
          />
        )}
      </VStack>
    </Card>
  )
}
