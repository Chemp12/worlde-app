import { createClient } from '@supabase/supabase-js'

// URL projekta i "anon" (javni) ključ.
// Napomena: ovaj ključ je NAMIJENJEN da bude javan — svejedno se šalje pregledniku
// u svakom slučaju. Sigurnost se postiže pravilima u bazi (Row Level Security),
// a ne skrivanjem ovog ključa. Tajne ključeve (service_role) NIKAD ne stavljamo ovdje.
const SUPABASE_URL = 'https://lnbdbrbellamnqfgscwz.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuYmRicmJlbGxhbW5xZmdzY3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NzQzODQsImV4cCI6MjA5OTQ1MDM4NH0.j8c8Dn9EyeNhm1r01ygwFn8XkiOUL6zV7XDrmXi8S1o'

// "Klijent" preko kojeg razgovaramo sa Supabaseom (prijava, baza...).
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
