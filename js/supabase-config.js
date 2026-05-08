// js/supabase-config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL  = 'https://cektzifptedmgfdgltnw.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNla3R6aWZwdGVkbWdmZGdsdG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDg4MjAsImV4cCI6MjA5MTQ4NDgyMH0.r2mB8sr8vWcIFO1q2W6kuvGnKlaeG1Pvh9eSJd_4q0Y';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
  }
});
