// src/pages/auth/Login.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiHeadphones } from 'react-icons/fi';
import styles from './Login.module.css';

// Import data dummy
import { dummyUsers } from '../../data/dummyUsers';

// Sesuaikan path import dengan struktur foldermu
import logo from '../../assets/logo.png';
import ilustrasi from '../../assets/ilustrasi-siswa-smk.png';

export default function Login() {
  const navigate = useNavigate();
  const [nomorInduk, setNomorInduk] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // DUMMY LOGIC: Mencari kecocokan data dari file dummyUsers.ts
    const validUser = dummyUsers.find(
      (user) => user.nomorInduk === nomorInduk && user.password === password
    );

    if (validUser) {
      // Simpan sesi ke localStorage
      localStorage.setItem('role', validUser.role);
      localStorage.setItem('nama', validUser.nama);
      
      // Arahkan ke dashboard sesuai role
      if (validUser.role === 'siswa') {
        navigate('/siswa/dashboard');
      } else if (validUser.role === 'guru') {
        navigate('/guru/dashboard');
      }
    } else {
      setError('Nomor Induk atau Kata Sandi salah!');
    }
  };

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

          {error && <div className={styles.errorMessage}>{error}</div>}

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

            <button type="submit" className={styles.submitButton}>
              MASUK
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