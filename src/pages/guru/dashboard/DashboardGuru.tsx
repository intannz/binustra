import { useState, type ReactNode } from 'react';
import { 
  FiChevronRight, FiCheckCircle, FiUsers,
  FiCalendar, FiFileText, FiUpload, FiCheckSquare 
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Sidebar from '../../../components/layout/Sidebar';
import Footer from '../../../components/layout/Footer';
import NotificationBell from '../../../components/layout/NotificationBell';
import ProfileMenu from '../../../components/layout/ProfileMenu';
import styles from './DashboardGuru.module.css';

import { useApi } from '../../../hooks/useApi';
import { useAuth } from '../../../hooks/useAuth';
import type { ApiError } from '../../../services/api';
import { getRekapAbsensiKelas } from '../../../services/absensi.service';
import { getSiswaBimbingan } from '../../../services/pkl.service';
import {
  describeError,
  formatBulan,
  getKelasIdTersimpan,
  jumlahkanRekap,
  persentaseHadir,
  toMonthValue,
} from '../../../utils/absensi';
import { getInisial } from '../../../utils/formatter';

/* ========================================================================== */
/* Konstanta & helper                                                         */
/* ========================================================================== */

/** Batas maksimum limit di G-PKL-1 dan G-ABS-1, supaya satu kelas atau satu guru muat dalam satu halaman */
const PAGE_SIZE = 100;

/** Jumlah siswa yang ditampilkan pada kartu "Siswa Bimbingan" */
const MAX_SISWA_DITAMPILKAN = 5;

const WARNA_HADIR = '#10b981';
const WARNA_IZIN = '#f59e0b';
const WARNA_SAKIT = '#3b82f6';
const WARNA_ALPA = '#ef4444';
const WARNA_KOSONG = '#e5e7eb';

/** 403 pada G-ABS-1 berarti guru bukan wali kelas atau pengajar kelas yang ID-nya tersimpan */
function describeKelasError(error: ApiError): string {
  if (error.status === 403) {
    return 'Anda bukan wali kelas atau pengajar kelas ini. Periksa ID kelas di halaman Absensi.';
  }
  if (error.status === 404) return 'Kelas tidak ditemukan. Periksa ID kelas di halaman Absensi.';
  return describeError(error, 'Rekap kehadiran kelas belum dapat dimuat.');
}

function StateNote({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <p className={styles.stateNote} role="status">
      {children}
      {onRetry && (
        <>
          {' '}
          <button type="button" className={styles.inlineRetry} onClick={onRetry}>Coba lagi</button>
        </>
      )}
    </p>
  );
}

/* ========================================================================== */
/* Halaman                                                                    */
/* ========================================================================== */

export default function DashboardGuru() {
  const { user } = useAuth();

  const [bulan] = useState(() => toMonthValue(new Date()));
  // ID kelas dibaca dari sumber yang sama dengan halaman Absensi (penyimpanan lokal atau VITE_KELAS_ID)
  const [kelasId] = useState(getKelasIdTersimpan);

  const siswaApi = useApi('dashboard:guru:pkl:siswa', (signal) =>
    getSiswaBimbingan({ page: 1, limit: PAGE_SIZE }, { signal }),
  );
  const rekapKey = kelasId !== '' ? `dashboard:guru:absensi:${kelasId}:${bulan}` : null;
  const rekapApi = useApi(rekapKey, (signal) =>
    getRekapAbsensiKelas(kelasId, { bulan, page: 1, limit: PAGE_SIZE }, { signal }),
  );

  /* ---------- Siswa bimbingan dan laporan ---------- */
  const daftarSiswa = siswaApi.data?.data ?? [];
  const totalSiswa = siswaApi.data?.meta.total;
  const jumlahIndustri = new Set(daftarSiswa.map((siswa) => siswa.industri.nama)).size;
  const laporanMenunggu = daftarSiswa.filter((siswa) => siswa.laporan?.status === 'menunggu').length;
  const siswaReady = siswaApi.data !== undefined;

  /* ---------- Kehadiran kelas ---------- */
  const rekapReady = rekapKey !== null && !rekapApi.loading && !rekapApi.error && rekapApi.data !== undefined;
  const rekapKelas = jumlahkanRekap(rekapReady ? (rekapApi.data?.data ?? []) : []);
  const persentase = rekapReady ? persentaseHadir(rekapKelas) : null;

  const chartData = persentase !== null
    ? [
        { name: 'Hadir', value: rekapKelas.hadir, color: WARNA_HADIR },
        { name: 'Izin', value: rekapKelas.izin, color: WARNA_IZIN },
        { name: 'Sakit', value: rekapKelas.sakit, color: WARNA_SAKIT },
        { name: 'Alpa', value: rekapKelas.alpa, color: WARNA_ALPA },
      ]
    : [{ name: 'Belum ada data', value: 1, color: WARNA_KOSONG }];
  const formatHari = (value: number): string => (rekapReady ? `${value} Hari` : '-');

  let kehadiranSub = 'Rata-rata kehadiran kelas';
  let kehadiranDot = styles.dotYellow;
  let kehadiranNote = 'Belum ada data';
  if (kelasId === '') {
    kehadiranSub = 'ID kelas belum diatur';
    kehadiranNote = 'Atur ID kelas di halaman Absensi';
  } else if (rekapApi.error) {
    kehadiranSub = 'Data kehadiran belum dapat dimuat';
    kehadiranDot = styles.dotRed;
    kehadiranNote = 'Gagal memuat';
  } else if (rekapApi.loading) {
    kehadiranNote = 'Memuat…';
  } else if (persentase !== null) {
    if (persentase >= 90) {
      kehadiranDot = styles.dotGreen;
      kehadiranNote = 'Sangat Baik';
    } else if (persentase >= 75) {
      kehadiranNote = 'Cukup Baik';
    } else {
      kehadiranDot = styles.dotRed;
      kehadiranNote = 'Perlu Ditingkatkan';
    }
  }

  const siswaStatNote = siswaApi.error ? 'Gagal memuat' : siswaReady ? 'Sedang Berjalan' : 'Memuat…';

  return (
    <div className={`${styles.layout} appLayout`}>
      <Sidebar />
      
      <main className={styles.mainContent}>
        {/* --- Header / Breadcrumb --- */}
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <span>Dashboard Guru</span> <FiChevronRight /> <strong>Beranda</strong>
          </div>
          <div className={styles.headerActions}>
            <NotificationBell />
            <ProfileMenu />
          </div>
        </header>

        <div className={styles.contentWrapper}>
          {/* --- Page Title --- */}
          <div className={styles.pageTitleBox}>
            <p className={styles.subtitle}>PORTAL AKADEMIK / Guru</p>
            <h1>Beranda</h1>
            <p className={styles.description}>Semua informasi sekolahmu, dalam satu tempat.</p>
          </div>

          {/* --- Greeting --- */}
          <div className={styles.greetingBox}>
            <h2>Selamat pagi{user?.nama ? `, ${user.nama}` : ''}!</h2>
            <p>Dampingi perjalanan siswa dan bantu mereka meraih potensi terbaik.<br/>Semua perkembangan kelas tersedia di sini.</p>
            <div className={styles.badge}>
              <FiCheckCircle /> Guru pembimbing PKL
            </div>
          </div>

          {/* --- 3 Stats Cards (Khusus Guru) --- */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.iconBox}><FiUsers /></div>
              </div>
              <p className={styles.statLabel}>Siswa bimbingan</p>
              <h3>{siswaReady ? `${totalSiswa ?? daftarSiswa.length} siswa` : '-'}</h3>
              <p className={styles.statSub}>{siswaReady ? `Tersebar di ${jumlahIndustri} industri` : 'Data siswa belum tersedia'}</p>
              <div className={styles.statusIndicator}>
                <span className={siswaApi.error ? styles.dotRed : styles.dotBlue}></span> {siswaStatNote}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.iconBox}><FiCalendar /></div>
              </div>
              <p className={styles.statLabel}>Kehadiran bulan ini</p>
              <h3>{persentase === null ? '-' : `${persentase} %`}</h3>
              <p className={styles.statSub}>{kehadiranSub}</p>
              <div className={styles.statusIndicator}><span className={kehadiranDot}></span> {kehadiranNote}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.iconBox}><FiFileText /></div>
              </div>
              <p className={styles.statLabel}>Laporan perlu verifikasi</p>
              <h3>{siswaReady ? `${laporanMenunggu} laporan` : '-'}</h3>
              <p className={styles.statSub}>Menunggu persetujuan Anda</p>
              <div className={styles.statusIndicator}>
                <span className={laporanMenunggu > 0 ? styles.dotYellow : styles.dotGreen}></span>{' '}
                {!siswaReady ? 'Memuat…' : laporanMenunggu > 0 ? 'Tinjau laporan' : 'Tidak ada antrean'}
              </div>
            </div>
          </div>

          {/* --- Main Grid (2 Columns) --- */}
          <div className={styles.mainGrid}>
            
            {/* Kolom Kiri */}
            <div className={styles.leftColumn}>
              {/* Card Siswa Bimbingan */}
              <div className={styles.card}>
                <div className={styles.cardHeaderFlex}>
                  <h3>Siswa Bimbingan</h3>
                  <Link to="/guru/pkl">Lihat detail <FiChevronRight /></Link>
                </div>
                {daftarSiswa.length > 0 ? (
                  <div className={styles.studentList}>
                    {daftarSiswa.slice(0, MAX_SISWA_DITAMPILKAN).map((siswa) => (
                      <div className={styles.studentItem} key={siswa.siswaId}>
                        <div className={styles.studentAvatar}>{getInisial(siswa.nama)}</div>
                        <div className={styles.studentInfo}>
                          <h4>{siswa.nama}</h4>
                          <p>{siswa.industri.nama}</p>
                        </div>
                        <span className={styles.badgeSuccessLight}>PKL {siswa.statusPkl}</span>
                      </div>
                    ))}
                  </div>
                ) : siswaApi.loading ? (
                  <StateNote>Memuat siswa bimbingan…</StateNote>
                ) : siswaApi.error ? (
                  <StateNote onRetry={() => siswaApi.refetch()}>
                    {describeError(siswaApi.error, 'Siswa bimbingan belum dapat dimuat.')}
                  </StateNote>
                ) : (
                  <StateNote>Belum ada siswa bimbingan.</StateNote>
                )}
              </div>

              {/* Card Laporan Verifikasi */}
              <div className={styles.card}>
                <div className={styles.cardHeaderFlex}>
                  <h3>Laporan menunggu verifikasi</h3>
                  <Link to="/guru/pkl">Lihat detail <FiChevronRight /></Link>
                </div>
                <div className={styles.verificationBox}>
                  <div className={styles.verifIcon}><FiFileText /></div>
                  <div className={styles.verifText}>
                    {siswaReady ? (
                      <>
                        <h4>
                          {laporanMenunggu > 0
                            ? `${laporanMenunggu} Laporan perlu ditinjau`
                            : 'Tidak ada laporan yang menunggu'}
                        </h4>
                        <p>
                          {laporanMenunggu > 0
                            ? 'Periksa laporan dan berikan penilaian siswa'
                            : 'Semua laporan yang masuk sudah Anda periksa'}
                        </p>
                      </>
                    ) : (
                      <>
                        <h4>{siswaApi.error ? 'Laporan belum dapat dimuat' : 'Memuat laporan…'}</h4>
                        <p>Periksa laporan dan berikan penilaian siswa</p>
                      </>
                    )}
                  </div>
                </div>
                <Link to="/guru/pkl" className={styles.primaryButton}>
                  <FiUpload className={styles.btnIcon} /> Tinjau laporan
                </Link>
              </div>
            </div>

            {/* Kolom Kanan */}
            <div className={styles.rightColumn}>
              {/* Card Rekap Kehadiran */}
              <div className={styles.card}>
                <div className={styles.cardHeaderFlex}>
                  <h3>Rekap Kehadiran</h3>
                  <Link to="/guru/absensi">Lihat detail <FiChevronRight /></Link>
                </div>
                <p className={styles.monthLabel}>{formatBulan(bulan)}</p>
                <div className={styles.chartContainer}>
                  <div className={styles.chartWrapper}>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={chartData} innerRadius={50} outerRadius={65} dataKey="value" stroke="none">
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className={styles.chartCenterText}>
                      {rekapApi.loading ? '…' : persentase === null ? '-' : `${persentase}%`}
                    </div>
                  </div>
                  <div className={styles.chartLegend}>
                    <p><span className={styles.dotGreen}></span> Hadir <span>{formatHari(rekapKelas.hadir)}</span></p>
                    <p><span className={styles.dotYellow}></span> Izin <span>{formatHari(rekapKelas.izin)}</span></p>
                    <p><span className={styles.dotBlue}></span> Sakit <span>{formatHari(rekapKelas.sakit)}</span></p>
                    <p><span className={styles.dotRed}></span> Alpa <span>{formatHari(rekapKelas.alpa)}</span></p>
                  </div>
                </div>
                {kelasId === '' ? (
                  <StateNote>
                    ID kelas belum diatur. Isi ID kelas di <Link to="/guru/absensi">halaman Absensi</Link> untuk menampilkan rekap.
                  </StateNote>
                ) : rekapApi.error ? (
                  <StateNote onRetry={rekapApi.error.status === 403 ? undefined : () => rekapApi.refetch()}>
                    {describeKelasError(rekapApi.error)}
                  </StateNote>
                ) : persentase === null ? (
                  <StateNote>{rekapApi.loading ? 'Memuat rekap kehadiran…' : 'Belum ada data kehadiran bulan ini.'}</StateNote>
                ) : persentase >= 90 ? (
                  <div className={styles.praiseBox}>
                    <FiCheckCircle /> Kehadiran kelas sudah bagus. Pertahankan!
                  </div>
                ) : (
                  <StateNote>Kehadiran kelas bulan ini masih bisa ditingkatkan.</StateNote>
                )}
              </div>

              {/* Card Akses Cepat */}
              <div className={styles.card}>
                <h3>Akses cepat</h3>
                <div className={styles.quickAccessList}>
                  <Link to="/guru/pkl" className={styles.quickAccessItem}>
                    <div className={styles.quickIcon}><FiFileText /></div>
                    <div className={styles.quickText}>
                      <h4>Input nilai PKL</h4>
                      <p>Penilaian siswa bimbingan</p>
                    </div>
                    <FiChevronRight className={styles.quickArrow} />
                  </Link>
                  <Link to="/guru/absensi" className={styles.quickAccessItem}>
                    <div className={styles.quickIcon}><FiCheckSquare /></div>
                    <div className={styles.quickText}>
                      <h4>Validasi surat izin</h4>
                      <p>Tinjau pengajuan siswa</p>
                    </div>
                    <FiChevronRight className={styles.quickArrow} />
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
}
