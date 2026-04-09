import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vqmowezlvkvmxrdauihv.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbW93ZXpsdmt2bXhyZGF1aWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MTkwODEsImV4cCI6MjA5MTI5NTA4MX0.RgbUgaIivdCwuX2RwqJMpvusNQ4XN1RxzH_ZeTOhEnk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
