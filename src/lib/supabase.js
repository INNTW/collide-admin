import { createClient, SupabaseAuthAdapter } from '@neondatabase/neon-js';

const authUrl = import.meta.env.VITE_NEON_AUTH_URL;
const dataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL;

if (!authUrl || !dataApiUrl) {
  console.warn('Missing VITE_NEON_AUTH_URL or VITE_NEON_DATA_API_URL — database features will not work');
}

export const supabase = createClient({
  auth: {
    adapter: SupabaseAuthAdapter(),
    url: authUrl || '',
  },
  dataApi: {
    url: dataApiUrl || '',
  },
});
