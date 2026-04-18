import { createClient, SupabaseAuthAdapter } from '@neondatabase/neon-js';

const authUrl = import.meta.env.VITE_NEON_AUTH_URL;
const dataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL;

// Use /api/auth proxy on Vercel to avoid CORS "Invalid origin"
// On localhost, go direct to Neon Auth (localhost is in trusted_origins)
const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';

export const supabase = createClient({
  auth: {
    adapter: SupabaseAuthAdapter(),
    url: isLocal ? (authUrl || '') : '/api/auth',
  },
  dataApi: {
    url: dataApiUrl || '',
  },
});
