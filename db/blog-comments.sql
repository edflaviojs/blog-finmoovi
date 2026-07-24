-- ═══════════════════════════════════════════════════════════════════════════
-- 💬 COMENTÁRIOS DO BLOG — rodar no SQL Editor do Supabase
-- (Dashboard → SQL Editor → New query → colar tudo → Run)
--
-- Cria a tabela blog_comments com RLS LIGADO:
--   • anon (chave pública do site) só consegue:
--       - INSERIR comentário com status 'pending' (nunca aprovado direto)
--       - LER comentários com status 'approved'
--   • UPDATE/DELETE (aprovar/rejeitar): NENHUMA policy para anon →
--     só o service_role (que ignora RLS) consegue — é a chave usada pela
--     moderação na /status via Cloudflare Pages Function.
--
-- Por que o anon NÃO consegue aprovar nem ler pendentes:
--   - aprovar = UPDATE; sem policy de UPDATE para anon, o Postgres nega.
--   - forjar INSERT com status='approved' viola o WITH CHECK (status='pending').
--   - ler pendentes = SELECT com status <> 'approved'; a policy USING filtra
--     essas linhas — para o anon é como se não existissem.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.blog_comments (
  id          uuid primary key default gen_random_uuid(),
  page_slug   text not null,
  locale      text not null default 'pt',
  author_name text not null check (char_length(author_name) <= 60),
  body        text not null check (char_length(body) <= 1200),
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now(),
  -- SHA-256 truncado de (IP + dia) — nunca guardamos IP puro (LGPD).
  ip_hash     text
);

alter table public.blog_comments enable row level security;

-- anon pode INSERIR, mas apenas nascendo como 'pending'
drop policy if exists "anon insere pendente" on public.blog_comments;
create policy "anon insere pendente"
  on public.blog_comments
  for insert
  to anon
  with check (status = 'pending');

-- anon pode LER apenas aprovados
drop policy if exists "anon le aprovados" on public.blog_comments;
create policy "anon le aprovados"
  on public.blog_comments
  for select
  to anon
  using (status = 'approved');

-- (de propósito, NENHUMA policy de UPDATE/DELETE → só service_role modera)

create index if not exists blog_comments_lookup
  on public.blog_comments (page_slug, locale, status, created_at);
