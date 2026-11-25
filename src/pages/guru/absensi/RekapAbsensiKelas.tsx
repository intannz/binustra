import { useState, type FormEvent } from 'react';
import {
  FiBell, FiChevronRight, FiCheck, FiImage, FiDownload, FiAlertCircle, FiRefreshCw
} from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Sidebar from '../../../components/layout/Sidebar';
import Footer from '../../../components/layout/Footer';
import styles from './RekapAbsensiKelas.module.css';

import { useApi } from '../../../hooks/useApi';
import { useAuth } from '../../../hooks/useAuth';
import { getFieldErrors, isApiError } from '../../../services/api';
import {
  downloadLampiranIzin,
  getDaftarIzin,
  getDetailIzin,
  getRekapAbsensiKelas,
  inputAbsensiKelas,
  putuskanIzin,
} from '../../../services/absensi.service';
import type {
  FileAcceptType,
  InputAbsensiKelasPayload,
  IzinDetail,
  IzinListItem,
  JenisIzin,
  KeputusanIzinPayload,
  StatusIzin,
  StatusKehadiran,
  Uuid,
} from '../../../types/portal.types';
import {
  LAMPIRAN_MIME_TYPES,
  describeError,
  extensionForMime,
  formatBulan,
  getKelasIdTersimpan,
  isUuid,
  isValidMonth,
  jumlahkanRekap,
  persentaseHadir,
  saveBlob,
  simpanKelasId,
  toDateInputValue,
  toMonthValue,
} from '../../../utils/absensi';
import { formatTanggal, getInisial } from '../../../utils/formatter';

/* ========================================================================== */
/* Konstanta & helper                                                         */
/* ========================================================================== */

/** Batas maksimum limit di G-ABS-1 dan G-ABS-3, supaya satu kelas muat dalam satu halaman */
const PAGE_SIZE = 100;

/** Batas panjang catatan keputusan di G-ABS-5 */
const MAX_CATATAN = 1000;

const WARNA_HADIR = '#10b981';
const WARNA_IZIN = '#f59e0b';
const WARNA_SAKIT = '#3b82f6';
const WARNA_ALPA = '#ef4444';
const WARNA_KOSONG = '#e5e7eb';

const STATUS_KEHADIRAN_OPTIONS: { value: StatusKehadiran; label: string }[] = [
  { value: 'hadir', label: 'Hadir' },
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'alpa', label: 'Alpa' },
];

function isStatusKehadiran(value: string): value is StatusKehadiran {
  return STATUS_KEHADIRAN_OPTIONS.some((option) => option.value === value);
}

const STATUS_IZIN_OPTIONS: { value: StatusIzin; label: string }[] = [
  { value: 'menunggu', label: 'Menunggu' },
  { value: 'disetujui', label: 'Disetujui' },
  { value: 'ditolak', label: 'Ditolak' },
];

function isStatusIzin(value: string): value is StatusIzin {
  return STATUS_IZIN_OPTIONS.some((option) => option.value === value);
}

const STATUS_IZIN_LABEL: Record<StatusIzin, string> = {
  menunggu: 'menunggu persetujuan',
  disetujui: 'disetujui',
  ditolak: 'ditolak',
};

const JENIS_IZIN_LABEL: Record<JenisIzin, string> = {
  izin: 'Izin',
  sakit: 'Sakit',
};

function getIzinBadgeClass(status: StatusIzin): string {
  if (status === 'disetujui') return styles.badgeSuccess;
  if (status === 'ditolak') return styles.badgeDanger;
  return styles.badgeWarning;
}

function formatRentang(mulai: string, selesai: string): string {
  return mulai === selesai ? formatTanggal(mulai) : `${formatTanggal(mulai)} - ${formatTanggal(selesai)}`;
}

/* ---------- Lampiran izin (G-ABS-4 versi file) ---------- */

/** Kegagalan yang tidak akan membaik bila tipe Accept lain dicoba */
const FATAL_LAMPIRAN_CODES: readonly string[] = [
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NETWORK_ERROR',
  'INTERNAL_ERROR',
];

/**
 * Server mengalirkan lampiran sesuai header Accept, sedangkan tipe berkas yang diunggah siswa
 * tidak diketahui dari data izin. Tiap tipe dicoba berurutan sampai ada yang berhasil.
 */
