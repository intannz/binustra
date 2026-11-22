import { getFieldErrors, isApiError } from '../services/api';
import type {
  DateString,
  FileAcceptType,
  MonthString,
  RekapAbsensi,
  SemesterString,
} from '../types/portal.types';

/* ========================================================================== */
/* Tanggal, bulan, dan semester                                               */
/* ========================================================================== */

export type PeriodeSemester = 'ganjil' | 'genap';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const BULAN_FORMAT = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' });

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Tanggal lokal dalam format YYYY-MM-DD (bukan UTC, agar tidak bergeser zona waktu) */
export function toDateInputValue(date: Date): DateString {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Bulan lokal dalam format YYYY-MM */
export function toMonthValue(date: Date): MonthString {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function isValidMonth(value: string): boolean {
  return MONTH_PATTERN.test(value);
}

/** Contoh "2026-10" menjadi "Oktober 2026". Nilai tidak valid dikembalikan apa adanya */
export function formatBulan(value: MonthString): string {
  if (!isValidMonth(value)) return value;
  const [year, month] = value.split('-').map(Number);
  return BULAN_FORMAT.format(new Date(year, month - 1, 1));
}

/**
 * Semester berjalan: Juli sampai Desember = ganjil tahun itu,
 * Januari sampai Juni = genap tahun ajaran yang dimulai tahun sebelumnya.
 */
export function getSemesterBerjalan(date: Date): { tahunMulai: number; periode: PeriodeSemester } {
  const month = date.getMonth() + 1;
  return month >= 7
    ? { tahunMulai: date.getFullYear(), periode: 'ganjil' }
    : { tahunMulai: date.getFullYear() - 1, periode: 'genap' };
}

/** Susun SemesterString sesuai S-ABS-1, contoh 2026-2027-ganjil */
export function buildSemester(tahunMulai: number, periode: PeriodeSemester): SemesterString {
  return `${tahunMulai}-${tahunMulai + 1}-${periode}`;
}

/** Contoh (2026, ganjil) menjadi "Semester Ganjil 2026/2027" */
export function formatSemester(tahunMulai: number, periode: PeriodeSemester): string {
  const label = periode === 'ganjil' ? 'Ganjil' : 'Genap';
  return `Semester ${label} ${tahunMulai}/${tahunMulai + 1}`;
}

/* ========================================================================== */
/* Rekap                                                                      */
/* ========================================================================== */

export const REKAP_KOSONG: RekapAbsensi = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };

export function totalRekap(rekap: RekapAbsensi): number {
  return rekap.hadir + rekap.izin + rekap.sakit + rekap.alpa;
}

/** Persentase hadir dibulatkan. Null bila belum ada data kehadiran sama sekali */
export function persentaseHadir(rekap: RekapAbsensi): number | null {
  const total = totalRekap(rekap);
  return total === 0 ? null : Math.round((rekap.hadir / total) * 100);
}

export function jumlahkanRekap(items: readonly RekapAbsensi[]): RekapAbsensi {
  return items.reduce<RekapAbsensi>(
    (sum, item) => ({
      hadir: sum.hadir + item.hadir,
      izin: sum.izin + item.izin,
      sakit: sum.sakit + item.sakit,
      alpa: sum.alpa + item.alpa,
    }),
    REKAP_KOSONG,
  );
}

/* ========================================================================== */
/* Berkas                                                                     */
/* ========================================================================== */

/** Tipe lampiran yang diterima S-ABS-2 */
export const LAMPIRAN_MIME_TYPES: readonly FileAcceptType[] = [
  'image/jpeg',
  'image/png',
  'application/pdf',
];

/** Batas ukuran lampiran izin (S-ABS-2) */
export const MAX_LAMPIRAN_SIZE = 5 * 1024 * 1024;

const LAMPIRAN_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

export function isLampiranTypeValid(file: File): boolean {
  if ((LAMPIRAN_MIME_TYPES as readonly string[]).includes(file.type)) return true;
  // Sebagian browser tidak mengisi MIME, jadi ekstensi dipakai sebagai cadangan
  const name = file.name.toLowerCase();
  return file.type === '' && LAMPIRAN_EXTENSIONS.some((extension) => name.endsWith(extension));
}

export function extensionForMime(mime: string): string {
  if (mime.includes('jpeg')) return '.jpg';
  if (mime.includes('png')) return '.png';
  if (mime.includes('pdf')) return '.pdf';
  return '';
}

/** Simpan Blob sebagai berkas lewat tautan sementara */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ========================================================================== */
/* ID kelas guru                                                              */
/* ========================================================================== */

/**
 * api-spec.md tidak punya endpoint daftar kelas milik guru, sedangkan G-ABS-1 dan G-ABS-2
 * membutuhkan kelasId. ID diambil dari VITE_KELAS_ID bila ada, lalu dari penyimpanan lokal
 * (diisi guru lewat halaman). Ganti dengan sumber dari backend bila endpoint-nya sudah ada.
 */
const KELAS_STORAGE_KEY = 'absensi:kelasId';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value.trim());
}

export function getKelasIdTersimpan(): string {
  try {
    const stored = localStorage.getItem(KELAS_STORAGE_KEY);
    if (stored && isUuid(stored)) return stored.trim();
  } catch {
    // Storage tidak tersedia, lanjut ke nilai dari env
  }
  const fromEnv = (import.meta.env.VITE_KELAS_ID as string | undefined)?.trim();
  return fromEnv && isUuid(fromEnv) ? fromEnv : '';
}

export function simpanKelasId(kelasId: string): void {
  try {
    localStorage.setItem(KELAS_STORAGE_KEY, kelasId.trim());
  } catch {
    // Abaikan, ID tetap berlaku sampai halaman dimuat ulang
  }
}

/* ========================================================================== */
/* Pesan error                                                                */
/* ========================================================================== */

/**
 * Pesan error siap tampil dari ApiError. Untuk VALIDATION_ERROR, pesan per field
 * dari `details` ikut ditampilkan. Selain ApiError dipakai pesan cadangan.
 */
export function describeError(err: unknown, fallback: string): string {
  if (!isApiError(err)) return fallback;
  if (err.code === 'VALIDATION_ERROR') {
    const fieldMessages = Object.values(getFieldErrors(err));
    if (fieldMessages.length > 0) return `${err.message}: ${fieldMessages.join('; ')}`;
  }
  return err.message;
}
