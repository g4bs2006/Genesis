# Acompanhar o treino de longe (Supabase + Vercel)

O treino roda horas no PC com a RX 7600 (ou no notebook), sem ninguém olhando.
Este guia liga o treino a um site, para acompanhar pelo celular.

```
PC do treino                         nuvem                              você
────────────                         ─────                              ────
treino (Fase D) escreve              Supabase (projeto PequiDev,        dashboard no Vercel,
treino/saidas/<execucao>/*.json  ──> schema "genesis")              ──> aberto no celular
           │                           tabelas + arquivos                (atualiza sozinho)
           └── treino/nuvem.py ─────┘
               (manda o que mudou)
```

## As peças

**Supabase** é um Postgres (banco de dados) na nuvem com uma API pronta na
frente. Usamos três coisas dele:

- **Tabelas** no schema `genesis`. Um *schema* é uma pasta de tabelas dentro
  do banco: o Gênesis fica separado do blog e da Lixeira do Pequi, que usam o
  mesmo projeto. As tabelas:

  | Tabela | Uma linha por | Vem de |
  | --- | --- | --- |
  | `execucoes` | treino rodado (estado, configuração, normalização) | `estado.json`, `config.json`, `normalizacao.json` |
  | `geracoes` | geração (melhor, mediana, regras, segundos) | `geracoes.json` |
  | `modelos` | campeão salvo, com os pesos | `modelos/<id>.json` |
  | `gravacoes` | gravação (só o resumo) | `gravacoes/indice.json` |

- **Storage** (o bucket `genesis-gravacoes`): os arquivos das gravações
  (~3 MB cada), que são grandes demais para uma linha de tabela, e o índice de
  cada pasta (`indice.json` e `indice-reavaliacao.json`, poucos KB), que leva
  quem controlou cada gravação, a geração e o resumo do ciclo (passo 09).
- **Realtime**: o Supabase avisa o celular por WebSocket (uma conexão que fica
  aberta) quando chega geração nova. O celular não precisa ficar perguntando.

**Quem pode o quê.** O banco confere em cada pedido (RLS, *Row Level
Security*):

- **ler**: qualquer um com o link. São curvas de treino, nada sensível, e
  ajuda a mostrar no artigo;
- **escrever**: só a conta do treino, marcada com
  `app_metadata.genesis_escritor = true`. Esse campo só muda pelo SQL, então
  ninguém se dá a permissão sozinho. A senha fica só no `.env` do PC do treino.

A migração com tudo isso, comentada:
[`supabase/migrations/20261124230000_genesis_treino.sql`](../supabase/migrations/20261124230000_genesis_treino.sql).

**Vercel** hospeda o dashboard: a cada push na `main`, ele roda
`npm run build` e publica. Plano Hobby, grátis para projeto pessoal.

**Custo:** zero. Supabase no plano grátis (500 MB de banco e 1 GB de arquivos
por projeto; o treino usa poucos MB por execução, e as gravações ~0,5 MB cada)
e Vercel Hobby. Um projeto grátis do Supabase pausa depois de 7 dias sem uso;
com o treino mandando dados, isso não acontece.

## Passo a passo (uma vez só)

### 1. Supabase: deixar a API enxergar o schema `genesis`

A API do Supabase só abre os schemas da lista. Em
[Project Settings › API](https://supabase.com/dashboard/project/aycoiszeubfwdtemeldj/settings/api)
(às vezes aparece como **Data API**),
em **Exposed schemas**, acrescente `genesis` e salve. (As tabelas já foram
criadas.)

### 2. Supabase: criar a conta do treino

Em [Authentication › Users](https://supabase.com/dashboard/project/aycoiszeubfwdtemeldj/auth/users),
**Add user › Create new user**:

- e-mail: por exemplo `treino.genesis@<seu domínio>` (não precisa receber
  e-mail);
- senha: forte, é ela que vai no `.env`;
- marque **Auto Confirm User**.

Depois dê a permissão de escrever, no
[SQL Editor](https://supabase.com/dashboard/project/aycoiszeubfwdtemeldj/sql/new)
(ou peça ao Claude):

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"genesis_escritor": true}'
where email = 'treino.genesis@<seu domínio>';
```

### 3. Vercel: publicar o dashboard

1. Em [vercel.com/new](https://vercel.com/new), importe o repositório
   `g4bs2006/Genesis`.
2. **Root Directory:** `dashboard`. O resto vem do `dashboard/vercel.json`.
3. Em **Environment Variables**, as duas de
   [`dashboard/.env.exemplo`](../dashboard/.env.exemplo):
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. **Deploy.** O site sai num endereço `*.vercel.app`.

### 4. PC do treino: o `.env`

Na raiz do repositório, copie `.env.exemplo` para `.env` e preencha o e-mail e
a senha da conta do treino:

```powershell
Copy-Item .env.exemplo .env   # copia o modelo
notepad .env                  # abre para preencher
```

### 5. Testar antes do treino de verdade

```powershell
python -m treino.nuvem --demo
```

Ele inventa um treino (uma geração a cada 3 s) e manda para a nuvem. No
celular, abra o site, vá em **Ajustes › Modo › Desenvolvedor** e depois em
**Treino**: os números devem subir sozinhos. Ctrl+C para parar, e apague a
demo com o comando que ele mostra (`python -m treino.nuvem --apagar demo-...`).

No celular, "Adicionar à tela inicial" instala o site como app (é um PWA).

## No dia a dia

Numa janela do PowerShell, o treino (Fase D/E do
[prompt do treino](prompt-treino.md)). Em **outra** janela:

```powershell
python -m treino.nuvem treino/saidas/<execucao>
```

- Ele olha a pasta a cada 15 s e manda só o que mudou. Reiniciar não duplica
  nada (cada envio é um *upsert*: insere ou atualiza).
- Se a internet cair, ele espera e tenta de novo; o treino nem fica sabendo.
- Se o `estado.json` passar 15 min sem mudar e ainda disser "rodando", ele
  avisa o celular que o treino **parou** (provavelmente caiu a energia ou deu
  erro). Ajuste com `--parado-apos <minutos>`.
- O dashboard mostra sempre a execução que mudou por último.

Para o treino não pegar um JSON pela metade, a Fase D deve escrever cada
arquivo num `.tmp` e renomear (`escrever_json` em `treino/nuvem.py` faz assim).

## Reavaliar uma execução antiga (passo 09)

Sem retreinar, grava o campeão da geração 1, as regras fixas e "sem controle"
no clima da gravação e regrava os campeões com a massa por dia e o resumo:

```powershell
.venv\Scripts\python.exe -m treino.reavaliar treino/saidas/<execucao>
.venv\Scripts\python.exe -m treino.nuvem --uma-vez treino/reavaliacoes/<execucao>
```

A pasta da reavaliação não tem `estado.json`: o envio pula a tabela
`execucoes` (a execução já existe) e manda o índice como `indice-reavaliacao.json`.

## Para o artigo

Os dados ficam no banco com colunas de verdade, então dá para tirar números
direto em SQL. Por exemplo, a melhor nota a cada 50 gerações:

```sql
select numero, melhor, mediana, regras
from genesis.geracoes
where execucao_id = 'fase1-semente7' and numero % 50 = 0
order by numero;
```

## Desfazer

- Uma execução: `python -m treino.nuvem --apagar <execucao>`.
- Tudo do Gênesis no Supabase: `drop schema genesis cascade;` e apagar o bucket
  `genesis-gravacoes` em Storage. O blog e a Lixeira não são tocados.
