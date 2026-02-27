import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const { data: agents } = await supabase.from('agents').select('*').order('created_at', { ascending: false }).limit(5);
const { data: keys } = await supabase.from('api_keys').select('agent_id, label, created_at').order('created_at', { ascending: false }).limit(5);

console.log('Agents:', JSON.stringify(agents, null, 2));
console.log('API Keys:', JSON.stringify(keys, null, 2));
