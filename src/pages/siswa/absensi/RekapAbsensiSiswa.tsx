import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  FiBell, FiChevronRight, FiUpload, FiX, FiUploadCloud, FiFileText,
  FiAlertCircle, FiRefreshCw
} from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Sidebar from '../../../components/layout/Sidebar';
import Footer from '../../../components/layout/Footer';
import styles from './RekapAbsensiSiswa.module.css';

import { useApi } from '../../../hooks/useApi';
import { useAuth } from '../../../hooks/useAuth';
import { getFieldErrors, isApiError } from '../../../services/api';
import { createIzin, getRekapAbsensiSiswa } from '../../../services/absensi.service';
import type {
  CreateIzinPayload,
  IzinSiswa,
  JenisIzin,
  RekapAbsensi,
  RekapAbsensiSiswaQuery,
  StatusIzin,
} from '../../../types/portal.types';
import {
  MAX_LAMPIRAN_SIZE,
  buildSemester,
  describeError,
  formatBulan,
  formatSemester,
  getSemesterBerjalan,
  isLampiranTypeValid,
  isValidMonth,
  persentaseHadir,
  toMonthValue,
  totalRekap,
  type PeriodeSemester,
} from '../../../utils/absensi';
import { formatTanggal, getInisial } from '../../../utils/formatter';

/* ========================================================================== */
/* Konstanta & helper                                                         */
/* ========================================================================== */

/** Batas panjang keterangan izin di S-ABS-2 */
const MAX_KETERANGAN = 500;

/** Jumlah tahun ajaran yang bisa dipilih pada filter semester, termasuk tahun berjalan */
const JUMLAH_TAHUN_AJARAN = 3;

const WARNA_HADIR = '#10b981';
const WARNA_IZIN = '#f59e0b';
const WARNA_SAKIT = '#3b82f6';
const WARNA_ALPA = '#ef4444';
const WARNA_KOSONG = '#e5e7eb';

type FilterMode = 'bulan' | 'semester';

const JENIS_IZIN_LABEL: Record<JenisIzin, string> = {
  izin: 'Izin',
  sakit: 'Sakit',
};

const STATUS_IZIN_LABEL: Record<StatusIzin, string> = {
  menunggu: 'Menunggu persetujuan',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
};

const STATUS_IZIN_CLASS: Record<StatusIzin, string> = {
  menunggu: styles.statusMenunggu,
  disetujui: styles.statusHadir,
  ditolak: styles.statusDitolak,
};

/**
 * S-ABS-1 wajib tepat satu dari `bulan` atau `semester`. Tipe RekapAbsensiSiswaQuery
 * sudah melarang keduanya sekaligus, dan fungsi ini hanya pernah membuat salah satunya
 * sesuai mode filter yang aktif.
 */
function buildRekapQuery(
  mode: FilterMode,
  bulan: string,
  tahunMulai: number,
  periode: PeriodeSemester,
): RekapAbsensiSiswaQuery | null {
  if (mode === 'bulan') return isValidMonth(bulan) ? { bulan } : null;
  return { semester: buildSemester(tahunMulai, periode) };
}

function formatRentang(izin: IzinSiswa): string {
  return izin.tanggalSelesai === izin.tanggalMulai
    ? formatTanggal(izin.tanggalMulai)
    : `${formatTanggal(izin.tanggalMulai)} - ${formatTanggal(izin.tanggalSelesai)}`;
}

/* ---------- Form izin ---------- */

interface IzinForm {
  jenis: JenisIzin;
  tanggalMulai: string;
  tanggalSelesai: string;
  keterangan: string;
}

const IZIN_FIELDS = ['jenis', 'tanggalMulai', 'tanggalSelesai', 'keterangan', 'lampiran'] as const;
type IzinField = (typeof IZIN_FIELDS)[number];
type IzinFieldErrors = Partial<Record<IzinField, string>>;

function isIzinField(value: string): value is IzinField {
  return (IZIN_FIELDS as readonly string[]).includes(value);
}

