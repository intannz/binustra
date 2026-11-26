import { useEffect, useState, type FormEvent } from 'react';
import {
  FiChevronRight, FiSearch, FiX, FiFileText, FiCheckCircle,
  FiDownload, FiAlertCircle, FiRefreshCw, FiBriefcase
} from 'react-icons/fi';
import Sidebar from '../../../components/layout/Sidebar';
import Footer from '../../../components/layout/Footer';
import NotificationBell from '../../../components/layout/NotificationBell';
import ProfileMenu from '../../../components/layout/ProfileMenu';
import styles from './InfoPklGuru.module.css';

import { useApi } from '../../../hooks/useApi';
import { getFieldErrors, isApiError } from '../../../services/api';
import {
  downloadLaporanPkl,
  getLaporanPkl,
  getSiswaBimbingan,
  inputNilaiPkl,
  reviewLaporanPkl,
} from '../../../services/pkl.service';
import type {
  InputNilaiPklPayload,
  LaporanPkl,
  NilaiPklGuru,
  ReviewLaporanPayload,
  SiswaBimbingan,
  StatusLaporan,
  StatusPkl,
} from '../../../types/portal.types';
import { formatNilai, formatTanggal } from '../../../utils/formatter';
import {
  getPengajuanMitra,
  putuskanPengajuanMitra,
  subscribePengajuanMitra,
  type PengajuanMitra,
  type StatusPengajuanMitra,
} from '../../../utils/pklMitraStorage';
import { getStoredNilaiPklGuru, saveStoredNilaiPklGuru } from '../../../utils/pklNilaiStorage';

/* ========================================================================== */
/* Konstanta & helper                                                         */
/* ========================================================================== */

/** Batas maksimum limit di G-PKL-1, supaya seluruh siswa bimbingan muat dalam satu halaman */
const PAGE_SIZE = 100;

/** Batas panjang catatan review di G-PKL-3 */
const MAX_CATATAN = 1000;

function readMitraEntries(): { entries: PengajuanMitra[]; error: string | null } {
  try {
    return { entries: getPengajuanMitra(), error: null };
  } catch (error) {
    return {
      entries: [],
      error: error instanceof Error ? error.message : 'Data pengajuan mitra tidak dapat dibaca.',
    };
  }
}

interface NilaiStorageState {
  values: Record<string, NilaiPklGuru | undefined>;
  error: string | null;
}

function readNilaiStorage(): NilaiStorageState {
  try {
    return { values: getStoredNilaiPklGuru(), error: null };
  } catch (error) {
    return {
      values: {},
      error: error instanceof Error ? error.message : 'Nilai PKL tersimpan tidak dapat dibaca.',
    };
  }
}

const STATUS_PKL_LABEL: Record<StatusPkl, string> = {
  'Belum Dimulai': 'Belum dimulai',
  Aktif: 'Sedang berlangsung',
  Selesai: 'Selesai',
};

const STATUS_LAPORAN_LABEL: Record<StatusLaporan, string> = {
  menunggu: 'Menunggu verifikasi',
  revisi: 'Perlu revisi',
  disetujui: 'Terverifikasi',
};

const STATUS_LAPORAN_CLASS: Record<StatusLaporan, string> = {
  menunggu: styles.statusMenunggu,
  revisi: styles.statusRevisi,
  disetujui: styles.statusTerverifikasi,
};

function getLaporanBadge(status: StatusLaporan | null): { label: string; className: string } {
  if (status === null) return { label: 'Belum diunggah', className: styles.statusBelum };
  return { label: STATUS_LAPORAN_LABEL[status], className: STATUS_LAPORAN_CLASS[status] };
}

/** Simpan Blob sebagai berkas lewat tautan sementara */
function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildReviewPayload(decision: 'disetujui' | 'revisi', catatan: string): ReviewLaporanPayload {
  if (decision === 'revisi') return { status: 'revisi', catatan };
  return catatan === '' ? { status: 'disetujui' } : { status: 'disetujui', catatan };
}

/* ---------- Kegagalan review ---------- */

interface ReviewFailure {
  message: string;
  catatanError: string | null;
  /** true bila data di layar sudah tidak sesuai dengan server dan perlu dimuat ulang */
  staleState: boolean;
}

