import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aqbsagaifmtxrrsngbme.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYnNhZ2FpZm10eHJyc25nYm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMjM3NTQsImV4cCI6MjA4MTc5OTc1NH0.7L1Fv3_qk0pQUMyLtshuChZ-mY-R3NGQGvB6gpyCDzc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);