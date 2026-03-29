// ── SIN Encryption (AES-256-GCM via Web Crypto API) ──
export const SINEncryption = {
  deriveKey: async (passphrase, salt) => {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  },

  encrypt: async (plainSIN, passphrase, userId) => {
    try {
      const key = await SINEncryption.deriveKey(passphrase, userId);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const enc = new TextEncoder();
      const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plainSIN));
      const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
      combined.set(iv);
      combined.set(new Uint8Array(ciphertext), iv.length);
      return btoa(String.fromCharCode(...combined));
    } catch (e) { console.error("SIN encrypt error:", e); return null; }
  },

  decrypt: async (encryptedB64, passphrase, userId) => {
    try {
      const key = await SINEncryption.deriveKey(passphrase, userId);
      const combined = new Uint8Array(atob(encryptedB64).split("").map(c => c.charCodeAt(0)));
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);
      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
      return new TextDecoder().decode(decrypted);
    } catch (e) { console.error("SIN decrypt error:", e); return null; }
  },

  mask: (sin) => sin ? `***-***-${sin.replace(/\D/g, "").slice(-3)}` : "***-***-***",
  validate: (sin) => /^\d{3}-?\d{3}-?\d{3}$/.test(sin.trim()),
  format: (sin) => { const d = sin.replace(/\D/g, ""); return d.length === 9 ? `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}` : sin; },
};
