/**
 * Módulo glossario: Os textos de "o que é isso?" (VPD, EC, elitismo...) usados em toda a interface.
 *
 * API pública do módulo: o resto do app só importa daqui (ou de ./dominio).
 * Camadas (docs/decisoes/0001-arquitetura.md do Tesserato):
 *   domain/          tipos e regras puras (Zod, contas). Sem React.
 *   application/     portas (interfaces) e casos de uso
 *   infrastructure/  adaptadores que implementam as portas (dados de exemplo, simulador...)
 *   presentation/    páginas, componentes e hooks
 * As pastas nascem quando a primeira peça delas chega.
 */
export {}
