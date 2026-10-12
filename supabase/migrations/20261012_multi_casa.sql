-- Gestão Doméstica: várias casas por usuário
-- Rodar uma vez no Supabase: SQL Editor > New query > colar tudo > Run.
-- Não apaga nenhum dado: cria as casas, liga tudo o que existe à "Casa Hylana" e troca as regras de acesso.

begin;

-- 1. Casas, membros e convites (tabelas já criadas na etapa anterior; "if not exists" mantém seguro)
create table if not exists casas (
  id uuid primary key default gen_random_uuid(), nome text not null, tipo text not null default 'residencial',
  modulos text[] not null default '{}', cidade text, criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now());
create table if not exists casa_membros (
  casa_id uuid not null references casas(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  papel text not null default 'editor' check (papel in ('dono','editor','leitura')), email text,
  criado_em timestamptz not null default now(), primary key (casa_id, user_id));
create table if not exists casa_convites (
  id uuid primary key default gen_random_uuid(), casa_id uuid not null references casas(id) on delete cascade,
  email text not null, papel text not null default 'editor' check (papel in ('dono','editor','leitura')),
  convidado_por uuid references auth.users(id) on delete set null, criado_em timestamptz not null default now(), unique (casa_id, email));
alter table casas enable row level security;
alter table casa_membros enable row level security;
alter table casa_convites enable row level security;

-- 2. A casa atual com os dois donos, e casa_id em todas as tabelas
do $$
declare cid uuid; g uuid; h uuid; t text;
begin
  select id into g from auth.users where email = 'glebejr@gmail.com';
  select id into h from auth.users where email = 'hylanaenf@gmail.com';
  select id into cid from casas where nome = 'Casa Hylana' limit 1;
  if cid is null then
    insert into casas (nome, tipo, modulos, cidade, criado_por)
    values ('Casa Hylana', 'residencial', '{pessoas,obras,manutencoes,estoque,piscina,jardim}', 'Natal/RN', g) returning id into cid;
  end if;
  if g is not null then insert into casa_membros (casa_id, user_id, papel, email) values (cid, g, 'dono', 'glebejr@gmail.com') on conflict do nothing; end if;
  if h is not null then insert into casa_membros (casa_id, user_id, papel, email) values (cid, h, 'dono', 'hylanaenf@gmail.com') on conflict do nothing; end if;
  foreach t in array array['categorias','contas','custos_fixos','despesas','documentos','estoque_itens','importacoes','manutencao_execucoes','manutencoes','obra_atualizacoes','obra_itens','obra_orcamentos','obras','pagamento_itens','pessoas'] loop
    execute format('alter table %I add column if not exists casa_id uuid references casas(id) on delete cascade', t);
    execute format('update %I set casa_id = %L where casa_id is null', t, cid);
    execute format('alter table %I alter column casa_id set not null', t);
    execute format('create index if not exists %I on %I(casa_id)', t || '_casa_idx', t);
  end loop;
end $$;

-- 3. Funções de acesso
create or replace function public.eh_membro(c uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from casa_membros where casa_id = c and user_id = auth.uid()) $$;
create or replace function public.pode_editar(c uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from casa_membros where casa_id = c and user_id = auth.uid() and papel in ('dono','editor')) $$;
create or replace function public.eh_dono(c uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from casa_membros where casa_id = c and user_id = auth.uid() and papel = 'dono') $$;

-- 4. casa_id automático e regras de acesso por membro
create or replace function public.definir_casa() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.casa_id is null then
    select casa_id into new.casa_id from casa_membros where user_id = auth.uid() and papel in ('dono','editor') order by criado_em limit 1;
  end if;
  return new;
end $$;
do $$
declare t text;
begin
  foreach t in array array['categorias','contas','custos_fixos','despesas','documentos','estoque_itens','importacoes','manutencao_execucoes','manutencoes','obra_atualizacoes','obra_itens','obra_orcamentos','obras','pagamento_itens','pessoas'] loop
    execute format('drop trigger if exists definir_casa on %I', t);
    execute format('create trigger definir_casa before insert on %I for each row execute function definir_casa()', t);
    execute format('drop policy if exists autenticados on %I', t);
    execute format('drop policy if exists membros_ler on %I', t);
    execute format('drop policy if exists membros_escrever on %I', t);
    execute format('create policy membros_ler on %I for select to authenticated using (eh_membro(casa_id))', t);
    execute format('create policy membros_escrever on %I for all to authenticated using (pode_editar(casa_id)) with check (pode_editar(casa_id))', t);
  end loop;
end $$;

drop policy if exists casas_ler on casas;       create policy casas_ler on casas for select to authenticated using (eh_membro(id) or criado_por = auth.uid());
drop policy if exists casas_criar on casas;     create policy casas_criar on casas for insert to authenticated with check (criado_por = auth.uid());
drop policy if exists casas_editar on casas;    create policy casas_editar on casas for update to authenticated using (eh_dono(id)) with check (eh_dono(id));
drop policy if exists casas_excluir on casas;   create policy casas_excluir on casas for delete to authenticated using (eh_dono(id));
drop policy if exists membros_ver on casa_membros;   create policy membros_ver on casa_membros for select to authenticated using (eh_membro(casa_id));
drop policy if exists membros_gerir on casa_membros; create policy membros_gerir on casa_membros for all to authenticated using (eh_dono(casa_id)) with check (eh_dono(casa_id));
drop policy if exists convites_ver on casa_convites;   create policy convites_ver on casa_convites for select to authenticated using (eh_membro(casa_id) or lower(email) = lower(auth.jwt()->>'email'));
drop policy if exists convites_gerir on casa_convites; create policy convites_gerir on casa_convites for all to authenticated using (eh_dono(casa_id)) with check (eh_dono(casa_id));

-- 5. Quem cria a casa vira dono; convites; membros
create or replace function public.dono_da_nova_casa() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into casa_membros (casa_id, user_id, papel, email) values (new.id, auth.uid(), 'dono', auth.jwt()->>'email') on conflict do nothing;
  return new;
end $$;
drop trigger if exists dono_da_nova_casa on casas;
create trigger dono_da_nova_casa after insert on casas for each row execute function dono_da_nova_casa();

create or replace function public.aceitar_convites() returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into casa_membros (casa_id, user_id, papel, email)
  select casa_id, auth.uid(), papel, email from casa_convites where lower(email) = lower(auth.jwt()->>'email')
  on conflict (casa_id, user_id) do nothing;
  get diagnostics n = row_count;
  delete from casa_convites where lower(email) = lower(auth.jwt()->>'email');
  return n;
end $$;
grant execute on function aceitar_convites() to authenticated;

create or replace function public.membros_da_casa(c uuid) returns table(user_id uuid, email text, papel text, nome text) language sql stable security definer set search_path = public as $$
  select m.user_id, u.email::text, m.papel, coalesce(u.raw_user_meta_data->>'nome', split_part(u.email,'@',1))
  from casa_membros m join auth.users u on u.id = m.user_id where m.casa_id = c and eh_membro(c) order by m.criado_em $$;
grant execute on function membros_da_casa(uuid) to authenticated;

-- 6. Contas do mês a partir dos custos fixos, por casa
create or replace function gerar_contas_mes() returns integer language plpgsql security invoker as $$
declare n integer; ref date := date_trunc('month', (now() at time zone 'America/Fortaleza'))::date;
begin
  insert into contas (casa_id, tipo_conta, categoria_id, custo_fixo_id, descricao, referencia, valor, vencimento, forma_pagamento, origem)
  select f.casa_id, 'outro', f.categoria_id, f.id, f.descricao, ref, f.valor,
         ref + (least(f.dia_vencimento, extract(day from (ref + interval '1 month' - interval '1 day'))::int) - 1),
         case when f.debito_automatico then 'Débito automático' end, 'automatica'
  from custos_fixos f
  where f.ativo and f.dia_vencimento is not null and coalesce(f.valor,0) > 0 and coalesce(f.recorrencia,'mensal') = 'mensal' and f.pessoa_id is null and pode_editar(f.casa_id)
  on conflict (custo_fixo_id, referencia) where custo_fixo_id is not null do nothing;
  get diagnostics n = row_count; return n;
end $$;

-- 7. Itens dos módulos (pets, veículos, animais, áreas da piscina/jardim, unidade do condomínio)
create table if not exists modulo_itens (
  id uuid primary key default gen_random_uuid(),
  casa_id uuid not null references casas(id) on delete cascade,
  modulo text not null,
  nome text not null,
  dados jsonb not null default '{}'::jsonb,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists modulo_itens_casa_idx on modulo_itens(casa_id, modulo);
alter table modulo_itens enable row level security;
drop trigger if exists definir_casa on modulo_itens;
create trigger definir_casa before insert on modulo_itens for each row execute function definir_casa();
drop policy if exists membros_ler on modulo_itens;      create policy membros_ler on modulo_itens for select to authenticated using (eh_membro(casa_id));
drop policy if exists membros_escrever on modulo_itens; create policy membros_escrever on modulo_itens for all to authenticated using (pode_editar(casa_id)) with check (pode_editar(casa_id));
alter table manutencoes add column if not exists modulo_item_id uuid references modulo_itens(id) on delete set null;
alter table despesas add column if not exists modulo_item_id uuid references modulo_itens(id) on delete set null;

commit;

-- Conferência: deve listar Casa Hylana com 2 membros e a contagem de registros
select c.nome, (select count(*) from casa_membros m where m.casa_id = c.id) membros,
  (select count(*) from despesas d where d.casa_id = c.id) gastos, (select count(*) from contas x where x.casa_id = c.id) contas
from casas c;
