import { createClient } from '@supabase/supabase-js';
import { processRequest } from './processor.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LOCK_OWNER = process.env.LOCK_OWNER || 'nexo-orchestrator@alb357';
const POLL_MS = parseInt(process.env.POLL_MS || '3000', 10);
const OLLAMA_URI = process.env.OLLAMA_URI || 'http://127.0.0.1:11434';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('nexo-orchestrator online', { LOCK_OWNER, POLL_MS, OLLAMA_URI });

async function pollOnce() {
  try {
    const { data, error } = await supabase.rpc('ai_lock_next_chat_request', {
      p_processor: 'alb357',
      p_lock_owner: LOCK_OWNER,
    });

    if (error) {
      console.error('[poll] lock error:', error.message);
      return;
    }

    const request = data?.[0];
    if (!request) return;

    console.log(`[process] request=${request.id} user=${request.user_id} mode=${request.mode}`);
    await processRequest(supabase, request, { LOCK_OWNER, OLLAMA_URI });
    console.log(`[done] request=${request.id}`);
  } catch (err) {
    console.error('[poll] unexpected error:', err);
  }
}

async function main() {
  while (true) {
    await pollOnce();
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
