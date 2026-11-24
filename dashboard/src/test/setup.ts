import '@testing-library/jest-dom/vitest'

// O jsdom (navegador de mentira dos testes) não tem matchMedia; o useTelaLarga precisa
if (!window.matchMedia) {
  window.matchMedia = (consulta: string) =>
    ({
      matches: false,
      media: consulta,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList
}
