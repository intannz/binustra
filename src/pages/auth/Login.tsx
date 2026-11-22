// src/pages/auth/Login.tsx

import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiHeadphones } from 'react-icons/fi';
import styles from './Login.module.css';

import { useAuth } from '../../hooks/useAuth';
import { isApiError } from '../../services/api';
import { getDashboardPath } from '../../utils/routes';

// Sesuaikan path import dengan struktur foldermu
import logo from '../../assets/logo.png';
import ilustrasi from '../../assets/ilustrasi-siswa-smk.png';

function getLoginErrorMessage(err: unknown): string {
  if (isApiError(err)) {
    if (err.code === 'UNAUTHORIZED') return 'Nomor Induk atau Kata Sandi salah!';
    return err.message;
  }
  return 'Terjadi kesalahan saat masuk. Silakan coba lagi.';
}

export default function Login() {
  const { login, isAuthenticated, role, sessionExpired } = useAuth();
  const [nomorInduk, setNomorInduk] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sudah login (termasuk sesaat setelah login berhasil): langsung ke dashboard sesuai role
  if (isAuthenticated) {
    return <Navigate to={getDashboardPath(role)} replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login({ nomorInduk, password });
    } catch (err) {
      setError(getLoginErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pesan gagal login didahulukan, bila tidak ada tampilkan info sesi berakhir
  const notice = error || (sessionExpired ? 'Sesi berakhir. Silakan masuk kembali.' : '');

  return (
    <div className={styles.container}>
      {/* Bagian Kiri - Logo & Ilustrasi */}
      <div className={styles.leftPanel}>
        <img src={logo} alt="Binustra Logo" className={styles.logo} />
        <img src={ilustrasi} alt="Ilustrasi Siswa SMK" className={styles.illustration} />
      </div>

      {/* Bagian Kanan - Card Form Login */}
      <div className={styles.rightPanel}>
        <div className={styles.loginCard}>
          <h1 className={styles.title}>Selamat Datang!</h1>
          <p className={styles.subtitle}>
            Senang melihatmu kembali! Akses informasi dan aktivitas akademikmu dalam satu portal.
          </p>

          {notice && <div className={styles.errorMessage}>{notice}</div>}

          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="nomorInduk">Nomor Induk</label>
              <input
                type="text"
                id="nomorInduk"
                placeholder="Masukkan Nomor Induk"
                value={nomorInduk}
                onChange={(e) => setNomorInduk(e.target.value)}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password">Kata Sandi</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="Masukkan kata sandi Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <FiEye /> : <FiEyeOff />}
                </button>
              </div>
            </div>

            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? 'MEMPROSES...' : 'MASUK'}
            </button>
          </form>

          <div className={styles.divider}>
            <span>atau</span>
          </div>

          <div className={styles.supportInfo}>
            <FiHeadphones className={styles.supportIcon} />
            <div className={styles.supportText}>
              <span>Mengalami kendala saat masuk?</span>
              <a href="mailto:it-support@binustra.sch.id">Hubungi IT Support sekolah.</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}