const EMPTY_IZIN_FORM: IzinForm = {
  jenis: 'izin',
  tanggalMulai: '',
  tanggalSelesai: '',
  keterangan: '',
};

/** Aturan yang sama dengan S-ABS-2, supaya kesalahan umum tertangkap sebelum request dikirim */
function validateIzin(
  form: IzinForm,
  file: File | null,
): { payload: CreateIzinPayload; errors: null } | { payload: null; errors: IzinFieldErrors } {
  const errors: IzinFieldErrors = {};
  const keterangan = form.keterangan.trim();

  if (form.tanggalMulai === '') errors.tanggalMulai = 'Tanggal mulai wajib diisi.';
  if (form.tanggalSelesai === '') errors.tanggalSelesai = 'Tanggal selesai wajib diisi.';
  if (
    form.tanggalMulai !== '' &&
    form.tanggalSelesai !== '' &&
    form.tanggalSelesai < form.tanggalMulai
  ) {
    errors.tanggalSelesai = 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.';
  }
  if (keterangan.length > MAX_KETERANGAN) {
    errors.keterangan = `Keterangan maksimal ${MAX_KETERANGAN} karakter.`;
  }

  if (file === null) {
    errors.lampiran = 'Lampiran surat izin wajib diunggah.';
  } else if (!isLampiranTypeValid(file)) {
    errors.lampiran = 'Lampiran harus berupa berkas JPG, PNG, atau PDF.';
  } else if (file.size > MAX_LAMPIRAN_SIZE) {
    errors.lampiran = 'Ukuran lampiran maksimal 5 MB.';
  }

  if (Object.keys(errors).length > 0 || file === null) return { payload: null, errors };

  return {
    payload: {
      jenis: form.jenis,
      tanggalMulai: form.tanggalMulai,
      tanggalSelesai: form.tanggalSelesai,
      keterangan: keterangan === '' ? undefined : keterangan,
      lampiran: file,
    },
    errors: null,
  };
}

interface IzinFailure {
  message: string;
  fieldErrors: IzinFieldErrors;
}

function toIzinFailure(err: unknown): IzinFailure {
  if (!isApiError(err)) {
    return { message: 'Terjadi kesalahan saat mengirim pengajuan. Silakan coba lagi.', fieldErrors: {} };
  }

  switch (err.code) {
    case 'FILE_TYPE_INVALID':
    case 'FILE_TOO_LARGE':
      return { message: err.message, fieldErrors: { lampiran: err.message } };
    case 'VALIDATION_ERROR':
    case 'BAD_REQUEST': {
      const fieldErrors: IzinFieldErrors = {};
      for (const [key, message] of Object.entries(getFieldErrors(err))) {
        if (isIzinField(key)) fieldErrors[key] = message;
      }
      const hasFieldErrors = Object.keys(fieldErrors).length > 0;
      return {
        message: hasFieldErrors ? 'Periksa kembali data yang ditandai.' : describeError(err, err.message),
        fieldErrors,
      };
    }
    default:
      return { message: err.message, fieldErrors: {} };
  }
}

/* ========================================================================== */
/* Modal pengajuan izin                                                       */
/* ========================================================================== */

interface IzinModalProps {
  onClose: () => void;
  onCreated: (izin: IzinSiswa) => void;
}

