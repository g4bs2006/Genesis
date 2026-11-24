/**
 * Raiz de composição: o ÚNICO lugar que sabe de onde vêm os dados.
 *
 * As telas pedem dados a "portas" (interfaces, em application/ de cada módulo)
 * e nunca sabem se quem responde é o simulador, o treino ou a estufa real.
 * Aqui se escolhe o "adaptador" (a peça que implementa a porta):
 *
 *   npm run demo  -> dadosExemplo (JSON fixo e coerente; também nos testes e2e)
 *   npm run dev   -> simuladorBrinquedo (estufa de brinquedo num Web Worker)
 *   depois        -> estufa real por MQTT (backend)
 *
 * O treino e as gravações vêm do Supabase (o treino de verdade, rodando no PC)
 * quando as duas variáveis VITE_SUPABASE_* existem (no Vercel e no
 * dashboard/.env.local). Sem elas, ou no modo demo, vêm dos dados de exemplo,
 * com o selo "dados de exemplo" na tela.
 */
import { createClient } from '@supabase/supabase-js'
import { criarFonteEstufaExemplo, criarSimuladorBrinquedo } from '@/modules/estufa'
import { criarFonteGravacoesExemplo, criarFonteTreinoExemplo, criarFonteTreinoSupabase } from '@/modules/treino'
import { criarRepositorioPrecosLocal } from '@/modules/dinheiro'

const demo = import.meta.env.MODE === 'demo'

// As variáveis VITE_* entram no código na hora do build (o Vite troca o texto).
// A chave "publishable" é pública de propósito: quem protege os dados é a RLS
// no banco (só lê; escrever exige a conta do treino).
const urlSupabase = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chaveSupabase = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
const treinoNaNuvem = !demo && !!urlSupabase && !!chaveSupabase

const treinoSupabase = treinoNaNuvem
  ? criarFonteTreinoSupabase(
      createClient(urlSupabase!, chaveSupabase!, {
        // as tabelas do Gênesis moram no schema "genesis", não no "public"
        db: { schema: 'genesis' },
        // o dashboard não faz login: não precisa guardar sessão
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    )
  : null

export const origemTreino: 'exemplo' | 'nuvem' = treinoSupabase ? 'nuvem' : 'exemplo'

export const origemDosDados: 'exemplo' | 'simulada' = demo ? 'exemplo' : 'simulada'

const simulador = demo ? null : criarSimuladorBrinquedo()

export const dependencias = {
  fonteEstufa: demo ? criarFonteEstufaExemplo() : simulador!,
  controleSimulacao: simulador,
  fonteTreino: treinoSupabase ?? criarFonteTreinoExemplo(),
  fonteGravacoes: treinoSupabase ?? criarFonteGravacoesExemplo(),
  origemTreino,
  repositorioPrecos: criarRepositorioPrecosLocal(),
}
