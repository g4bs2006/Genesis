/**
 * Módulo estufa: Leituras, ações do agente, eventos e o estado de cada estufa (Agora, Histórico, Ciclo, Visor, Estufas lado a lado).
 *
 * API pública do módulo: o resto do app só importa daqui (ou de ./dominio).
 * Camadas (docs/decisoes/0001-arquitetura.md do Tesserato):
 *   domain/          tipos e regras puras (Zod, contas). Sem React.
 *   application/     portas (interfaces) e casos de uso
 *   infrastructure/  adaptadores que implementam as portas (dados de exemplo, simulador...)
 *   presentation/    páginas, componentes e hooks
 * As pastas nascem quando a primeira peça delas chega.
 */
export * from './dominio'
export type { FonteEstufa, ControleSimulacao, EstadoRelogio } from './application/portas'
export * from './presentation/dados'
export { ListaEstufasLateral } from './presentation/ListaEstufasLateral'
// Adaptadores (só app/dependencias.ts deve usar)
export { criarFonteEstufaExemplo } from './infrastructure/dadosExemplo'
export { criarSimuladorBrinquedo } from './infrastructure/simuladorBrinquedo'
