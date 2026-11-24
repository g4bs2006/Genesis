-- =============================================================================
-- Gênesis: o treino na nuvem, para acompanhar pelo celular.
--
-- O PC do treino ESCREVE aqui (pelo treino/nuvem.py) e o dashboard no Vercel
-- LÊ daqui. As tabelas espelham os arquivos que o treino já exporta em
-- treino/saidas/<execucao>/ (docs/contrato-dados.md):
--
--   estado.json, config.json, normalizacao.json -> genesis.execucoes (1 linha por execução)
--   geracoes.json                               -> genesis.geracoes  (1 linha por geração)
--   modelos/<id>.json                           -> genesis.modelos
--   gravacoes/indice.json                       -> genesis.gravacoes (o resumo)
--   gravacoes/<id>.json                         -> bucket genesis-gravacoes (o arquivo inteiro)
--
-- Tudo mora no schema "genesis" (um schema é uma pasta de tabelas dentro do
-- banco): o banco é o do projeto PequiDev, e assim nada se mistura com o blog
-- nem com a Lixeira do Pequi. Apagar tudo do Gênesis = drop schema genesis cascade.
--
-- Quem pode o quê (RLS, "Row Level Security": regras por linha que o próprio
-- Postgres confere em toda consulta, então nem uma chave vazada passa por cima):
--   - LER: qualquer um (anon). São curvas de treino, nada sensível, e facilita
--     mostrar no artigo. Para fechar, troque "to anon, authenticated" por
--     "to authenticated" nas políticas de leitura.
--   - ESCREVER: só a conta de usuário do treino, marcada com
--     app_metadata.genesis_escritor = true. O app_metadata só muda pelo SQL ou
--     pela chave de serviço, então ninguém se promove sozinho.
-- =============================================================================

create schema genesis;
comment on schema genesis is 'Gênesis: o treino da rede neural da estufa (repo g4bs2006/Genesis).';

-- anon = quem abre o dashboard sem login; authenticated = quem entrou numa conta
-- (o treino). Sem este "usage", nenhum dos dois enxerga o schema, mesmo com RLS.
grant usage on schema genesis to anon, authenticated, service_role;
-- E o que cada um pode tentar fazer nas tabelas. A palavra final é da RLS lá embaixo.
alter default privileges in schema genesis grant select on tables to anon;
alter default privileges in schema genesis grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema genesis grant execute on functions to anon, authenticated, service_role;

-- Quem escreve. "security invoker" e "stable": só lê o token de quem chamou.
create or replace function genesis.pode_escrever()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'genesis_escritor')::boolean, false)
$$;

comment on function genesis.pode_escrever() is
  'true se quem chamou é a conta do treino (app_metadata.genesis_escritor).';

