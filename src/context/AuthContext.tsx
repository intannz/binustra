import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { ApiError, setUnauthorizedHandler, tokenStorage } from '../services/api';
import type { AuthUser, LoginPayload, LoginResult } from '../types/portal.types';
import { LOGIN_PATH, LOGIN_ROUTE } from '../utils/constants';
import { decodeJwtPayload, isTokenExpired } from '../utils/jwt';
import { AuthContext, type AuthContextValue } from './auth.context';

/* ========================================================================== */
/* Penyimpanan lama                                                           */
/* ========================================================================== */

// App.tsx, Sidebar, dan halaman lain masih membaca role dan nama dari localStorage,
// jadi nilainya ikut ditulis dan dihapus di sini sampai semuanya pindah ke useAuth.
const LEGACY_ROLE_KEY = 'role';
const LEGACY_NAME_KEY = 'nama';

const legacySession = {
  readName(): string | null {
    try {
      return localStorage.getItem(LEGACY_NAME_KEY);
    } catch {
      return null;
    }
  },
  save(user: AuthUser): void {
    try {
      localStorage.setItem(LEGACY_ROLE_KEY, user.role);
      if (user.nama) localStorage.setItem(LEGACY_NAME_KEY, user.nama);
      else localStorage.removeItem(LEGACY_NAME_KEY);
    } catch {
      // Storage tidak tersedia, sesi hanya hidup di memori
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(LEGACY_ROLE_KEY);
      localStorage.removeItem(LEGACY_NAME_KEY);
    } catch {
      // Abaikan
    }
  },
};

/* ========================================================================== */
/* Token ke pengguna                                                          */
/* ========================================================================== */

/** Token tidak bisa dibaca, sudah kedaluwarsa, atau tidak memuat userId dan role yang valid: null */
function userFromToken(token: string, nama: string | null): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload || isTokenExpired(payload)) return null;

  const { userId, role } = payload;
  if (typeof userId !== 'string' || (role !== 'siswa' && role !== 'guru')) return null;

  return { userId, role, nama };
}

/** Pulihkan sesi dari token yang tersimpan saat aplikasi dimuat */
function restoreSession(): AuthUser | null {
  const token = tokenStorage.get();
  if (!token) return null;

  const user = userFromToken(token, legacySession.readName());
  if (!user) {
    tokenStorage.clear();
    legacySession.clear();
  }
  return user;
}

/* ========================================================================== */
/* Provider                                                                   */
/* ========================================================================== */

/** Harus berada di dalam Router karena memakai useNavigate untuk redirect saat 401 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(restoreSession);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Server membalas 401 pada request biasa: api.ts sudah menghapus token,
  // di sini sisanya dibersihkan lalu pengguna diarahkan ke halaman login.
  // Request login memakai skipAuth sehingga 401 dari kredensial salah tidak sampai ke sini.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      legacySession.clear();
      setUser(null);
      setSessionExpired(true);
      navigate(LOGIN_ROUTE, { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  async function login(credentials: LoginPayload): Promise<AuthUser> {
    const result = await api.post<LoginResult>(LOGIN_PATH, credentials, { skipAuth: true });

    const token = typeof result?.token === 'string' ? result.token : '';
    const nextUser = userFromToken(token, result?.nama ?? null);
    if (!nextUser) {
      throw new ApiError(200, {
        code: 'UNKNOWN_ERROR',
        message: 'Token dari server tidak valid. Silakan coba lagi.',
      });
    }

    tokenStorage.set(token);
    legacySession.save(nextUser);
    setUser(nextUser);
    setSessionExpired(false);
    return nextUser;
  }

  function logout(): void {
    tokenStorage.clear();
    legacySession.clear();
    setUser(null);
    setSessionExpired(false);
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    role: user?.role ?? null,
    sessionExpired,
    login,
    logout,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}
