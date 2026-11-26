import { useState, type FormEvent } from 'react';
import { 
  FiChevronRight, FiSearch, FiUsers,
  FiCheckCircle, FiAlertCircle, FiCopy, FiRefreshCw
} from 'react-icons/fi';
import Sidebar from '../../../components/layout/Sidebar';
import Footer from '../../../components/layout/Footer';
import NotificationBell from '../../../components/layout/NotificationBell';
import ProfileMenu from '../../../components/layout/ProfileMenu';
import styles from './MonitoringTagihan.module.css';

import { useApi } from '../../../hooks/useApi';
import type { ApiError } from '../../../services/api';
import { getStatusTagihanKelas } from '../../../services/keuangan.service';
import { describeError, getKelasIdTersimpan, isUuid, simpanKelasId } from '../../../utils/absensi';
import { STATUS_KELAS_PAGE_SIZE } from '../../../utils/keuangan';

/* ========================================================================== */
/* Helper                                                                     */
/* ========================================================================== */

/** Pesan error G-KEU-1. 403 berarti guru bukan wali kelas, bukan kegagalan jaringan */
function describeStatusKelasError(error: ApiError): { message: string; canRetry: boolean } {
  switch (error.status) {
    case 403:
      return {
        message:
          'Status pembayaran hanya dapat dilihat oleh wali kelas. Anda bukan wali kelas dari kelas ini, jadi periksa kembali ID kelas atau gunakan ID kelas perwalian Anda.',
        canRetry: false,
      };
    case 404:
      return { message: 'Kelas tidak ditemukan. Periksa kembali ID kelas.', canRetry: false };
    default:
      return {
        message: describeError(error, 'Status pembayaran kelas belum dapat dimuat.'),
        canRetry: true,
      };
  }
}

/* ========================================================================== */
/* Halaman                                                                    */
/* ========================================================================== */

