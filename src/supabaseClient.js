import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vqmowezlvkvmxrdauihv.supabase.co'
const SUPABASE_KEY = 'sb_publisable_c4seBvEi5lrCduOyz4vK7A_-BpwuOnB'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
