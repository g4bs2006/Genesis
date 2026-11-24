/**
 * Módulo glossario: os textos de "o que é isso?" (VPD, EC, elitismo...) usados
 * em toda a interface, e a página com todos eles.
 * API pública do módulo: o resto do app só importa daqui (ou de ./dominio).
 */
export * from './dominio'
export { OQueEIsso } from './presentation/OQueEIsso'
export { PaginaGlossario } from './presentation/PaginaGlossario'
