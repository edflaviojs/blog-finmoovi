/**
 * Migração one-shot: KV → Supabase
 * Lê todos os subscribers do Cloudflare KV e insere no Supabase
 *
 * Uso: SUPABASE_URL=... SUPABASE_ANON_KEY=... node migrate-kv-to-supabase.js
 * (Requer wrangler configurado para ler do KV)
 */

import { execSync } from 'child_process';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const KV_NAMESPACE_ID = 'b5ea6ea0f36c40a6a3ae264e3c717750';

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Set SUPABASE_URL and SUPABASE_ANON_KEY');
    process.exit(1);
  }

  console.log('📋 Lendo subscribers do KV...');
  const keysJson = execSync(`npx wrangler kv key list --namespace-id=${KV_NAMESPACE_ID}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  const keys = JSON.parse(keysJson);

  if (keys.length === 0) {
    console.log('KV está vazio, nada para migrar.');
    return;
  }

  console.log(`📬 ${keys.length} subscriber(s) encontrado(s)`);

  let migrated = 0;
  for (const key of keys) {
    const email = key.name;
    const valueJson = execSync(`npx wrangler kv key get --namespace-id=${KV_NAMESPACE_ID} "${email}"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });

    let data;
    try {
      data = JSON.parse(valueJson);
    } catch {
      data = { email, lang: 'pt' };
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        email: data.email || email,
        lang: data.lang || 'pt',
        subscribed_at: data.subscribedAt || new Date().toISOString(),
        active: true
      })
    });

    if (res.ok || res.status === 409) {
      migrated++;
      console.log(`✅ ${email}`);
    } else {
      const err = await res.text();
      console.log(`❌ ${email}: ${err}`);
    }
  }

  console.log(`\n✅ Migração completa: ${migrated}/${keys.length}`);
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