async function ambilLampiran(id: Uuid): Promise<{ blob: Blob; mime: FileAcceptType | string }> {
  let lastError: unknown = null;

  for (const accept of LAMPIRAN_MIME_TYPES) {
    try {
      const blob = await downloadLampiranIzin(id, accept);
      // Respons JSON berarti server tidak mengirim berkas untuk tipe ini
      if (!blob.type.includes('json')) return { blob, mime: blob.type || accept };
    } catch (err) {
      if (isApiError(err) && FATAL_LAMPIRAN_CODES.includes(err.code)) throw err;
      lastError = err;
    }
  }

  throw lastError ?? new Error('Lampiran tidak ditemukan.');
}

/* ---------- Kegagalan keputusan izin (G-ABS-5) ---------- */

interface DecisionFailure {
  message: string;
  catatanError: string | null;
  /** true bila data di layar sudah tidak sesuai dengan server dan perlu dimuat ulang */
  staleState: boolean;
}

function toDecisionFailure(err: unknown): DecisionFailure {
  if (!isApiError(err)) {
    return { message: 'Terjadi kesalahan saat menyimpan keputusan. Silakan coba lagi.', catatanError: null, staleState: false };
  }

  switch (err.code) {
    case 'IZIN_SUDAH_DIPUTUSKAN':
      return {
        message: 'Izin ini sudah diputuskan sebelumnya dan tidak dapat diputuskan ulang.',
        catatanError: null,
        staleState: true,
      };
    case 'FORBIDDEN':
      return { message: 'Anda tidak memiliki akses untuk memutuskan izin ini.', catatanError: null, staleState: false };
    case 'NOT_FOUND':
      return { message: 'Pengajuan izin tidak ditemukan.', catatanError: null, staleState: true };
    case 'VALIDATION_ERROR':
    case 'BAD_REQUEST': {
      const catatanError = getFieldErrors(err).catatan ?? null;
      return {
        message: catatanError ? 'Periksa kembali catatan penolakan.' : describeError(err, err.message),
        catatanError,
        staleState: false,
      };
    }
    default:
      return { message: err.message, catatanError: null, staleState: false };
  }
}

/* ---------- Kegagalan input absensi (G-ABS-2) ---------- */

interface SaveFailure {
  message: string;
  tanggalError: string | null;
  staleState: boolean;
}

function toSaveFailure(err: unknown): SaveFailure {
  if (!isApiError(err)) {
    return { message: 'Terjadi kesalahan saat menyimpan kehadiran. Silakan coba lagi.', tanggalError: null, staleState: false };
  }

  switch (err.code) {
    case 'SISWA_BUKAN_ANGGOTA_KELAS':
      return {
        message: 'Ada siswa yang bukan anggota kelas ini. Daftar siswa dimuat ulang, silakan coba lagi.',
        tanggalError: null,
        staleState: true,
      };
    case 'SISWA_DUPLIKAT':
      return {
        message: 'Ada siswa ganda pada data yang dikirim. Muat ulang daftar siswa lalu coba lagi.',
        tanggalError: null,
        staleState: true,
      };
    case 'FORBIDDEN':
      return { message: 'Anda bukan wali kelas atau pengajar kelas ini.', tanggalError: null, staleState: false };
    case 'NOT_FOUND':
      return { message: 'Kelas tidak ditemukan. Periksa kembali ID kelas.', tanggalError: null, staleState: false };
    case 'VALIDATION_ERROR':
    case 'BAD_REQUEST': {
      const tanggalError = getFieldErrors(err).tanggal ?? null;
      return {
        message: tanggalError ? 'Periksa kembali tanggal kehadiran.' : describeError(err, err.message),
        tanggalError,
        staleState: false,
      };
    }
    default:
      return { message: err.message, tanggalError: null, staleState: false };
  }
}

/* ========================================================================== */
/* Panel keputusan satu pengajuan izin                                        */
/* ========================================================================== */

interface IzinPanelProps {
  item: IzinListItem;
  /** Dipanggil setelah keputusan tersimpan di server */
  onDecided: (updated: IzinDetail) => void;
  /** Dipanggil bila data di layar sudah tidak sesuai dengan server */
  onStale: () => void;
}

