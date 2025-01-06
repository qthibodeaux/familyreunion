import { createClient } from '@supabase/supabase-js'

//const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
//const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY
const supabaseUrl2 = process.env.REACT_APP_SUPABASE_URL2
const supabaseKey2 = process.env.REACT_APP_SUPABASE_ANON_KEY2

export const supabase = createClient(supabaseUrl2, supabaseKey2)