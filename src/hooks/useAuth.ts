import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '../context/auth.context';

/** Akses sesi dan fungsi login atau logout. Hanya bisa dipakai di dalam <AuthProvider> */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus dipakai di dalam <AuthProvider>.');
  }
  return context;
}
