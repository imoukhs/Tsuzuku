import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

/**
 * No auth in v1 (single-user, backend URL not shared — see CLAUDE.md
 * Decisions Log). This client exists for the library/progress/categories
 * schema once it lands; nothing queries it yet.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
