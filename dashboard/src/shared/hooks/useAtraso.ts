import { useEffect, useState } from 'react'

/**
 * Fica `true` só depois de `ms` milissegundos com `ativo` ligado.
 * Uso: mostrar o skeleton (o "esboço cinza" do que vai carregar) apenas se a
 * espera for longa. Carregamento de 80ms não deve piscar um esboço na tela.
 */
export function useAtraso(ativo: boolean, ms = 150): boolean {
  const [passou, setPassou] = useState(false)
  useEffect(() => {
    if (!ativo) return
    const t = setTimeout(() => setPassou(true), ms)
    // ao desligar, zera para a próxima espera começar do zero
    return () => {
      clearTimeout(t)
      setPassou(false)
    }
  }, [ativo, ms])
  return ativo && passou
}