export default function MonitoringTagihan() {
  /* ---------- Kelas ---------- */
  const [kelasId, setKelasId] = useState(getKelasIdTersimpan);
  const [kelasDraft, setKelasDraft] = useState(kelasId);
  const [kelasError, setKelasError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const statusKey = kelasId !== '' ? `guru:keuangan:status:${kelasId}:${page}` : null;
  const statusApi = useApi(statusKey, (signal) =>
    getStatusTagihanKelas(kelasId, { page, limit: STATUS_KELAS_PAGE_SIZE }, { signal }),
  );

  // useApi mempertahankan data lama saat key berganti, jadi baris hanya dipakai bila sudah final
  const isReady = statusKey !== null && !statusApi.loading && !statusApi.error;
  const rows = isReady ? (statusApi.data?.data ?? []) : [];
  const meta = isReady ? statusApi.data?.meta : undefined;
  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / Math.max(meta.limit, 1))) : 1;

  const jumlahLunas = rows.filter((siswa) => siswa.status === 'Lunas').length;
  const jumlahBelum = rows.length - jumlahLunas;
  const formatJumlah = (value: number | undefined): string =>
    isReady && value !== undefined ? `${value} Siswa` : '-';

  // Filter siswa berdasarkan input pencarian
  const filteredTagihan = rows.filter((siswa) =>
    siswa.nama.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const errorView = statusApi.error ? describeStatusKelasError(statusApi.error) : null;

  let emptyMessage = 'Belum ada siswa di kelas ini.';
  if (kelasId === '') emptyMessage = 'Masukkan ID kelas untuk menampilkan status pembayaran siswa.';
  else if (statusApi.error) emptyMessage = 'Status pembayaran kelas belum dapat ditampilkan.';
  else if (rows.length > 0) emptyMessage = 'Tidak ada siswa yang cocok dengan pencarian.';

  /* ---------- Handler ---------- */
  const handleKelasSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = kelasDraft.trim();
    if (!isUuid(trimmed)) {
      setKelasError('ID kelas harus berupa UUID yang valid.');
      return;
    }
    setKelasError(null);
    simpanKelasId(trimmed);
    setKelasId(trimmed);
    setKelasDraft(trimmed);
    setPage(1);
    setCopyFeedback(null);
  };

  const handleCopyReminder = async (nama: string, status: string) => {
    const message = [
      `Yth. ${nama}, berdasarkan data administrasi kelas terdapat tunggakan dengan status ${status}.`,
      'Mohon memeriksa rincian tagihan dan menindaklanjuti pembayaran melalui Tata Usaha/Bendahara sekolah.',
      'Terima kasih.',
    ].join(' ');

    if (!navigator.clipboard) {
      setCopyFeedback({
        kind: 'error',
        text: 'Fitur salin tidak tersedia di browser ini. Silakan coba browser yang mendukung clipboard.',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(message);
      setCopyFeedback({
        kind: 'success',
        text: `Template pengingat untuk ${nama} berhasil disalin ke clipboard (siap ditempel ke WhatsApp).`,
      });
    } catch (error) {
      setCopyFeedback({
        kind: 'error',
        text: error instanceof Error
          ? `Pengingat tidak dapat disalin: ${error.message}`
          : 'Pengingat tidak dapat disalin. Silakan coba lagi.',
      });
    }
  };

  return (
    <div className={`${styles.layout} appLayout`}>
      <Sidebar />
      
      <main className={styles.mainContent}>
        {/* --- Header / Breadcrumb --- */}
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <span>Dashboard Guru</span> <FiChevronRight /> <strong>Keuangan</strong>
          </div>
          <div className={styles.headerActions}>
            <NotificationBell />
            <ProfileMenu />
          </div>
        </header>

        <div className={styles.contentWrapper}>
          {/* --- Judul Halaman --- */}
          <div className={styles.pageTitleBox}>
            <p className={styles.subtitle}>PORTAL AKADEMIK / Guru</p>
            <h1>Monitoring Administrasi Kelas</h1>
            <p className={styles.description}>
              Data disinkronkan secara read-only dari bagian Keuangan/TU. Wali kelas dapat memantau siswa yang memiliki tunggakan untuk tindak lanjut pembinaan.
            </p>
          </div>

          {/* --- Pilih Kelas --- */}
          <form className={styles.kelasBar} onSubmit={handleKelasSubmit} noValidate>
            <div className={styles.filterField}>
              <label htmlFor="keuangan-kelas-id">ID kelas</label>
              <input
                id="keuangan-kelas-id"
                type="text"
                className={`${styles.filterControl} ${styles.kelasInput}`}
                placeholder="Contoh: 7f1c2a3b-0000-4000-8000-000000000000"
                value={kelasDraft}
                onChange={(event) => setKelasDraft(event.target.value)}
                aria-invalid={kelasError !== null}
              />
            </div>
            <button type="submit" className={styles.btnApply}>Terapkan</button>
            {kelasError && <p className={styles.fieldError}>{kelasError}</p>}
          </form>

          {errorView && (
            <div className={styles.alertError} role="alert">
              <FiAlertCircle />
              <span>{errorView.message}</span>
              {errorView.canRetry && (
                <button type="button" className={styles.retryBtn} onClick={() => statusApi.refetch()}>
                  <FiRefreshCw /> Coba lagi
                </button>
              )}
            </div>
          )}

          {/* --- Summary Grid (3 Kolom) --- */}
          <div className={styles.summaryGrid} aria-busy={statusApi.loading}>
            <div className={styles.statCard}>
              <div className={styles.iconBoxBlue}><FiUsers /></div>
              <div>
                <p className={styles.statLabel}>Total Siswa Kelas</p>
                <h3>{formatJumlah(meta?.total)}</h3>
                <p className={styles.statSub}>Kelas perwalian Anda</p>
              </div>
            </div>
            
            <div className={styles.statCard}>
              <div className={styles.iconBoxGreen}><FiCheckCircle /></div>
              <div>
                <p className={styles.statLabel}>Sudah Lunas</p>
                <h3>{formatJumlah(jumlahLunas)}</h3>
                <p className={styles.statSub}>Semua tagihan lunas{totalPages > 1 ? ' (halaman ini)' : ''}</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.iconBoxYellow}><FiAlertCircle /></div>
              <div>
                <p className={styles.statLabel}>Belum Dibayar</p>
                <h3>{formatJumlah(jumlahBelum)}</h3>
                <p className={styles.statSub}>Perlu diingatkan{totalPages > 1 ? ' (halaman ini)' : ''}</p>
              </div>
            </div>
          </div>

          {/* --- Tabel Daftar Tagihan --- */}
          <div className={styles.cardFull}>
            <div className={styles.cardHeaderFlex}>
              <div>
                <h3>Status Pembayaran Siswa</h3>
                <p className={styles.cardSubtitle}>
                  Gunakan tombol Salin Pengingat untuk menyalin format pesan tagihan ke clipboard sebelum dikirim ke siswa atau orang tua.
                </p>
              </div>
              <div className={styles.searchContainer}>
                <FiSearch className={styles.searchIcon} />
                <input 
                  type="text" 
                  placeholder="Cari nama siswa..." 
                  className={styles.searchInput}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            {copyFeedback && (
              <p
                className={copyFeedback.kind === 'success' ? styles.copySuccess : styles.copyError}
                role={copyFeedback.kind === 'success' ? 'status' : 'alert'}
              >
                {copyFeedback.kind === 'success' && <FiCheckCircle aria-hidden="true" />}
                {copyFeedback.text}
              </p>
            )}

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Siswa</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {statusApi.loading ? (
                    <tr>
                      <td colSpan={3} className={styles.stateCell} role="status">Memuat status pembayaran kelas…</td>
                    </tr>
                  ) : filteredTagihan.length === 0 ? (
                    <tr>
                      <td colSpan={3} className={styles.stateCell}>{emptyMessage}</td>
                    </tr>
                  ) : (
                    filteredTagihan.map((item) => (
                      <tr key={item.siswaId}>
                        <td><strong>{item.nama}</strong></td>
                        <td>
                          <span className={item.status === 'Lunas' ? styles.statusLunas : styles.statusBelum}>
                            {item.status === 'Lunas' ? 'Lunas' : 'Belum dibayar'}
                          </span>
                        </td>
                        <td>
                          <button 
                            type="button"
                            className={styles.btnReminder}
                            onClick={() => { void handleCopyReminder(item.nama, item.status); }}
                            disabled={item.status === 'Lunas'}
                            title={item.status === 'Lunas' ? 'Sudah lunas' : 'Salin template pengingat'}
                            aria-label={`Salin pengingat untuk ${item.nama}`}
                          >
                            <FiCopy /> Salin Pengingat
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || statusApi.loading}
                >
                  Sebelumnya
                </button>
                <span>Halaman {page} dari {totalPages}</span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages || statusApi.loading}
                >
                  Berikutnya
                </button>
              </div>
            )}
          </div>

        </div>
        <Footer />
      </main>
    </div>
  );
}