function IzinPanel({ item, onDecided, onStale }: IzinPanelProps) {
  const detail = useApi<IzinDetail>(`guru:izin:detail:${item.id}`, (signal) =>
    getDetailIzin(item.id, { signal }),
  );

  const [decided, setDecided] = useState<IzinDetail | null>(null);
  const izin = decided ?? detail.data;
  const status: StatusIzin = izin?.status ?? item.status;

  /* ---------- Unduh lampiran ---------- */
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const { blob, mime } = await ambilLampiran(item.id);
      saveBlob(blob, `lampiran-izin-${item.siswa.nis}${extensionForMime(mime)}`);
    } catch (err) {
      setDownloadError(describeError(err, 'Lampiran gagal diunduh. Silakan coba lagi.'));
    } finally {
      setIsDownloading(false);
    }
  };

  /* ---------- Keputusan ---------- */
  const [isRejecting, setIsRejecting] = useState(false);
  const [catatan, setCatatan] = useState('');
  const [catatanError, setCatatanError] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [isDeciding, setIsDeciding] = useState(false);

  const submitDecision = async (payload: KeputusanIzinPayload) => {
    setIsDeciding(true);
    setCatatanError(null);
    setDecisionError(null);
    try {
      const updated = await putuskanIzin(item.id, payload);
      setDecided(updated);
      onDecided(updated);
    } catch (err) {
      const failure = toDecisionFailure(err);
      setDecisionError(failure.message);
      setCatatanError(failure.catatanError);
      if (failure.staleState) onStale();
    } finally {
      setIsDeciding(false);
    }
  };

  const handleApprove = () => {
    void submitDecision({ status: 'disetujui' });
  };

  /** G-ABS-5: catatan wajib bila ditolak, dicek di sini sebelum request dikirim */
  const handleRejectSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = catatan.trim();
    if (trimmed === '') {
      setCatatanError('Catatan wajib diisi saat menolak izin.');
      setDecisionError(null);
      return;
    }
    if (trimmed.length > MAX_CATATAN) {
      setCatatanError(`Catatan maksimal ${MAX_CATATAN} karakter.`);
      setDecisionError(null);
      return;
    }

    void submitDecision({ status: 'ditolak', catatan: trimmed });
  };

  const cancelReject = () => {
    setIsRejecting(false);
    setCatatan('');
    setCatatanError(null);
    setDecisionError(null);
  };

  /* ---------- Tampilan ---------- */
  const keterangan = izin
    ? izin.keterangan ?? 'Tanpa keterangan'
    : detail.loading
      ? 'Memuat detail…'
      : 'Keterangan tidak dapat dimuat';

  return (
    <div className={styles.izinContent}>
      <h4>{item.siswa.nama}</h4>
      <p className={styles.izinDetailTight}>{item.siswa.kelas} • NIS {item.siswa.nis}</p>
      <p className={styles.izinDetail}>
        {formatRentang(item.tanggalMulai, item.tanggalSelesai)} • {JENIS_IZIN_LABEL[item.jenis]} • {keterangan}
      </p>

      {detail.error && !izin && (
        <div className={styles.alertError} role="alert">
          <FiAlertCircle />
          <span>{describeError(detail.error, 'Detail pengajuan belum dapat dimuat.')}</span>
          <button type="button" className={styles.retryBtn} onClick={() => detail.refetch()}>
            <FiRefreshCw /> Coba lagi
          </button>
        </div>
      )}

      <div className={styles.fileBox}>
        <FiImage className={styles.fileIcon} />
        <span>Lampiran surat izin</span>
        <button
          type="button"
          className={styles.fileDownloadBtn}
          onClick={handleDownload}
          disabled={isDownloading}
        >
          <FiDownload /> {isDownloading ? 'Mengunduh…' : 'Unduh'}
        </button>
      </div>
      {downloadError && <div className={styles.alertError} role="alert"><FiAlertCircle /> {downloadError}</div>}
      {decisionError && <div className={styles.alertError} role="alert"><FiAlertCircle /> {decisionError}</div>}

      {status === 'menunggu' ? (
        isRejecting ? (
          <form className={styles.rejectForm} onSubmit={handleRejectSubmit} noValidate>
            <label htmlFor="catatan-penolakan">Catatan penolakan (wajib)</label>
            <textarea
              id="catatan-penolakan"
              rows={3}
              maxLength={MAX_CATATAN}
              placeholder="Jelaskan alasan izin ditolak"
              value={catatan}
              onChange={(event) => setCatatan(event.target.value)}
              aria-invalid={catatanError !== null}
            ></textarea>
            {catatanError && <p className={styles.fieldError}>{catatanError}</p>}
            <div className={styles.actionButtons}>
              <button type="submit" className={styles.btnApprove} disabled={isDeciding}>
                {isDeciding ? 'Menyimpan…' : 'Kirim penolakan'}
              </button>
              <button type="button" className={styles.btnReject} onClick={cancelReject} disabled={isDeciding}>
                Batal
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.actionButtons}>
            <button type="button" className={styles.btnApprove} onClick={handleApprove} disabled={isDeciding}>
              <FiCheck /> {isDeciding ? 'Menyimpan…' : 'Setujui izin'}
            </button>
            <button
              type="button"
              className={styles.btnReject}
              onClick={() => setIsRejecting(true)}
              disabled={isDeciding}
            >
              Tolak
            </button>
          </div>
        )
      ) : (
        <>
          <p className={styles.feedbackText}>
            Surat izin telah {STATUS_IZIN_LABEL[status]}
            {izin?.diputuskanPada ? ` pada ${formatTanggal(izin.diputuskanPada)}` : ''}.
          </p>
          {izin?.catatan && (
            <p className={styles.feedbackText}><strong>Catatan:</strong> {izin.catatan}</p>
          )}
        </>
      )}
    </div>
  );
}