function toReviewFailure(err: unknown): ReviewFailure {
  if (!isApiError(err)) {
    return { message: 'Terjadi kesalahan saat menyimpan review. Silakan coba lagi.', catatanError: null, staleState: false };
  }

  switch (err.code) {
    case 'LAPORAN_TIDAK_DAPAT_DIREVIEW':
      return {
        message: 'Laporan ini sudah direview sebelumnya dan tidak dapat direview ulang.',
        catatanError: null,
        staleState: true,
      };
    case 'FORBIDDEN':
      return { message: 'Anda tidak memiliki akses untuk meninjau laporan ini.', catatanError: null, staleState: false };
    case 'NOT_FOUND':
      return { message: 'Laporan tidak ditemukan.', catatanError: null, staleState: true };
    case 'VALIDATION_ERROR':
    case 'BAD_REQUEST': {
      const catatanError = getFieldErrors(err).catatan ?? null;
      return {
        message: catatanError ? 'Periksa kembali catatan review.' : err.message,
        catatanError,
        staleState: false,
      };
    }
    default:
      return { message: err.message, catatanError: null, staleState: false };
  }
}

/* ---------- Form nilai ---------- */

const NILAI_FIELDS = ['nilaiSekolah', 'sikap', 'keterampilan', 'kedisiplinan'] as const;
type NilaiField = (typeof NILAI_FIELDS)[number];
type NilaiForm = Record<NilaiField, string>;
type NilaiFieldErrors = Partial<Record<NilaiField, string>>;

const NILAI_LABEL: Record<NilaiField, string> = {
  nilaiSekolah: 'Nilai sekolah',
  sikap: 'Sikap (industri)',
  keterampilan: 'Keterampilan (industri)',
  kedisiplinan: 'Kedisiplinan (industri)',
};

function isNilaiField(value: string): value is NilaiField {
  return (NILAI_FIELDS as readonly string[]).includes(value);
}

function createNilaiForm(nilai: NilaiPklGuru | undefined): NilaiForm {
  return {
    nilaiSekolah: nilai ? String(nilai.nilaiSekolah) : '',
    sikap: nilai ? String(nilai.nilaiIndustri.sikap) : '',
    keterampilan: nilai ? String(nilai.nilaiIndustri.keterampilan) : '',
    kedisiplinan: nilai ? String(nilai.nilaiIndustri.kedisiplinan) : '',
  };
}

/** Semua nilai wajib diisi dan berada di rentang 0 sampai 100, sama dengan aturan G-PKL-4 */
function validateNilai(
  form: NilaiForm,
): { payload: InputNilaiPklPayload; errors: null } | { payload: null; errors: NilaiFieldErrors } {
  const errors: NilaiFieldErrors = {};
  const values: Record<NilaiField, number> = { nilaiSekolah: 0, sikap: 0, keterampilan: 0, kedisiplinan: 0 };

  for (const field of NILAI_FIELDS) {
    const text = form[field].trim();
    if (text === '') {
      errors[field] = 'Wajib diisi.';
      continue;
    }
    const value = Number(text);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      errors[field] = 'Masukkan angka 0 sampai 100.';
      continue;
    }
    values[field] = value;
  }

  if (Object.keys(errors).length > 0) return { payload: null, errors };

  return {
    payload: {
      nilaiSekolah: values.nilaiSekolah,
      nilaiIndustri: {
        sikap: values.sikap,
        keterampilan: values.keterampilan,
        kedisiplinan: values.kedisiplinan,
      },
    },
    errors: null,
  };
}

interface NilaiFailure {
  message: string;
  fieldErrors: NilaiFieldErrors;
}

function toNilaiFailure(err: unknown): NilaiFailure {
  if (!isApiError(err)) {
    return { message: 'Terjadi kesalahan saat menyimpan nilai. Silakan coba lagi.', fieldErrors: {} };
  }

  switch (err.code) {
    case 'VALIDATION_ERROR':
    case 'BAD_REQUEST': {
      // Server bisa mengirim field bersarang seperti "nilaiIndustri.sikap": ambil bagian terakhir
      const fieldErrors: NilaiFieldErrors = {};
      for (const [key, message] of Object.entries(getFieldErrors(err))) {
        const field = key.split('.').pop() ?? key;
        if (isNilaiField(field)) fieldErrors[field] = message;
      }
      const hasFieldErrors = Object.keys(fieldErrors).length > 0;
      return { message: hasFieldErrors ? 'Periksa kembali nilai yang ditandai.' : err.message, fieldErrors };
    }
    case 'FORBIDDEN':
      return { message: 'Siswa ini bukan siswa bimbingan Anda.', fieldErrors: {} };
    case 'NOT_FOUND':
    case 'PKL_NOT_FOUND':
      return { message: 'Data penempatan PKL siswa tidak ditemukan.', fieldErrors: {} };
    default:
      return { message: err.message, fieldErrors: {} };
  }
}

