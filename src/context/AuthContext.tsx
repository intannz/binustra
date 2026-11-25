import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, setUnauthorizedHandler, tokenStorage } from '../services/api';
import type { AuthUser, LoginPayload } from '../types/portal.types';
import { LOGIN_ROUTE, SEEDER_ACCOUNTS } from '../utils/constants';
import { decodeJwtPayload, isTokenExpired } from '../utils/jwt';
import { AuthContext, type AuthContextValue } from './auth.context';

/* ========================================================================== */
/* Penyimpanan lama                                                           */
/* ========================================================================== */

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

function userFromToken(token: string, nama: string | null): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload || isTokenExpired(payload)) return null;

  const { userId, role } = payload;
  if (typeof userId !== 'string' || (role !== 'siswa' && role !== 'guru')) return null;

  const matchedAccount = SEEDER_ACCOUNTS.find((acc) => acc.id === userId);
  return { userId, role, nama: nama ?? matchedAccount?.nama ?? null };
}

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(restoreSession);
  const [sessionExpired, setSessionExpired] = useState(false);

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
    const identifier = credentials.nomorInduk.trim();
    const password = credentials.password;

    // Mendukung input token JWT mentah secara langsung di kolom Nomor Induk
    const isRawJwt = identifier.split('.').length === 3;
    let token: string;
    let nama: string | null = null;

    if (isRawJwt) {
      token = identifier;
    } else {
      const account = SEEDER_ACCOUNTS.find(
        (acc) =>
          (acc.nomorInduk === identifier || acc.username.toLowerCase() === identifier.toLowerCase()) &&
          acc.password === password,
      );

      if (!account) {
        throw new ApiError(401, {
          code: 'UNAUTHORIZED',
          message: 'Nomor Induk / Username atau Kata Sandi salah!',
        });
      }

      token = account.token;
      nama = account.nama;
    }

    const nextUser = userFromToken(token, nama);
    if (!nextUser) {
      throw new ApiError(401, {
        code: 'UNAUTHORIZED',
        message: 'Token JWT tidak valid atau sudah kedaluwarsa.',
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