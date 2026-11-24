/**
 * Módulo dinheiro: Preços, custos, receita e lucro projetado (Dinheiro, Agente × regras).
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
export type { RepositorioPrecos } from './application/portas'
export * from './presentation/dados'
export { LucroPrevisto } from './presentation/LucroPrevisto'
// Adaptadores (só app/dependencias.ts deve usar)
export { criarRepositorioPrecosLocal, PRECOS_PADRAO } from './infrastructure/precosLocal'