function IzinModal({ onClose, onCreated }: IzinModalProps) {
  const [form, setForm] = useState<IzinForm>(EMPTY_IZIN_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<IzinFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = <K extends keyof IzinForm>(field: K, value: IzinForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = validateIzin(form, file);
    if (result.payload === null) {
      setFieldErrors(result.errors);
      setFormError('Periksa kembali data yang ditandai.');
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const izin = await createIzin(result.payload);
      onCreated(izin);
    } catch (err) {
      const failure = toIzinFailure(err);
      setFormError(failure.message);
      setFieldErrors(failure.fieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox} role="dialog" aria-modal="true" aria-label="Ajukan izin kehadiran">
        <div className={styles.modalHeader}>
          <h2>Ajukan izin kehadiran</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Tutup">
            <FiX />
          </button>
        </div>
        <form className={styles.modalBody} onSubmit={handleSubmit} noValidate>
          {formError && (
            <div className={styles.alertError} role="alert"><FiAlertCircle /> {formError}</div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="jenis-izin">Jenis pengajuan</label>
            <select
              id="jenis-izin"
              value={form.jenis}
              onChange={(event) => handleChange('jenis', event.target.value === 'sakit' ? 'sakit' : 'izin')}
              aria-invalid={fieldErrors.jenis !== undefined}
            >
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
            </select>
            {fieldErrors.jenis && <p className={styles.fieldError}>{fieldErrors.jenis}</p>}
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.inputGroup}>
              <label htmlFor="tanggal-mulai">Tanggal mulai</label>
              <input
                id="tanggal-mulai"
                type="date"
                value={form.tanggalMulai}
                onChange={(event) => handleChange('tanggalMulai', event.target.value)}
                aria-invalid={fieldErrors.tanggalMulai !== undefined}
              />
              {fieldErrors.tanggalMulai && <p className={styles.fieldError}>{fieldErrors.tanggalMulai}</p>}
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="tanggal-selesai">Tanggal selesai</label>
              <input
                id="tanggal-selesai"
                type="date"
                value={form.tanggalSelesai}
                min={form.tanggalMulai || undefined}
                onChange={(event) => handleChange('tanggalSelesai', event.target.value)}
                aria-invalid={fieldErrors.tanggalSelesai !== undefined}
              />
              {fieldErrors.tanggalSelesai && <p className={styles.fieldError}>{fieldErrors.tanggalSelesai}</p>}
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="alasan-izin">Alasan izin (opsional)</label>
            <textarea
              id="alasan-izin"
              placeholder="Tuliskan alasan izin anda"
              rows={3}
              maxLength={MAX_KETERANGAN}
              value={form.keterangan}
              onChange={(event) => handleChange('keterangan', event.target.value)}
              aria-invalid={fieldErrors.keterangan !== undefined}
            ></textarea>
            {fieldErrors.keterangan && <p className={styles.fieldError}>{fieldErrors.keterangan}</p>}
          </div>

          <div className={styles.dropzone}>
            <FiUploadCloud className={styles.dropzoneIcon} />
            <p>{file ? file.name : 'Pilih berkas untuk diunggah'}</p>
            <span>Gambar PNG, JPG, atau PDF (maksimal 5 MB)</span>
            <input
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              onChange={handleFileChange}
              aria-label="Pilih surat izin"
              aria-invalid={fieldErrors.lampiran !== undefined}
            />
          </div>
          {fieldErrors.lampiran && <p className={styles.fieldError}>{fieldErrors.lampiran}</p>}

          <div className={styles.modalFooter}>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              <FiFileText /> {isSubmitting ? 'Mengirim…' : 'Kirim pengajuan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Halaman                                                                    */
/* ========================================================================== */

export default function RekapAbsensiSiswa() {
  const { user } = useAuth();

  /* ---------- Filter rekap (S-ABS-1: hanya bulan ATAU semester) ---------- */
  const [semesterBerjalan] = useState(() => getSemesterBerjalan(new Date()));
  const [mode, setMode] = useState<FilterMode>('bulan');
  const [bulan, setBulan] = useState(() => toMonthValue(new Date()));
  const [tahunMulai, setTahunMulai] = useState(semesterBerjalan.tahunMulai);
  const [periode, setPeriode] = useState<PeriodeSemester>(semesterBerjalan.periode);

  const tahunOptions = Array.from(
    { length: JUMLAH_TAHUN_AJARAN },
    (_, index) => semesterBerjalan.tahunMulai - index,
  );

  const query = buildRekapQuery(mode, bulan, tahunMulai, periode);
  const queryKey =
    query === null
      ? null
      : query.bulan !== undefined
        ? `siswa:absensi:rekap:bulan:${query.bulan}`
        : `siswa:absensi:rekap:semester:${query.semester}`;

  const rekapApi = useApi<RekapAbsensi>(queryKey, async (signal) => {
    if (query === null) throw new Error('Filter rekap belum valid.');
    return getRekapAbsensiSiswa(query, { signal });
  });

  // useApi mempertahankan data lama saat filter berganti, jadi angka hanya dipakai bila sudah final
  const rekap = rekapApi.loading || rekapApi.error ? undefined : rekapApi.data;
  const total = rekap ? totalRekap(rekap) : 0;
  const persentase = rekap ? persentaseHadir(rekap) : null;

  const periodeLabel =
    mode === 'bulan' ? formatBulan(bulan) : formatSemester(tahunMulai, periode);

  // Data untuk Diagram Donat Recharts
  const chartData =
    rekap && total > 0
      ? [
          { name: 'Hadir', value: rekap.hadir, color: WARNA_HADIR },
          { name: 'Izin', value: rekap.izin, color: WARNA_IZIN },
          { name: 'Sakit', value: rekap.sakit, color: WARNA_SAKIT },
          { name: 'Alpa', value: rekap.alpa, color: WARNA_ALPA },
        ]
      : [{ name: 'Belum ada data', value: 1, color: WARNA_KOSONG }];

  const formatHari = (value: number | undefined): string =>
    value === undefined ? '-' : `${value} Hari`;

  /* ---------- Pengajuan izin ---------- */
  const [isIzinModalOpen, setIsIzinModalOpen] = useState(false);
  // API belum menyediakan riwayat izin siswa, jadi daftar hanya memuat pengajuan pada sesi ini
  const [izinTerkirim, setIzinTerkirim] = useState<IzinSiswa[]>([]);
  const [izinNotice, setIzinNotice] = useState<string | null>(null);

  const handleIzinCreated = (izin: IzinSiswa) => {
    setIzinTerkirim((current) => [izin, ...current]);
    setIzinNotice('Pengajuan izin berhasil dikirim dan menunggu persetujuan wali kelas.');
    setIsIzinModalOpen(false);
  };

  const openIzinModal = () => {
    setIzinNotice(null);
    setIsIzinModalOpen(true);
  };

  return (
    <div className={styles.layout}>
      <Sidebar />
      
      <main className={styles.mainContent}>
        {/* --- Header / Breadcrumb --- */}
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <span>Dashboard Siswa</span> <FiChevronRight /> <strong>Absensi</strong>
          </div>
          <div className={styles.headerActions}>
            <FiBell className={styles.bellIcon} />
            <div className={styles.avatar}>{getInisial(user?.nama)}</div>
          </div>
        </header>

        <div className={styles.contentWrapper}>
          {/* --- Judul Halaman --- */}
          <div className={styles.pageTitleBox}>
            <p className={styles.subtitle}>PORTAL AKADEMIK / SISWA</p>
            <h1>Absensi & Kehadiran</h1>
            <p className={styles.description}>Kehadiran yang baik, langkah awal untuk berprestasi</p>
          </div>

          {/* --- Top Grid (Statistik & Pengajuan) --- */}
          <div className={styles.gridTop}>
            
            {/* Card Statistik Kehadiran */}
            <div className={styles.card}>
              <div className={styles.cardHeaderFlex}>
                <h3>Statistik kehadiran</h3>
                <span className={styles.badgeMonth}>{periodeLabel}</span>
              </div>

              {/* Filter: hanya satu dari bulan atau semester yang dikirim ke server */}
              <div className={styles.filterRow}>
                <div className={styles.filterField}>
                  <label htmlFor="filter-mode">Tampilkan per</label>
                  <select
                    id="filter-mode"
                    className={styles.filterControl}
                    value={mode}
                    onChange={(event) => setMode(event.target.value === 'semester' ? 'semester' : 'bulan')}
                  >
                    <option value="bulan">Bulan</option>
                    <option value="semester">Semester</option>
                  </select>
                </div>

                {mode === 'bulan' ? (
                  <div className={styles.filterField}>
                    <label htmlFor="filter-bulan">Bulan</label>
                    <input
                      id="filter-bulan"
                      type="month"
                      className={styles.filterControl}
                      value={bulan}
                      onChange={(event) => setBulan(event.target.value)}
                      aria-invalid={query === null}
                    />
                  </div>
                ) : (
                  <>
                    <div className={styles.filterField}>
                      <label htmlFor="filter-tahun">Tahun ajaran</label>
                      <select
                        id="filter-tahun"
                        className={styles.filterControl}
                        value={tahunMulai}
                        onChange={(event) => setTahunMulai(Number(event.target.value))}
                      >
                        {tahunOptions.map((year) => (
                          <option key={year} value={year}>{year}/{year + 1}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.filterField}>
                      <label htmlFor="filter-periode">Semester</label>
                      <select
                        id="filter-periode"
                        className={styles.filterControl}
                        value={periode}
                        onChange={(event) => setPeriode(event.target.value === 'genap' ? 'genap' : 'ganjil')}
                      >
                        <option value="ganjil">Ganjil</option>
                        <option value="genap">Genap</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {query === null && (
                <p className={styles.fieldError}>Pilih bulan yang valid untuk menampilkan statistik.</p>
              )}

              {rekapApi.error && (
                <div className={styles.alertErrorBar} role="alert">
                  <FiAlertCircle />
                  <span>{describeError(rekapApi.error, 'Statistik kehadiran belum dapat dimuat.')}</span>
                  <button type="button" className={styles.retryBtn} onClick={() => rekapApi.refetch()}>
                    <FiRefreshCw /> Coba lagi
                  </button>
                </div>
              )}

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
                  <p><span className={styles.dotGreen}></span> Hadir <strong className={styles.legendVal}>{formatHari(rekap?.hadir)}</strong></p>
                  <p><span className={styles.dotYellow}></span> Izin <strong className={styles.legendVal}>{formatHari(rekap?.izin)}</strong></p>
                  <p><span className={styles.dotBlue}></span> Sakit <strong className={styles.legendVal}>{formatHari(rekap?.sakit)}</strong></p>
                  <p><span className={styles.dotRed}></span> Alpa <strong className={styles.legendVal}>{formatHari(rekap?.alpa)}</strong></p>
                </div>
              </div>
            </div>

            {/* Card Pengajuan Izin */}
            <div className={styles.card}>
              <h3>Pengajuan Izin</h3>
              <div className={styles.izinContent}>
                <h4>{izinTerkirim.length > 0 ? 'Pengajuan izin terkirim' : 'Belum ada pengajuan izin'}</h4>
                <p>Lampirkan surat izin untuk ketidakhadiranmu. Pengajuan akan ditinjau oleh wali kelas.</p>
                {izinNotice && (
                  <div className={styles.alertSuccess} role="status">{izinNotice}</div>
                )}
                <button type="button" className={styles.primaryBtn} onClick={openIzinModal}>
                  <FiUpload /> Ajukan izin
                </button>
              </div>
            </div>

          </div>

          {/* --- Tabel Riwayat Pengajuan Izin --- */}
          <div className={styles.cardFull}>
            <h3>Riwayat Pengajuan Izin</h3>
            <p className={styles.helperText}>
              Menampilkan pengajuan yang Anda kirim selama sesi ini. Status akhir diputuskan oleh wali kelas.
            </p>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jenis</th>
                    <th>Status</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {izinTerkirim.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={styles.stateCell}>Belum ada pengajuan izin pada sesi ini.</td>
                    </tr>
                  ) : (
                    izinTerkirim.map((item) => (
                      <tr key={item.id}>
                        <td>{formatRentang(item)}</td>
                        <td>{JENIS_IZIN_LABEL[item.jenis]}</td>
                        <td><span className={STATUS_IZIN_CLASS[item.status]}>{STATUS_IZIN_LABEL[item.status]}</span></td>
                        <td>{item.keterangan ?? '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
        <Footer />
      </main>

      {/* ================= MODAL PENGAJUAN IZIN ================= */}
      {isIzinModalOpen && (
        <IzinModal onClose={() => setIsIzinModalOpen(false)} onCreated={handleIzinCreated} />
      )}
    </div>
  );
}
