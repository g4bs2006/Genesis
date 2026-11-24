import { useState } from 'react'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { Slider } from '@astryxdesign/core/Slider'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { massaEsperada } from '@/modules/estufa/dominio'
import type { ParametrosAlface } from '../domain/gerarAlface'
import { AlfaceSvg } from './AlfaceSvg'

const ESTAGIOS = [5, 12, 20, 28, 35]
const ESTADOS: { nome: string; causa: string; p: Omit<ParametrosAlface, 'massa'> }[] = [
  { nome: 'Saudável', causa: 'tudo na faixa', p: { turgor: 1, clorose: 0, necrose: 0 } },
  { nome: 'Murcha', causa: 'calor ou ar seco (VPD alto)', p: { turgor: 0.25, clorose: 0, necrose: 0 } },
  { nome: 'Amarelando', causa: 'falta de nutriente (EC baixa)', p: { turgor: 0.9, clorose: 0.75, necrose: 0 } },
  { nome: 'Bordas queimadas', causa: 'pH fora ou solução parada', p: { turgor: 0.85, clorose: 0.1, necrose: 0.75 } },
]

/**
 * Laboratório da alface (/laboratorio/alface): mexer em cada parâmetro e ver a
 * planta responder, mais a grade de estágios e de estados. É a bancada para
 * aprovar o desenho antes de ele entrar nas telas.
 */
export function PaginaLaboratorioAlface() {
  const [p, setP] = useState<ParametrosAlface>({ massa: 182, turgor: 1, clorose: 0, necrose: 0 })
  const [semente, setSemente] = useState(1)
  const muda = (campo: keyof ParametrosAlface) => (v: number) => setP((a) => ({ ...a, [campo]: v }))
  const pct = (v: number) => `${Math.round(v * 100)}%`

  return (
    <VStack gap={6} paddingBlock={6}>
      <VStack gap={1}>
        <Heading level={1}>Laboratório da alface</Heading>
        <Text color="secondary">
          A alface é desenhada a partir do estado da planta: a massa dá o tamanho e o número de folhas; o turgor, a
          postura; a clorose e a necrose, a cor.
        </Text>
      </VStack>

      <Grid columns={{ minWidth: 300 }} gap={6} align="center">
        <Card>
          <AlfaceSvg parametros={p} semente={semente} rotulo={`Alface de ${Math.round(p.massa)} g`} />
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
            step={0.01}
            value={p.turgor}
            onChange={muda('turgor')}
            formatValue={pct}
            valueDisplay="text"
          />
          <Slider
            label="Clorose (amarelamento)"
            min={0}
            max={1}
            step={0.01}
            value={p.clorose}
            onChange={muda('clorose')}
            formatValue={pct}
            valueDisplay="text"
          />
          <Slider
            label="Necrose (bordas queimadas)"
            min={0}
            max={1}
            step={0.01}
            value={p.necrose}
            onChange={muda('necrose')}
            formatValue={pct}
            valueDisplay="text"
          />
          <Slider
            label="Semente (outra planta)"
            min={1}
            max={30}
            value={semente}
            onChange={setSemente}
            valueDisplay="text"
          />
        </VStack>
      </Grid>

      <VStack gap={3}>
        <Heading level={2}>Estágios</Heading>
        <Grid columns={{ minWidth: 140 }} gap={3}>
          {ESTAGIOS.map((dia) => (
            <Card key={dia} padding={2}>
              <AlfaceSvg
                parametros={{ massa: massaEsperada(dia), turgor: 1, clorose: 0, necrose: 0 }}
                semente={semente}
                rotulo={`Dia ${dia}`}
              />
              <Text type="supporting" color="secondary" hasTabularNumbers>
                Dia {dia} · {Math.round(massaEsperada(dia))} g
              </Text>
            </Card>
          ))}
        </Grid>
      </VStack>

      <VStack gap={3}>
        <Heading level={2}>Estados</Heading>
        <Grid columns={{ minWidth: 180 }} gap={3}>
          {ESTADOS.map((e) => (
            <Card key={e.nome} padding={2}>
              <AlfaceSvg parametros={{ massa: 182, ...e.p }} semente={semente} rotulo={e.nome} />
              <Text weight="medium">{e.nome}</Text>
              <Text type="supporting" color="secondary">
                {e.causa}
              </Text>
            </Card>
          ))}
        </Grid>
      </VStack>
    </VStack>
  )
}
