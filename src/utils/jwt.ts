export interface JwtPayload {
  userId?: unknown;
  role?: unknown;
  /** Waktu kedaluwarsa dalam detik sejak epoch */
  exp?: unknown;
  [claim: string]: unknown;
}

/**
 * Baca payload JWT tanpa memverifikasi tanda tangan. Hasilnya hanya untuk
 * menampilkan sesi di UI, keputusan akses tetap diambil server.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  const part = token.split('.')[1];
  if (!part) return null;

  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as JwtPayload)
      : null;
  } catch {
    return null;
  }
}

/** true bila token punya exp dan waktunya sudah lewat */
export function isTokenExpired(payload: JwtPayload, now: number = Date.now()): boolean {
  return typeof payload.exp === 'number' && payload.exp * 1000 <= now;
}
