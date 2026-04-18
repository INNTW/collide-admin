/**
 * Neon-backed client that mimics the Supabase JS API surface.
 *
 * supabase.from("table").select/insert/update/delete — hits Neon Data API (PostgREST)
 * supabase.auth.signInWithPassword — hits Neon Auth via /api/auth proxy
 * supabase.auth.getSession — reads from memory/localStorage
 * supabase.auth.onAuthStateChange — notifies listeners
 * supabase.channel — stubbed (no realtime, uses polling instead)
 */

const AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL || '';
const IS_LOCAL = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const AUTH_ENDPOINT = IS_LOCAL ? AUTH_URL : '/api/auth';
// All DB queries go through /api/query (serverless driver, no JWT needed)
const QUERY_URL = '/api/query';
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

// ── Query builder (mimics supabase.from() — routes through /api/query) ──
function buildQuery(table) {
  let method = 'GET';
  let body = null;
  let filters = new URLSearchParams();
  let isSingle = false;
  let selectCols = '*';
  let orderStr = '';
  let limitN = '';

  filters.set('table', table);

  const chain = {
    select(columns = '*') {
      method = 'GET';
      selectCols = columns;
      return chain;
    },
    insert(data) { method = 'POST'; body = data; return chain; },
    update(data) { method = 'PATCH'; body = data; return chain; },
    upsert(data) { method = 'POST'; body = data; return chain; },
    delete() { method = 'DELETE'; return chain; },
    eq(col, val) { filters.append(col, `eq.${val}`); return chain; },
    neq(col, val) { filters.append(col, `neq.${val}`); return chain; },
    gt(col, val) { filters.append(col, `gt.${val}`); return chain; },
    gte(col, val) { filters.append(col, `gte.${val}`); return chain; },
    lt(col, val) { filters.append(col, `lt.${val}`); return chain; },
    lte(col, val) { filters.append(col, `lte.${val}`); return chain; },
    in(col, vals) { filters.append(col, `in.(${vals.join(',')})`); return chain; },
    is(col, val) { filters.append(col, `is.${val}`); return chain; },
    order(col, opts = {}) { filters.set('order', `${col}.${opts.ascending === false ? 'desc' : 'asc'}`); return chain; },
    limit(n) { filters.set('limit', n); return chain; },
    single() { isSingle = true; return chain; },
    maybeSingle() { isSingle = true; return chain; },
    then(resolve, reject) {
      if (method === 'GET') filters.set('select', selectCols);
      const url = `${QUERY_URL}?${filters.toString()}`;
      fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
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
          if (isSingle) return resolve({ data: Array.isArray(data) ? data[0] || null : data, error: null, count: null });
          return resolve({ data, error: null, count: Array.isArray(data) ? data.length : null });
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
