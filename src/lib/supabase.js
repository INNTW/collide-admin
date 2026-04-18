/**
 * Neon-backed client that mimics the Supabase JS API surface.
 *
 * supabase.from("table").select/insert/update/delete — hits Neon Data API (PostgREST)
 * supabase.auth.signInWithPassword — hits Neon Auth via /api/auth proxy
 * supabase.auth.getSession — reads from memory/localStorage
 * supabase.auth.onAuthStateChange — notifies listeners
 * supabase.channel — stubbed (no realtime, uses polling instead)
 */

const DATA_API_URL = import.meta.env.VITE_NEON_DATA_API_URL || '';
const AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL || '';
const IS_LOCAL = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const AUTH_ENDPOINT = IS_LOCAL ? AUTH_URL : '/api/auth';
const SESSION_KEY = 'collide_neon_session';

// ── Session state ──
let currentSession = null;
let currentUser = null;
const authListeners = new Set();

// Restore session from localStorage
try {
  const stored = localStorage.getItem(SESSION_KEY);
  if (stored) {
    const s = JSON.parse(stored);
    if (s.user && s.access_token) {
      currentSession = s;
      currentUser = s.user;
    }
  }
} catch (e) { /* ignore */ }

function notifyAuthListeners(event) {
  authListeners.forEach(fn => {
    try { fn(event, currentSession); } catch (e) { /* ignore */ }
  });
}

// ── PostgREST query builder (mimics supabase.from()) ──
function buildQuery(table) {
  let method = 'GET';
  let body = null;
  let params = new URLSearchParams();
  let headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  let returnData = true;
  let isSingle = false;

  // Add auth token
  if (currentSession?.access_token) {
    headers['Authorization'] = `Bearer ${currentSession.access_token}`;
  }

  const chain = {
    select(columns = '*') {
      method = 'GET';
      params.set('select', columns);
      return chain;
    },
    insert(data) {
      method = 'POST';
      body = data;
      headers['Prefer'] = 'return=representation';
      return chain;
    },
    update(data) {
      method = 'PATCH';
      body = data;
      headers['Prefer'] = 'return=representation';
      return chain;
    },
    upsert(data) {
      method = 'POST';
      body = data;
      headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
      return chain;
    },
    delete() {
      method = 'DELETE';
      headers['Prefer'] = 'return=representation';
      return chain;
    },
    eq(col, val) {
      params.append(col, `eq.${val}`);
      return chain;
    },
    neq(col, val) { params.append(col, `neq.${val}`); return chain; },
    gt(col, val) { params.append(col, `gt.${val}`); return chain; },
    gte(col, val) { params.append(col, `gte.${val}`); return chain; },
    lt(col, val) { params.append(col, `lt.${val}`); return chain; },
    lte(col, val) { params.append(col, `lte.${val}`); return chain; },
    in(col, vals) { params.append(col, `in.(${vals.join(',')})`); return chain; },
    is(col, val) { params.append(col, `is.${val}`); return chain; },
    order(col, opts = {}) {
      params.append('order', `${col}.${opts.ascending === false ? 'desc' : 'asc'}`);
      return chain;
    },
    limit(n) { params.set('limit', n); return chain; },
    single() { isSingle = true; headers['Accept'] = 'application/vnd.pgrst.object+json'; return chain; },
    maybeSingle() { isSingle = true; return chain; },
    then(resolve, reject) {
      const qs = params.toString();
      const url = `${DATA_API_URL}/${table}${qs ? '?' + qs : ''}`;
      fetch(url, {
        method,
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            return resolve({ data: null, error: err, count: null });
          }
          const text = await res.text();
          if (!text) return resolve({ data: isSingle ? null : [], error: null, count: 0 });
          const data = JSON.parse(text);
          const count = res.headers.get('content-range')?.split('/')[1];
          return resolve({ data, error: null, count: count ? parseInt(count) : null });
        })
        .catch((err) => {
          if (reject) reject(err);
          else resolve({ data: null, error: { message: err.message }, count: null });
        });
    },
  };
  return chain;
}

// ── Auth (mimics supabase.auth) ──
const auth = {
  async signInWithPassword({ email, password }) {
    try {
      const res = await fetch(`${AUTH_ENDPOINT}/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: IS_LOCAL ? 'include' : 'same-origin',
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        return { data: null, error: { message: json.error?.message || json.message || 'Login failed' } };
      }
      // Build session from Neon Auth response
      currentUser = json.user || null;
      currentSession = {
        access_token: json.token,
        user: currentUser,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
      notifyAuthListeners('SIGNED_IN');
      return { data: { user: currentUser, session: currentSession }, error: null };
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  },

  async signUp({ email, password, options }) {
    try {
      const res = await fetch(`${AUTH_ENDPOINT}/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: options?.data?.name || email.split('@')[0] }),
        credentials: IS_LOCAL ? 'include' : 'same-origin',
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        return { data: null, error: { message: json.error?.message || json.message || 'Sign up failed' } };
      }
      return { data: { user: json.user }, error: null };
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  },

  async getSession() {
    return { data: { session: currentSession }, error: null };
  },

  async getUser() {
    return { data: { user: currentUser }, error: null };
  },

  async signOut() {
    currentSession = null;
    currentUser = null;
    localStorage.removeItem(SESSION_KEY);
    notifyAuthListeners('SIGNED_OUT');
    return { error: null };
  },

  async updateUser(updates) {
    // Stub — password updates would need a Neon Auth endpoint
    return { data: { user: currentUser }, error: null };
  },

  onAuthStateChange(callback) {
    authListeners.add(callback);
    // Fire initial event if session exists
    if (currentSession) {
      setTimeout(() => callback('INITIAL_SESSION', currentSession), 0);
    }
    return {
      data: {
        subscription: {
          unsubscribe() { authListeners.delete(callback); },
        },
      },
    };
  },
};

// ── Realtime stub (uses polling in data providers) ──
function channel(name) {
  return {
    on(event, opts, callback) { return this; },
    subscribe() { return this; },
  };
}

// ── Export ──
export const supabase = {
  from: (table) => buildQuery(table),
  auth,
  channel,
  removeChannel(ch) {},
};
