// Device-level quick unlock (PIN + fingerprint/Face ID) layered on top of the Google session.
// Stored per user on this device only; the PIN is never stored in plain text.
const key = (uid: string) => `dc_quicklock_${uid}`;

type LockData = { salt: string; pinHash: string; credentialId?: string };

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function getLock(uid: string): LockData | null {
  const raw = localStorage.getItem(key(uid));
  return raw ? (JSON.parse(raw) as LockData) : null;
}

export async function setPin(uid: string, pin: string) {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const prev = getLock(uid);
  localStorage.setItem(key(uid), JSON.stringify({ ...prev, salt, pinHash: await sha256(salt + pin) }));
}

export async function checkPin(uid: string, pin: string) {
  const d = getLock(uid);
  return !!d && d.pinHash === (await sha256(d.salt + pin));
}

export function clearLock(uid: string) {
  localStorage.removeItem(key(uid));
}

export async function biometricsAvailable() {
  return (
    typeof window !== "undefined" &&
    !!window.PublicKeyCredential &&
    (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false))
  );
}

export async function registerBiometrics(uid: string, name: string) {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "Don Cangrejo Pro" },
      user: { id: new TextEncoder().encode(uid), name, displayName: name },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("No se registró la huella");
  const d = getLock(uid);
  if (!d) throw new Error("Primero crea tu PIN");
  localStorage.setItem(key(uid), JSON.stringify({ ...d, credentialId: b64(cred.rawId) }));
}

export async function verifyBiometrics(uid: string) {
  const d = getLock(uid);
  if (!d?.credentialId) return false;
  const res = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: "public-key", id: unb64(d.credentialId) }],
      userVerification: "required",
      timeout: 60000,
    },
  });
  return !!res;
}
