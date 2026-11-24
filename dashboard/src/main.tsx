import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fontes servidas pelo próprio app (funciona offline, no PWA)
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
// Estilos prontos do Astryx: sem eles os componentes aparecem sem estilo
import '@astryxdesign/core/reset.css'
import '@astryxdesign/core/astryx.css'
// Tema Genesis compilado (fonte: tema/genesisTheme.ts; regerar com npm run tema)
import '@/shared/design-system/tema/genesis.css'
import '@/shared/design-system/tema/base.css'
import { App } from '@/app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
