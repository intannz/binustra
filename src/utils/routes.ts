import type { Role } from '../types/portal.types';

/** Halaman awal untuk tiap role. Tanpa role, arahkan ke halaman login */
export function getDashboardPath(role: Role | null): string {
  if (role === 'guru') return '/guru/dashboard';
  if (role === 'siswa') return '/siswa/dashboard';
  return '/login';
}