/* ========================================================================== */
/* Modal verifikasi & penilaian                                               */
/* ========================================================================== */

interface ReviewModalProps {
  siswa: SiswaBimbingan;
  /** Nilai yang sudah disimpan pada sesi ini. Server tidak menyediakan endpoint baca nilai guru */
  nilaiTersimpan: NilaiPklGuru | undefined;
  onClose: () => void;
  /** Dipanggil setelah data siswa di server berubah, supaya daftar dimuat ulang */
  onChanged: () => void;
  onNilaiSaved: (nilai: NilaiPklGuru) => void;
}

function ReviewModal({ siswa, nilaiTersimpan, onClose, onChanged, onNilaiSaved }: ReviewModalProps) {
  const laporanId = siswa.laporan ? siswa.laporan.id : null;

  const detail = useApi<LaporanPkl>(
    laporanId === null ? null : `guru:pkl:laporan:${laporanId}`,
    async (signal) => {
      if (laporanId === null) throw new Error('ID laporan tidak tersedia.');
      return getLaporanPkl(laporanId, { signal });
    },
  );

  // useApi mempertahankan data sebelumnya saat key berganti: pastikan data milik laporan ini
  const laporanDetail = detail.data !== undefined && detail.data.id === laporanId ? detail.data : undefined;

  const [reviewed, setReviewed] = useState<LaporanPkl | null>(null);
  const laporanSaatIni = reviewed ?? laporanDetail;
  const status: StatusLaporan | null = laporanSaatIni?.status ?? siswa.laporan?.status ?? null;
  const badge = getLaporanBadge(status);

  /* ---------- Unduh ---------- */
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (laporanId === null) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const blob = await downloadLaporanPkl(laporanId);
      saveBlob(blob, laporanSaatIni?.namaFile ?? `laporan-pkl-${siswa.nis}.pdf`);
    } catch (err) {
      setDownloadError(isApiError(err) ? err.message : 'Laporan gagal diunduh. Silakan coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  /* ---------- Review ---------- */
  const [decision, setDecision] = useState<'disetujui' | 'revisi'>('disetujui');
  const [catatan, setCatatan] = useState('');
  const [catatanError, setCatatanError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  const handleReviewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (laporanId === null) return;

    const trimmed = catatan.trim();
    if (decision === 'revisi' && trimmed === '') {
      setCatatanError('Catatan wajib diisi saat meminta revisi.');
      setReviewError(null);
      return;
    }
    if (trimmed.length > MAX_CATATAN) {
      setCatatanError(`Catatan maksimal ${MAX_CATATAN} karakter.`);
      setReviewError(null);
      return;
    }

    setIsReviewing(true);
    setCatatanError(null);
    setReviewError(null);
    setReviewSuccess(null);
    try {
      const updated = await reviewLaporanPkl(laporanId, buildReviewPayload(decision, trimmed));
      setReviewed(updated);
      setReviewSuccess(
        updated.status === 'revisi'
          ? 'Permintaan revisi dikirim. Siswa dapat mengunggah ulang laporannya.'
          : 'Laporan disetujui.',
      );
      onChanged();
    } catch (err) {
      const failure = toReviewFailure(err);
      setReviewError(failure.message);
      setCatatanError(failure.catatanError);
      if (failure.staleState) {
        detail.refetch();
        onChanged();
      }
    } finally {
      setIsReviewing(false);
    }
  };

  /* ---------- Nilai ---------- */
  const [nilaiForm, setNilaiForm] = useState<NilaiForm>(() => createNilaiForm(nilaiTersimpan));
  const [nilaiFieldErrors, setNilaiFieldErrors] = useState<NilaiFieldErrors>({});
  const [nilaiError, setNilaiError] = useState<string | null>(null);
  const [nilaiSuccess, setNilaiSuccess] = useState<string | null>(null);
  const [isSavingNilai, setIsSavingNilai] = useState(false);

  const handleNilaiChange = (field: NilaiField, value: string) => {
    setNilaiForm((current) => ({ ...current, [field]: value }));
  };

  const handleNilaiSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNilaiSuccess(null);

    const result = validateNilai(nilaiForm);
    if (result.payload === null) {
      setNilaiFieldErrors(result.errors);
      setNilaiError('Periksa kembali nilai yang ditandai.');
      return;
    }

    setIsSavingNilai(true);
    setNilaiFieldErrors({});
    setNilaiError(null);
    try {
      const saved = await inputNilaiPkl(siswa.siswaId, result.payload);
      onNilaiSaved(saved);
      setNilaiSuccess(`Nilai tersimpan. Nilai akhir: ${formatNilai(saved.nilaiAkhir)}.`);
    } catch (err) {
      const failure = toNilaiFailure(err);
      setNilaiError(failure.message);
      setNilaiFieldErrors(failure.fieldErrors);
    } finally {
      setIsSavingNilai(false);
    }
  };

  /* ---------- Tampilan ---------- */
  let fileLabel: string;
  if (laporanSaatIni) fileLabel = laporanSaatIni.namaFile;
  else if (detail.loading) fileLabel = 'Memuat data laporan…';
  else if (detail.error) fileLabel = 'Data laporan tidak dapat dimuat';
  else fileLabel = `laporan-pkl-${siswa.nis}.pdf`;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox} role="dialog" aria-modal="true" aria-label="Verifikasi & penilaian PKL">
        <div className={styles.modalHeader}>
          <h2>Verifikasi & penilaian PKL</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Tutup">
            <FiX />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.studentNameDisplay}>
            {siswa.nama}
          </div>
          <p className={styles.studentMeta}>NIS {siswa.nis} · {siswa.industri.nama}</p>

          {/* --- Berkas laporan --- */}
          <div className={styles.fileLinkBox}>
            <FiFileText className={styles.fileIcon} />
            <span className={styles.fileName}>{fileLabel}</span>
            {detail.error && !laporanSaatIni ? (
              <button type="button" className={styles.linkBtn} onClick={() => detail.refetch()}>
                <FiRefreshCw /> Coba lagi
              </button>
            ) : (
              <button
                type="button"
                className={styles.linkBtn}
                onClick={handleDownload}
                disabled={isDownloading || laporanId === null}
              >
                <FiDownload /> {isDownloading ? 'Mengunduh…' : 'Unduh'}
              </button>
            )}
          </div>
          {detail.error && !laporanSaatIni && (
            <div className={styles.alertError} role="alert"><FiAlertCircle /> {detail.error.message}</div>
          )}
          {downloadError && <div className={styles.alertError} role="alert"><FiAlertCircle /> {downloadError}</div>}

          {/* --- Review laporan --- */}
          <h4 className={styles.sectionTitle}>
            Review laporan <span className={badge.className}>{badge.label}</span>
          </h4>

          {reviewSuccess && <div className={styles.alertSuccess} role="status">{reviewSuccess}</div>}
          {reviewError && <div className={styles.alertError} role="alert"><FiAlertCircle /> {reviewError}</div>}

          {status === 'menunggu' ? (
            <form onSubmit={handleReviewSubmit} noValidate>
              <div className={styles.radioGroup} role="radiogroup" aria-label="Keputusan review">
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="keputusan-review"
                    value="disetujui"
                    checked={decision === 'disetujui'}
                    onChange={() => setDecision('disetujui')}
                  />
                  Setujui laporan
                </label>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="keputusan-review"
                    value="revisi"
                    checked={decision === 'revisi'}
                    onChange={() => setDecision('revisi')}
                  />
                  Minta revisi
                </label>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="catatan-review">
                  Catatan {decision === 'revisi' ? '(wajib)' : '(opsional)'}
                </label>
                <textarea
                  id="catatan-review"
                  rows={3}
                  maxLength={MAX_CATATAN}
                  value={catatan}
                  onChange={(event) => setCatatan(event.target.value)}
                  aria-invalid={catatanError !== null}
                />
                {catatanError && <p className={styles.fieldError}>{catatanError}</p>}
              </div>

              <div className={styles.modalFooter}>
                <button type="submit" className={styles.submitBtn} disabled={isReviewing}>
                  <FiCheckCircle />
                  {isReviewing
                    ? 'Menyimpan…'
                    : decision === 'revisi'
                      ? 'Kirim permintaan revisi'
                      : 'Setujui laporan'}
                </button>
              </div>
            </form>
          ) : (
            <div className={styles.noteBox}>
              {status === 'disetujui' && <p>Laporan sudah disetujui{laporanSaatIni?.diperiksaPada ? ` pada ${formatTanggal(laporanSaatIni.diperiksaPada)}` : ''}.</p>}
              {status === 'revisi' && (
                <p>
                  Revisi diminta{laporanSaatIni?.diperiksaPada ? ` pada ${formatTanggal(laporanSaatIni.diperiksaPada)}` : ''}.
                  Menunggu siswa mengunggah ulang laporan.
                </p>
              )}
              {laporanSaatIni?.catatan && (
                <p className={styles.noteCatatan}>
                  <strong>Catatan:</strong> {laporanSaatIni.catatan}
                </p>
              )}
            </div>
          )}

          {/* --- Nilai akhir --- */}
          <h4 className={styles.sectionTitle}>Nilai akhir PKL</h4>
          <p className={styles.helperText}>
            Nilai akhir dihitung server dari nilai sekolah dan nilai industri (0 - 100).
            Menyimpan akan menimpa nilai yang sudah ada.
            {nilaiTersimpan && ` Nilai akhir tersimpan saat ini: ${formatNilai(nilaiTersimpan.nilaiAkhir)}.`}
          </p>

          {nilaiSuccess && <div className={styles.alertSuccess} role="status">{nilaiSuccess}</div>}
          {nilaiError && <div className={styles.alertError} role="alert"><FiAlertCircle /> {nilaiError}</div>}

          <form onSubmit={handleNilaiSubmit} noValidate>
            <div className={styles.gridTwo}>
              {NILAI_FIELDS.map((field) => (
                <div className={styles.inputGroup} key={field}>
                  <label htmlFor={`nilai-${field}`}>{NILAI_LABEL[field]}</label>
                  <input
                    id={`nilai-${field}`}
                    type="number"
                    inputMode="decimal"
                    value={nilaiForm[field]}
                    onChange={(event) => handleNilaiChange(field, event.target.value)}
                    min="0"
                    max="100"
                    step="any"
                    aria-invalid={nilaiFieldErrors[field] !== undefined}
                  />
                  {nilaiFieldErrors[field] && <p className={styles.fieldError}>{nilaiFieldErrors[field]}</p>}
                </div>
              ))}
            </div>
            <div className={styles.modalFooter}>
              <button type="submit" className={styles.submitBtn} disabled={isSavingNilai}>
                <FiCheckCircle /> {isSavingNilai ? 'Menyimpan…' : 'Simpan nilai'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Halaman                                                                    */
/* ========================================================================== */

export default function InfoPklGuru() {
  const [activeTab, setActiveTab] = useState<'siswa' | 'mitra'>('siswa');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nilaiStorage, setNilaiStorage] = useState<NilaiStorageState>(readNilaiStorage);
  const nilaiBySiswa = nilaiStorage.values;
  const [mitraState, setMitraState] = useState(readMitraEntries);
  const [catatanMitraById, setCatatanMitraById] = useState<Record<string, string>>({});
  const [mitraFeedback, setMitraFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const list = useApi(`guru:pkl:siswa:${page}`, (signal) =>
    getSiswaBimbingan({ page, limit: PAGE_SIZE }, { signal }),
  );

  useEffect(
    () => subscribePengajuanMitra(() => setMitraState(readMitraEntries())),
    [],
  );

  const pengajuanMitraMenunggu = mitraState.entries.filter((entry) => entry.status === 'Menunggu');
  const students = list.data?.data ?? [];
  const meta = list.data?.meta;
  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / Math.max(meta.limit, 1))) : 1;

  // Filter data berdasarkan input pencarian (hanya pada halaman yang sedang dimuat)
  const filteredSiswa = students.filter((siswa) =>
    siswa.nama.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedSiswa = students.find((siswa) => siswa.siswaId === selectedId) ?? null;

  const handleNilaiSaved = (nilai: NilaiPklGuru) => {
    const updatedValues = { ...nilaiBySiswa, [nilai.siswaId]: nilai };
    try {
      saveStoredNilaiPklGuru(updatedValues);
      setNilaiStorage({ values: updatedValues, error: null });
    } catch (error) {
      setNilaiStorage({
        values: updatedValues,
        error: error instanceof Error
          ? `Nilai tersimpan di server, tetapi salinan lokal gagal disimpan: ${error.message}`
          : 'Nilai tersimpan di server, tetapi salinan lokal gagal disimpan.',
      });
    }
  };

  const handleDecisionMitra = (
    id: string,
    status: Exclude<StatusPengajuanMitra, 'Menunggu'>,
  ) => {
    try {
      const updated = putuskanPengajuanMitra(id, status, catatanMitraById[id] ?? '');
      setMitraState((current) => ({
        entries: current.entries.map((entry) => (entry.id === id ? updated : entry)),
        error: null,
      }));
      setMitraFeedback({
        kind: 'success',
        text: `Pengajuan ${updated.namaPerusahaan} ${status.toLocaleLowerCase('id-ID')}.`,
      });
    } catch (error) {
      setMitraFeedback({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Keputusan pengajuan tidak dapat disimpan.',
      });
    }
  };

  const reloadMitraEntries = () => setMitraState(readMitraEntries());

  let emptyMessage = 'Belum ada siswa bimbingan.';
  if (list.error) emptyMessage = 'Data siswa bimbingan belum dapat ditampilkan.';
  else if (searchTerm.trim() !== '') emptyMessage = 'Tidak ada siswa yang cocok dengan pencarian.';

  return (
    <div className={`${styles.layout} appLayout`}>
      <Sidebar />

      <main className={styles.mainContent}>
        {/* --- Header / Breadcrumb --- */}
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <span>Dashboard Guru</span> <FiChevronRight /> <strong>Praktik Kerja Lapangan</strong>
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
            <h1>Praktik Kerja Lapangan</h1>
            <p className={styles.description}>Dampingi, tinjau laporan, dan nilai perjalanan PKL siswa.</p>
          </div>
          {nilaiStorage.error && (
            <div className={styles.alertErrorBar} role="alert">
              <FiAlertCircle />
              <span>{nilaiStorage.error}</span>
            </div>
          )}

          <div className={styles.tabs} role="tablist" aria-label="Pengelolaan PKL">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'siswa'}
              aria-controls="pkl-siswa-panel"
              className={activeTab === 'siswa' ? styles.activeTab : styles.tab}
              onClick={() => setActiveTab('siswa')}
            >
              Daftar siswa bimbingan
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'mitra'}
              aria-controls="pkl-mitra-panel"
              className={activeTab === 'mitra' ? styles.activeTab : styles.tab}
              onClick={() => setActiveTab('mitra')}
            >
              Pengajuan Mitra PKL
              {pengajuanMitraMenunggu.length > 0 && (
                <span className={styles.tabCount}>{pengajuanMitraMenunggu.length}</span>
              )}
            </button>
          </div>

          {activeTab === 'siswa' ? (
            <div id="pkl-siswa-panel" className={styles.cardFull} role="tabpanel">
            <h3>Daftar siswa bimbingan</h3>

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

            {list.error && (
              <div className={styles.alertErrorBar} role="alert">
                <FiAlertCircle />
                <span>{list.error.message}</span>
                <button type="button" className={styles.retryBtn} onClick={() => list.refetch()}>
                  <FiRefreshCw /> Coba lagi
                </button>
              </div>
            )}

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Siswa</th>
                    <th>Tempat PKL</th>
                    <th>Status Laporan</th>
                    <th>Nilai</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data === undefined && list.loading ? (
                    <tr>
                      <td colSpan={5} className={styles.stateCell} role="status">Memuat data siswa bimbingan…</td>
                    </tr>
                  ) : filteredSiswa.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.stateCell}>{emptyMessage}</td>
                    </tr>
                  ) : (
                    filteredSiswa.map((siswa) => {
                      const badge = getLaporanBadge(siswa.laporan ? siswa.laporan.status : null);
                      return (
                        <tr key={siswa.siswaId}>
                          <td>
                            <strong>{siswa.nama}</strong><br/>
                            <span className={styles.tableSub}>{siswa.nis} - {STATUS_PKL_LABEL[siswa.statusPkl]}</span>
                          </td>
                          <td>{siswa.industri.nama}</td>
                          <td>
                            <span className={badge.className}>{badge.label}</span>
                          </td>
                          <td>{formatNilai(nilaiBySiswa[siswa.siswaId]?.nilaiAkhir)}</td>
                          <td>
                            <button
                              className={styles.tinjauBtn}
                              onClick={() => setSelectedId(siswa.siswaId)}
                              disabled={siswa.laporan === null}
                            >
                              Tinjau
                            </button>
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
                  disabled={page <= 1 || list.loading}
                >
                  Sebelumnya
                </button>
                <span>Halaman {page} dari {totalPages}</span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages || list.loading}
                >
                  Berikutnya
                </button>
              </div>
            )}
          </div>
          ) : (
            <section id="pkl-mitra-panel" className={styles.cardFull} role="tabpanel">
              <h3>Pengajuan Mitra PKL</h3>
              {mitraState.error && (
                <div className={styles.alertErrorBar} role="alert">
                  <FiAlertCircle />
                  <span>{mitraState.error}</span>
                  <button type="button" className={styles.retryBtn} onClick={reloadMitraEntries}>
                    <FiRefreshCw /> Coba lagi
                  </button>
                </div>
              )}
              {mitraFeedback && (
                <p
                  className={mitraFeedback.kind === 'success' ? styles.mitraSuccess : styles.mitraError}
                  role={mitraFeedback.kind === 'success' ? 'status' : 'alert'}
                >
                  {mitraFeedback.kind === 'success' && <FiCheckCircle aria-hidden="true" />}
                  {mitraFeedback.text}
                </p>
              )}
              {mitraState.entries.length === 0 && !mitraState.error ? (
                <p className={styles.mitraEmpty}>Belum ada pengajuan mitra PKL.</p>
              ) : (
                <div className={styles.mitraCards}>
                  {mitraState.entries.map((entry) => {
                    const isWaiting = entry.status === 'Menunggu';
                    const statusClass =
                      entry.status === 'Menunggu'
                        ? styles.mitraWaiting
                        : entry.status === 'Disetujui'
                          ? styles.mitraApproved
                          : styles.mitraRejected;

                    return (
                      <article key={entry.id} className={styles.mitraCard}>
                        <div className={styles.mitraCardHeader}>
                          <div className={styles.mitraCompanyIcon}><FiBriefcase /></div>
                          <div className={styles.mitraCompany}>
                            <h4>{entry.namaPerusahaan}</h4>
                            <p>{entry.namaSiswa}</p>
                          </div>
                          <span className={`${styles.mitraStatus} ${statusClass}`}>{entry.status}</span>
                        </div>
                        <div className={styles.mitraDetails}>
                          <div><strong>Bidang</strong><span>{entry.bidang}</span></div>
                          <div><strong>Alamat</strong><span>{entry.alamat}</span></div>
                          <div>
                            <strong>Periode</strong>
                            <span>{formatTanggal(entry.tanggalMulai)} - {formatTanggal(entry.tanggalSelesai)}</span>
                          </div>
                        </div>
                        {entry.catatanGuru && (
                          <p className={styles.mitraNote}><strong>Catatan guru:</strong> {entry.catatanGuru}</p>
                        )}
                        {isWaiting && (
                          <>
                            <div className={styles.mitraNoteField}>
                              <label htmlFor={`catatan-mitra-${entry.id}`}>Catatan untuk siswa (opsional)</label>
                              <textarea
                                id={`catatan-mitra-${entry.id}`}
                                rows={2}
                                value={catatanMitraById[entry.id] ?? ''}
                                onChange={(event) =>
                                  setCatatanMitraById((current) => ({
                                    ...current,
                                    [entry.id]: event.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className={styles.mitraActions}>
                              <button
                                type="button"
                                className={styles.approveMitraBtn}
                                onClick={() => handleDecisionMitra(entry.id, 'Disetujui')}
                              >
                                <FiCheckCircle /> Setujui
                              </button>
                              <button
                                type="button"
                                className={styles.rejectMitraBtn}
                                onClick={() => handleDecisionMitra(entry.id, 'Ditolak')}
                              >
                                <FiX /> Tolak
                              </button>
                            </div>
                          </>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

        </div>
        <Footer />
      </main>

      {/* ================= MODAL VERIFIKASI & PENILAIAN ================= */}
      {selectedSiswa && (
        <ReviewModal
          siswa={selectedSiswa}
          nilaiTersimpan={nilaiBySiswa[selectedSiswa.siswaId]}
          onClose={() => setSelectedId(null)}
          onChanged={() => list.refetch()}
          onNilaiSaved={handleNilaiSaved}
        />
      )}
    </div>
  );
}
