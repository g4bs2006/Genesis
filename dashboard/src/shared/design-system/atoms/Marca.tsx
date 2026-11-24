/** O broto de duas folhas (o mesmo do favicon). Usa a cor do texto em volta. */
export function Broto({ tamanho = 20 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" fill="none" stroke="currentColor" aria-hidden>
      <path d="M16 27.5V15.5" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 18.5C16 12.5 11.5 9 5.5 9c0 6 4 9.5 10.5 9.5Z" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M16 15.5c0-5.5 4-9 10.5-9 0 5.5-4 9-10.5 9Z" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}