/* ========================================================================== */
/* Card validasi surat izin                                                   */
/* ========================================================================== */

function IzinCard() {
  const [statusFilter, setStatusFilter] = useState<StatusIzin>('menunggu');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const list = useApi(`guru:izin:${statusFilter}`, (signal) =>
    getDaftarIzin({ status: statusFilter, page: 1, limit: PAGE_SIZE }, { signal }),
  );

  // useApi mempertahankan data lama saat filter berganti, jadi daftar hanya dipakai bila sudah final
  const items = list.loading || list.error ? [] : (list.data?.data ?? []);
  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null;

  const handleStatusFilterChange = (value: string) => {
    if (!isStatusIzin(value)) return;
    setStatusFilter(value);
    setSelectedId(null);
    setNotice(null);
  };

  const handleDecided = (updated: IzinDetail) => {
    setNotice(
      updated.status === 'ditolak'
        ? `Izin ${updated.siswa.nama} ditolak.`
        : `Izin ${updated.siswa.nama} disetujui dan absensi pada rentang tanggal izin diperbarui.`,
    );
    setSelectedId(null);
    list.refetch();
  };

  let emptyMessage = `Tidak ada pengajuan izin yang ${STATUS_IZIN_LABEL[statusFilter]}.`;
  if (statusFilter === 'menunggu') emptyMessage = 'Tidak ada pengajuan izin yang menunggu persetujuan.';

  return (
    <div className={styles.card}>
      <div className={styles.cardHeaderFlex}>
        <h3>Validasi surat izin</h3>
        {selected && (
          <span className={getIzinBadgeClass(selected.status)}>
            {selected.status === 'menunggu'
              ? 'Menunggu persetujuan'
              : selected.status === 'disetujui'
                ? 'Disetujui'
                : 'Ditolak'}
          </span>
        )}
      </div>

      <div className={styles.filterRow}>
        <div className={styles.filterField}>
          <label htmlFor="filter-status-izin">Status</label>
          <select
            id="filter-status-izin"
            className={styles.filterControl}
            value={statusFilter}
            onChange={(event) => handleStatusFilterChange(event.target.value)}
          >
            {STATUS_IZIN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {items.length > 1 && (
          <div className={styles.filterField}>
            <label htmlFor="pilih-izin">Pengajuan ({items.length})</label>
            <select
              id="pilih-izin"
              className={styles.filterControl}
              value={selected?.id ?? ''}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.siswa.nama} - {formatTanggal(item.tanggalMulai)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {notice && <div className={styles.alertSuccess} role="status">{notice}</div>}

      {list.error && (
        <div className={styles.alertError} role="alert">
          <FiAlertCircle />
          <span>{describeError(list.error, 'Daftar pengajuan izin belum dapat dimuat.')}</span>
          <button type="button" className={styles.retryBtn} onClick={() => list.refetch()}>
            <FiRefreshCw /> Coba lagi
          </button>
        </div>
      )}

      {list.loading ? (
        <p className={styles.feedbackText} role="status">Memuat pengajuan izin…</p>
      ) : selected ? (
        <IzinPanel
          key={selected.id}
          item={selected}
          onDecided={handleDecided}
          onStale={() => list.refetch()}
        />
      ) : (
        !list.error && <p className={styles.feedbackText}>{emptyMessage}</p>
      )}
    </div>
  );
}

/* ========================================================================== */
/* Halaman                                                                    */
/* ========================================================================== */

export default function RekapAbsensiKelas() {
  const { user } = useAuth();

  const [today] = useState(() => toDateInputValue(new Date()));

  /* ---------- Kelas ---------- */
  const [kelasId, setKelasId] = useState(getKelasIdTersimpan);
  const [kelasDraft, setKelasDraft] = useState(kelasId);
  const [kelasError, setKelasError] = useState<string | null>(null);

  /* ---------- Filter & input ---------- */
  const [bulan, setBulan] = useState(() => toMonthValue(new Date()));
  const [tanggal, setTanggal] = useState(today);
  const [page, setPage] = useState(1);
  const [statusMap, setStatusMap] = useState<Record<string, StatusKehadiran | undefined>>({});

  /* ---------- Simpan ---------- */
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tanggalError, setTanggalError] = useState<string | null>(null);

  const clearSaveFeedback = () => {
    setSaveSuccess(null);
    setSaveError(null);
    setTanggalError(null);
  };

  const rekapKey =
    kelasId !== '' && isValidMonth(bulan) ? `guru:absensi:rekap:${kelasId}:${bulan}:${page}` : null;

  const rekapApi = useApi(rekapKey, (signal) =>
    getRekapAbsensiKelas(kelasId, { bulan, page, limit: PAGE_SIZE }, { signal }),
  );

  // useApi mempertahankan data lama saat key berganti, jadi baris hanya dipakai bila sudah final
  const rows = rekapApi.loading || rekapApi.error ? [] : (rekapApi.data?.data ?? []);
  const meta = rekapApi.loading || rekapApi.error ? undefined : rekapApi.data?.meta;
  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / Math.max(meta.limit, 1))) : 1;

  const statsReady = rekapKey !== null && !rekapApi.loading && !rekapApi.error;
  const rekapKelas = jumlahkanRekap(rows);
  const persentase = statsReady ? persentaseHadir(rekapKelas) : null;

  // Data untuk Recharts (Diagram Donat)
  const chartData =
    statsReady && persentase !== null
      ? [
          { name: 'Hadir', value: rekapKelas.hadir, color: WARNA_HADIR },
          { name: 'Izin', value: rekapKelas.izin, color: WARNA_IZIN },
          { name: 'Sakit', value: rekapKelas.sakit, color: WARNA_SAKIT },
          { name: 'Alpa', value: rekapKelas.alpa, color: WARNA_ALPA },
        ]
      : [{ name: 'Belum ada data', value: 1, color: WARNA_KOSONG }];

  const formatJumlah = (value: number): string => (statsReady ? String(value) : '-');

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
    setStatusMap({});
    clearSaveFeedback();
  };

  const handleBulanChange = (value: string) => {
    setBulan(value);
    setPage(1);
  };

  const handleTanggalChange = (value: string) => {
    setTanggal(value);
    // Status yang dipilih berlaku untuk satu tanggal, jadi dikosongkan saat tanggal berganti
    setStatusMap({});
    clearSaveFeedback();
  };

  const handleAttendanceChange = (siswaId: string, value: string) => {
    if (!isStatusKehadiran(value)) return;
    setStatusMap((current) => ({ ...current, [siswaId]: value }));
    setSaveSuccess(null);
  };

  const handleSimpanAbsen = async () => {
    clearSaveFeedback();

    if (tanggal === '') {
      setTanggalError('Tanggal wajib diisi.');
      return;
    }
    if (tanggal > today) {
      setTanggalError('Tanggal tidak boleh di masa depan.');
      return;
    }
    if (rows.length === 0) {
      setSaveError('Belum ada siswa yang dapat disimpan.');
      return;
    }

    const payload: InputAbsensiKelasPayload = {
      tanggal,
      data: rows.map((row) => ({
        siswaId: row.siswaId,
        status: statusMap[row.siswaId] ?? 'hadir',
      })),
    };

    setIsSaving(true);
    try {
      const result = await inputAbsensiKelas(kelasId, payload);
      setSaveSuccess(
        `Kehadiran tanggal ${formatTanggal(result.tanggal)} untuk ${result.tersimpan} siswa berhasil disimpan.`,
      );
      rekapApi.refetch();
    } catch (err) {
      const failure = toSaveFailure(err);
      setSaveError(failure.message);
      setTanggalError(failure.tanggalError);
      if (failure.staleState) rekapApi.refetch();
    } finally {
      setIsSaving(false);
    }
  };

  let emptyMessage = 'Belum ada siswa di kelas ini.';
  if (kelasId === '') emptyMessage = 'Masukkan ID kelas untuk menampilkan daftar siswa.';
  else if (!isValidMonth(bulan)) emptyMessage = 'Pilih bulan yang valid untuk menampilkan rekap.';
  else if (rekapApi.error) emptyMessage = 'Data kehadiran kelas belum dapat ditampilkan.';

  return (
    <div className={`${styles.layout} appLayout`}>
      <Sidebar />
      
      <main className={styles.mainContent}>
        {/* --- Header / Breadcrumb --- */}
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <span>Dashboard Guru</span> <FiChevronRight /> <strong>Absensi</strong>
          </div>
          <div className={styles.headerActions}>
            <FiBell className={styles.bellIcon} />
            <div className={styles.avatar}>{getInisial(user?.nama)}</div>
          </div>
        </header>

        <div className={styles.contentWrapper}>
          {/* --- Judul Halaman --- */}
          <div className={styles.pageTitleBox}>
            <p className={styles.subtitle}>PORTAL AKADEMIK / Guru</p>
            <h1>Absensi & Kehadiran</h1>
            <p className={styles.description}>Kehadiran yang baik, langkah awal untuk berprestasi</p>
          </div>

          {/* --- Pilih Kelas --- */}
          <form className={styles.kelasBar} onSubmit={handleKelasSubmit} noValidate>
            <div className={styles.filterField}>
              <label htmlFor="kelas-id">ID kelas</label>
              <input
                id="kelas-id"
                type="text"
                className={`${styles.filterControl} ${styles.kelasInput}`}
                placeholder="Contoh: 7f1c2a3b-0000-4000-8000-000000000000"
                value={kelasDraft}
                onChange={(event) => setKelasDraft(event.target.value)}
                aria-invalid={kelasError !== null}
              />
            </div>
            <button type="submit" className={styles.btnSave}>Terapkan</button>
            {kelasError && <p className={styles.fieldError}>{kelasError}</p>}
          </form>

          {/* --- Top Grid (Statistik & Validasi) --- */}
          <div className={styles.gridTop}>
            
            {/* Card Statistik Kehadiran */}
            <div className={styles.card}>
              <div className={styles.cardHeaderFlex}>
                <h3>Statistik kehadiran</h3>
                <span className={styles.badgeMonth}>{formatBulan(bulan)}</span>
              </div>

              <div className={styles.filterRow}>
                <div className={styles.filterField}>
                  <label htmlFor="filter-bulan">Bulan</label>
                  <input
                    id="filter-bulan"
                    type="month"
                    className={styles.filterControl}
                    value={bulan}
                    onChange={(event) => handleBulanChange(event.target.value)}
                    aria-invalid={!isValidMonth(bulan)}
                  />
                </div>
              </div>

              <div className={styles.statsLayout} aria-busy={rekapApi.loading}>
                <div className={styles.chartWrapper}>
                  <ResponsiveContainer width={120} height={120}>
                    <PieChart>
                      <Pie data={chartData} innerRadius={45} outerRadius={60} dataKey="value" stroke="none">
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
                <div className={styles.legendWrapper}>
                  <p><span className={styles.dotGreen}></span> Hadir <strong className={styles.legendVal}>{formatJumlah(rekapKelas.hadir)}</strong></p>
                  <p><span className={styles.dotYellow}></span> Izin <strong className={styles.legendVal}>{formatJumlah(rekapKelas.izin)}</strong></p>
                  <p><span className={styles.dotBlue}></span> Sakit <strong className={styles.legendVal}>{formatJumlah(rekapKelas.sakit)}</strong></p>
                  <p><span className={styles.dotRed}></span> Alpa <strong className={styles.legendVal}>{formatJumlah(rekapKelas.alpa)}</strong></p>
                </div>
              </div>
              <p className={styles.legendCaption}>
                Akumulasi kehadiran seluruh siswa pada bulan ini (halaman yang sedang dimuat).
              </p>
            </div>

            {/* Card Validasi Surat Izin */}
            <IzinCard />

          </div>

          {/* --- Tabel Input Kehadiran Kelas --- */}
          <div className={styles.cardFull}>
            <h3>Rekap & input kehadiran kelas</h3>

            <div className={styles.tableFilter}>
              <div className={styles.filterField}>
                <label htmlFor="tanggal-absensi">Tanggal kehadiran</label>
                <input
                  id="tanggal-absensi"
                  type="date"
                  className={styles.filterControl}
                  value={tanggal}
                  max={today}
                  onChange={(event) => handleTanggalChange(event.target.value)}
                  aria-invalid={tanggalError !== null}
                />
                {tanggalError && <p className={styles.fieldError}>{tanggalError}</p>}
              </div>
            </div>

            {rekapApi.error && (
              <div className={styles.alertErrorBar} role="alert">
                <FiAlertCircle />
                <span>{describeError(rekapApi.error, 'Data kehadiran kelas belum dapat dimuat.')}</span>
                <button type="button" className={styles.retryBtn} onClick={() => rekapApi.refetch()}>
                  <FiRefreshCw /> Coba lagi
                </button>
              </div>
            )}

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Siswa</th>
                    <th>NIS</th>
                    <th>Kehadiran</th>
                    <th>Rekap bulan ini</th>
                  </tr>
                </thead>
                <tbody>
                  {rekapApi.loading ? (
                    <tr>
                      <td colSpan={4} className={styles.stateCell} role="status">Memuat data kehadiran kelas…</td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={styles.stateCell}>{emptyMessage}</td>
                    </tr>
                  ) : (
                    rows.map((item) => {
                      const nonHadir = item.izin + item.sakit + item.alpa;
                      return (
                        <tr key={item.siswaId}>
                          <td>{item.nama}</td>
                          <td>{item.nis}</td>
                          <td>
                            <select
                              className={styles.selectInput}
                              value={statusMap[item.siswaId] ?? 'hadir'}
                              onChange={(event) => handleAttendanceChange(item.siswaId, event.target.value)}
                              aria-label={`Kehadiran ${item.nama}`}
                            >
                              {STATUS_KEHADIRAN_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <span className={nonHadir === 0 ? styles.statusHadir : styles.statusLain}>
                              Hadir {item.hadir} • Izin {item.izin} • Sakit {item.sakit} • Alpa {item.alpa}
                            </span>
                          </td>
                        </tr>
                      );
                    })
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
                  disabled={page <= 1 || rekapApi.loading}
                >
                  Sebelumnya
                </button>
                <span>Halaman {page} dari {totalPages}</span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages || rekapApi.loading}
                >
                  Berikutnya
                </button>
              </div>
            )}

            {saveError && (
              <div className={styles.alertErrorBar} role="alert">
                <FiAlertCircle />
                <span>{saveError}</span>
              </div>
            )}
            
            <div className={styles.footerActionBox}>
              <button
                type="button"
                className={styles.btnSave}
                onClick={handleSimpanAbsen}
                disabled={isSaving || rows.length === 0}
              >
                <FiCheck /> {isSaving ? 'Menyimpan…' : 'Simpan kehadiran'}
              </button>
              {saveSuccess && <span className={styles.saveSuccessText} role="status">{saveSuccess}</span>}
            </div>
          </div>

        </div>
        <Footer />
      </main>
    </div>
  );
}
