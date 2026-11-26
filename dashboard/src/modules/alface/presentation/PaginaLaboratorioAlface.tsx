import { useState } from 'react'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { Slider } from '@astryxdesign/core/Slider'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { escolherDesenho, type NomeDesenho, type ParametrosAlface } from '../domain/escolherDesenho'
import { AlfaceImagem } from './AlfaceImagem'
import { DESENHOS } from './desenhos'

const LEGENDA: Record<NomeDesenho, string> = {
  'dia-05': 'Dia 5 · muda',
  'dia-12': 'Dia 12',
  'dia-20': 'Dia 20',
  'dia-28': 'Dia 28',
  'dia-35': 'Dia 35 · colheita',
  murcha: 'Murcha · calor ou ar seco',
  amarelando: 'Amarelando · falta de nutriente',
  queimada: 'Bordas queimadas · pH fora',
}

/**
 * Laboratório da alface (/laboratorio/alface): mexer no estado da planta e ver
 * qual desenho a tela escolhe, mais a galeria de todos os desenhos.
 */
export function PaginaLaboratorioAlface() {
  const [p, setP] = useState<ParametrosAlface>({ massa: 182, turgor: 1, clorose: 0, necrose: 0 })
  const muda = (campo: keyof ParametrosAlface) => (v: number) => setP((a) => ({ ...a, [campo]: v }))
  const pct = (v: number) => `${Math.round(v * 100)}%`
  const nome = escolherDesenho(p)

  return (
    <VStack gap={6} paddingBlock={6}>
      <VStack gap={1}>
        <Heading level={1}>Laboratório da alface</Heading>
        <Text color="secondary">
          Desenhos gerados por IA (scripts/gerar-alfaces-ia.mjs), no mesmo traço. A massa escolhe o estágio; na planta
          crescida, o pior estresse escolhe o estado.
        </Text>
      </VStack>

      <Grid columns={{ minWidth: 300, repeat: 'fit' }} gap={6} align="center">
        <Card>
          <AlfaceImagem parametros={p} rotulo={LEGENDA[nome]} largura={360} />
          <Text type="supporting" color="secondary">
            Mostrando: {LEGENDA[nome]}
          </Text>
        </Card>
        <VStack gap={4}>
          <Slider
            label="Massa por pé"
            min={0}
            max={260}
            value={p.massa}
            onChange={muda('massa')}
            formatValue={(v) => `${v} g`}
            valueDisplay="text"
          />
          <Slider
            label="Turgor (firmeza da folha)"
            min={0}
            max={1}
            step={0.05}
            value={p.turgor}
            onChange={muda('turgor')}
            formatValue={pct}
            valueDisplay="text"
          />
          <Slider
            label="Clorose (amarelamento)"
            min={0}
            max={1}
            step={0.05}
            value={p.clorose}
            onChange={muda('clorose')}
            formatValue={pct}
            valueDisplay="text"
          />
          <Slider
            label="Necrose (bordas queimadas)"
            min={0}
            max={1}
            step={0.05}
            value={p.necrose}
            onChange={muda('necrose')}
            formatValue={pct}
            valueDisplay="text"
          />
        </VStack>
      </Grid>

      <VStack gap={3}>
        <Heading level={2}>Todos os desenhos</Heading>
        <Grid columns={{ minWidth: 160, repeat: 'fit' }} gap={3}>
          {(Object.keys(DESENHOS) as NomeDesenho[]).map((n) => (
            <Card key={n} padding={2}>
              <img src={DESENHOS[n]} alt={LEGENDA[n]} style={{ width: '100%', aspectRatio: 1, objectFit: 'contain' }} />
              <Text type="supporting" color="secondary">
                {LEGENDA[n]}
              </Text>
            </Card>
          ))}
        </Grid>
      </VStack>
    </VStack>
  )
}
