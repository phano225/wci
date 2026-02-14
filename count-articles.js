import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

(async () => {
  const { count, error } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  console.log('Articles en base:', count);
  process.exit(0);
})(); 
