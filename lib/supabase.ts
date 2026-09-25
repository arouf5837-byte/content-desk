import {createClient} from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lnplaetmptgcmpruvrbg.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_TQYCn7Rs1gRDRy34YzG0Kg_onAwtL-z';
export const db=createClient(url, key);
