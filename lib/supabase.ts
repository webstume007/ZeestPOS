import { createClient } from '@supabase/supabase-js';

// Use dummy values during Vercel build if env vars are missing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rntdfbczfxyzjrpbltrz.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJudGRmYmN6Znh5empycGJsdHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NzgyMjUsImV4cCI6MjEwNDI1NDIyNX0.ZcQ-h-v_A4TDemmhxta9uO77zqtEip438xraBoB8Alc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