-- Atualiza a coluna atualizado_em sozinha em cada update.
create or replace function genesis.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Execuções: uma por treino (ex.: "fase1-semente7-20261124").
-- estado, configuracao e normalizacao ficam como JSON do contrato, inteiros:
-- o dashboard já confere cada um com o Zod ao receber.
-- ---------------------------------------------------------------------------
create table genesis.execucoes (
  id text primary key,
  estado jsonb not null,           -- EstadoTreino
  configuracao jsonb not null,     -- ConfigTreino
  normalizacao jsonb,              -- centro e largura de cada entrada da rede
  criada_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
comment on table genesis.execucoes is
  'cada execução do treino. estado = EstadoTreino, configuracao = ConfigTreino (docs/contrato-dados.md).';

create trigger execucoes_atualizado_em
  before update on genesis.execucoes
  for each row execute function genesis.tocar_atualizado_em();

-- O dashboard pede "a execução mais recente": índice para isso.
create index execucoes_atualizado_em_idx on genesis.execucoes (atualizado_em desc);

-- ---------------------------------------------------------------------------
-- Gerações: a curva de aprendizado. Colunas de verdade (não JSON) para dar
-- para fazer contas em SQL depois, no artigo.
-- ---------------------------------------------------------------------------
create table genesis.geracoes (
  execucao_id text not null references genesis.execucoes (id) on delete cascade,
  numero integer not null check (numero >= 0),
  fase smallint not null check (fase between 1 and 6),
  melhor double precision not null,    -- nota do campeão (R$ por ciclo)
  mediana double precision not null,   -- nota da população do meio
  regras double precision not null,    -- nota das regras fixas no mesmo clima
  segundos double precision not null check (segundos >= 0),
  criada_em timestamptz not null default now(),
  primary key (execucao_id, numero)
);
comment on table genesis.geracoes is 'uma linha por geração (Geracao no contrato).';

-- ---------------------------------------------------------------------------
-- Modelos: os campeões salvos, com os pesos (~2 mil números na fase 1).
-- ---------------------------------------------------------------------------
create table genesis.modelos (
  execucao_id text not null references genesis.execucoes (id) on delete cascade,
  id text not null,
  geracao integer not null,
  fase smallint not null check (fase between 1 and 6),
  dados jsonb not null,                -- o Modelo inteiro do contrato
  criada_em timestamptz not null default now(),
  primary key (execucao_id, id)
);
comment on table genesis.modelos is 'campeões salvos. dados = Modelo do contrato.';

-- ---------------------------------------------------------------------------
-- Gravações: aqui só o resumo (a lista). O arquivo com os 5 mil passos
-- (~0,5 MB) vai para o Storage, que é feito para arquivos grandes.
-- ---------------------------------------------------------------------------
create table genesis.gravacoes (
  execucao_id text not null references genesis.execucoes (id) on delete cascade,
  id text not null,
  semente integer not null,
  modelo_id text not null,
  titulo text not null,
  criada_em timestamptz not null,
  passos integer not null check (passos >= 0),
  arquivo text not null,               -- caminho no bucket genesis-gravacoes
  primary key (execucao_id, id)
);
comment on table genesis.gravacoes is
  'resumo de cada gravação (ResumoGravacao). O JSON inteiro fica no bucket genesis-gravacoes.';

-- ---------------------------------------------------------------------------
-- RLS: liga nas quatro tabelas e cria as regras.
-- ---------------------------------------------------------------------------
alter table genesis.execucoes enable row level security;
alter table genesis.geracoes enable row level security;
alter table genesis.modelos enable row level security;
alter table genesis.gravacoes enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['execucoes', 'geracoes', 'modelos', 'gravacoes']
  loop
    execute format('create policy "%1$s: qualquer um lê" on genesis.%1$I for select to anon, authenticated using (true)', t);
    execute format('create policy "%1$s: o treino insere" on genesis.%1$I for insert to authenticated with check ((select genesis.pode_escrever()))', t);
    execute format('create policy "%1$s: o treino atualiza" on genesis.%1$I for update to authenticated using ((select genesis.pode_escrever())) with check ((select genesis.pode_escrever()))', t);
    execute format('create policy "%1$s: o treino apaga" on genesis.%1$I for delete to authenticated using ((select genesis.pode_escrever()))', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Realtime: o Supabase avisa o dashboard na hora em que uma linha muda,
-- sem o celular ficar perguntando "tem novidade?" o tempo todo.
-- (Modelos ficam de fora: são grandes e mudam pouco; o dashboard busca de novo
-- quando o estado muda.)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table genesis.execucoes;
alter publication supabase_realtime add table genesis.geracoes;
alter publication supabase_realtime add table genesis.gravacoes;

-- ---------------------------------------------------------------------------
-- Storage: o bucket das gravações. Público para leitura (o link baixa o
-- arquivo direto); só o treino envia. Limite de 10 MB por arquivo e só JSON.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('genesis-gravacoes', 'genesis-gravacoes', true, 10485760, array['application/json'])
on conflict (id) do nothing;

create policy "genesis-gravacoes: qualquer um lê"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'genesis-gravacoes');

create policy "genesis-gravacoes: o treino envia"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'genesis-gravacoes' and (select genesis.pode_escrever()));

create policy "genesis-gravacoes: o treino substitui"
  on storage.objects for update to authenticated
  using (bucket_id = 'genesis-gravacoes' and (select genesis.pode_escrever()))
  with check (bucket_id = 'genesis-gravacoes' and (select genesis.pode_escrever()));

create policy "genesis-gravacoes: o treino apaga"
  on storage.objects for delete to authenticated
  using (bucket_id = 'genesis-gravacoes' and (select genesis.pode_escrever()));
