import { createContext } from 'react';
import type { AuthUser, LoginPayload, Role } from '../types/portal.types';

export interface AuthContextValue {
  /** null bila belum login */
  user: AuthUser | null;
  isAuthenticated: boolean;
  role: Role | null;
  /** true setelah server membalas 401 pada request biasa, kembali false saat login berhasil */
  sessionExpired: boolean;
  /** Kirim kredensial, simpan token, lalu kembalikan pengguna. Gagal dilempar sebagai ApiError */
  login: (credentials: LoginPayload) => Promise<AuthUser>;
  /** Hapus sesi. Pemanggil yang mengarahkan ke halaman login */
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
