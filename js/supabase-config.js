// js/supabase-config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL  = 'https://cektzifptedmgfdgltnw.supabase.co';
const SUPABASE_ANON = 'sb_publishable_PwruNmffSl75yhOOma7NzQ_ItXVA3am';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
  }
});
