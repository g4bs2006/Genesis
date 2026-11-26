/**
 * Raiz de composição: o ÚNICO lugar que sabe de onde vêm os dados.
 *
 * As telas pedem dados a "portas" (interfaces, em application/ de cada módulo)
 * e nunca sabem se quem responde é uma gravação, o treino ou a estufa real.
 * Aqui se escolhe o "adaptador" (a peça que implementa a porta):
 *
 *   treino e gravações -> Supabase (o treino de verdade, rodando no PC) quando
 *                         as duas variáveis VITE_SUPABASE_* existem (no Vercel e
 *                         no dashboard/.env.local); sem elas, ou no modo demo,
 *                         um recorte real de uma execução (dadosExemplo).
 *   estufa             -> a REPRODUÇÃO de uma dessas gravações (passo 10,
 *                         decisão 0007): ainda não há estufa real. Qual gravação
 *                         o Produtor vê, e em que velocidade, o Desenvolvedor
 *                         escolhe na Vitrine (fica no navegador, usePreferencias).
 *   depois             -> estufa real por MQTT (backend)
 */
import { createClient } from '@supabase/supabase-js'
import { criarFonteEstufaReproducao, VELOCIDADE_PADRAO } from '@/modules/estufa'
import { criarFonteGravacoesExemplo, criarFonteTreinoExemplo, criarFonteTreinoSupabase } from '@/modules/treino'
import { criarRepositorioLancamentosLocal, criarRepositorioPrecosLocal } from '@/modules/dinheiro'
import { usePreferencias } from '@/shared/stores/preferencias'

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

const fonteGravacoes = treinoSupabase ?? criarFonteGravacoesExemplo()

// A velocidade escolhida na Vitrine vale desde a abertura do app.
// O recorte de exemplo tem 3 dias: no demo o relógio começa no 3º dia, com os gráficos de 24 h cheios.
const reproducao = criarFonteEstufaReproducao(fonteGravacoes, {
  velocidade: usePreferencias.getState().velocidadeReproducao ?? VELOCIDADE_PADRAO,
  posicao: demo ? 2 * 144 + 87 : 0,
})

export const dependencias = {
  fonteEstufa: reproducao,
  controleSimulacao: reproducao,
  fonteTreino: treinoSupabase ?? criarFonteTreinoExemplo(),
  fonteGravacoes,
  origemTreino,
  repositorioPrecos: criarRepositorioPrecosLocal(),
  // vendas e gastos de verdade: no navegador até existir login (passo 11)
  repositorioLancamentos: criarRepositorioLancamentosLocal(),
}
