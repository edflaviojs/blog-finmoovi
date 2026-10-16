-- ════════════════════════════════════════════════════════════════════════════
-- Fase S (15/10/2026) — newsletter fechada à chave pública
--
-- Antes: políticas "Allow public select/update/insert" deixavam QUALQUER pessoa com
-- a chave pública ler todos os e-mails, alterá-los e cancelar quem quisesse.
-- Agora a chave pública só pode chamar DUAS funções, que não devolvem nenhum e-mail:
--   fm_newsletter_inscrever(...)  → inscreve ou reativa
--   fm_newsletter_cancelar(email, token) → cancela SÓ com o código secreto do link
-- Os robôs (newsletter-digest, welcome-sequence) usam a chave do servidor.
--
-- PARTE 1 corre antes de publicar o blog novo; PARTE 2 (tranca) depois.
-- ════════════════════════════════════════════════════════════════════════════

-- ── PARTE 1 ─────────────────────────────────────────────────────────────────
begin;

alter table public.newsletter_subscribers
  add column if not exists unsub_token uuid not null default gen_random_uuid();

-- PARTE 1-B (15/10/2026, revisor): a versão anterior DEVOLVIA o código a quem chamava —
-- qualquer pessoa ficava com o código de um e-mail novo, e null × código revelava quem já
-- era assinante. Agora o código vem DE QUEM CHAMA (o blog gera um por inscrição e põe-no
-- no e-mail de boas-vindas), só é gravado em inscrição nova/reativada, e a função não
-- devolve nada — a resposta é igual para todos os e-mails.
drop function if exists public.fm_newsletter_inscrever(text, text, text, text);
drop function if exists public.fm_newsletter_inscrever(text, text, text, text, uuid);
create or replace function public.fm_newsletter_inscrever(
  p_email text, p_lang text, p_source text, p_consent_text text, p_token uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e text := lower(trim(coalesce(p_email, '')));
begin
  if length(e) > 254 or e !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'email invalido' using errcode = '22023';
  end if;
  insert into public.newsletter_subscribers (email, lang, source, active, consent_at, consent_text, unsub_token)
  values (e, left(coalesce(p_lang, 'pt'), 5), left(coalesce(p_source, 'newsletter'), 50), true, now(),
          left(p_consent_text, 300), coalesce(p_token, gen_random_uuid()))
  on conflict (email) do update
    set active = true,
        unsubscribed_at = null,
        lang = excluded.lang,
        source = excluded.source,
        consent_at = excluded.consent_at,
        consent_text = excluded.consent_text,
        unsub_token = excluded.unsub_token
    where public.newsletter_subscribers.active = false; -- já ativo: não mexe em NADA
end
$$;

create or replace function public.fm_newsletter_cancelar(p_email text, p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.newsletter_subscribers
     set active = false, unsubscribed_at = now()
   where email = lower(trim(coalesce(p_email, '')))
     and unsub_token = p_token
     and active = true;
  return found;
end
$$;

revoke all on function public.fm_newsletter_inscrever(text, text, text, text, uuid) from public;
revoke all on function public.fm_newsletter_cancelar(text, uuid) from public;
grant execute on function public.fm_newsletter_inscrever(text, text, text, text, uuid) to anon, authenticated;
grant execute on function public.fm_newsletter_cancelar(text, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
commit;

-- ── PARTE 2 (depois do blog novo no ar e dos robôs com a chave do servidor) ──
-- begin;
-- drop policy if exists "Allow public insert" on public.newsletter_subscribers;
-- drop policy if exists "Allow public select by email" on public.newsletter_subscribers;
-- drop policy if exists "Allow public update by email" on public.newsletter_subscribers;
-- revoke truncate, references, trigger on public.newsletter_subscribers from anon, authenticated;
-- commit;
--
-- ── PARTE 3 (16/10/2026) — SÓ DEPOIS de SUPABASE_SERVICE_KEY nas variáveis das Pages do blog
--    e de um deploy do blog com functions/api/newsletter.js lendo essa chave ──
-- A chave pública deixa de poder inscrever: quem chamava a função escolhia o código de
-- cancelamento de um e-mail novo (inscrevia um terceiro e cancelava-o depois).
-- begin;
-- revoke execute on function public.fm_newsletter_inscrever(text, text, text, text, uuid) from anon, authenticated;
-- grant execute on function public.fm_newsletter_inscrever(text, text, text, text, uuid) to service_role;
-- notify pgrst, 'reload schema';
-- commit;
-- Desfazer a PARTE 3 (emergência):
--   grant execute on function public.fm_newsletter_inscrever(text, text, text, text, uuid) to anon, authenticated;
--
-- Desfazer a PARTE 2 (emergência):
--   create policy "Allow public insert" on public.newsletter_subscribers for insert to public with check (true);
--   create policy "Allow public select by email" on public.newsletter_subscribers for select to public using (true);
--   create policy "Allow public update by email" on public.newsletter_subscribers for update to public using (true);
