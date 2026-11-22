/**
 * Types untuk API Backend Web Portal Siswa (api-spec.md v2.0).
 * Nama field mengikuti response server (camelCase).
 * Kode endpoint seperti S-PKL-1 dan G-ABS-3 merujuk ke api-spec.md.
 */

/* ========================================================================== */
/* Konvensi umum                                                              */
/* ========================================================================== */

export type Role = 'siswa' | 'guru';

/** Format YYYY-MM-DD */
export type DateString = string;
/** Format YYYY-MM */
export type MonthString = string;
/** ISO 8601 UTC, contoh 2026-11-11T08:30:00Z */
export type IsoDateTime = string;
export type Uuid = string;

/** Format {tahunMulai}-{tahunSelesai}-{ganjil|genap}, contoh 2026-2027-ganjil */
export type SemesterString = `${number}-${number}-${'ganjil' | 'genap'}`;

/** Tipe file yang bisa dialirkan lewat header Accept (G-PKL-2 dan G-ABS-4) */
export type FileAcceptType = 'application/pdf' | 'image/jpeg' | 'image/png';

export interface PaginationParams {
  /** Default 1 */
  page?: number;
  /** Default 20, maksimal 100 */
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

/** Bentuk sukses untuk satu objek: { data } */
export interface ApiResponse<T> {
  data: T;
}

/** Bentuk sukses untuk list: { data, meta } */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/* ========================================================================== */
/* Error                                                                      */
/* ========================================================================== */

/** Kode error dari server (api-spec.md bagian 5) */
export type ServerErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'PKL_NOT_FOUND'
  | 'TAGIHAN_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'FILE_TYPE_INVALID'
  | 'FILE_TOO_LARGE'
  | 'LAPORAN_TIDAK_DAPAT_DIUBAH'
  | 'LAPORAN_TIDAK_DAPAT_DIREVIEW'
  | 'IZIN_SUDAH_DIPUTUSKAN'
  | 'TAGIHAN_SUDAH_LUNAS'
  | 'SISWA_BUKAN_ANGGOTA_KELAS'
  | 'SISWA_DUPLIKAT'
  | 'INTERNAL_ERROR';

/** Kode yang dibuat sisi client saat tidak ada response yang bisa dibaca */
export type ClientErrorCode = 'NETWORK_ERROR' | 'UNKNOWN_ERROR';

export type ApiErrorCode = ServerErrorCode | ClientErrorCode;

/** Isi details untuk VALIDATION_ERROR */
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/** Bentuk error yang sudah dinormalisasi: { error: { code, message, details? } } */
export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ValidationErrorDetail[];
  };
}

/* ========================================================================== */
/* Siswa: PKL                                                                 */
/* ========================================================================== */

export type StatusPkl = 'Belum Dimulai' | 'Aktif' | 'Selesai';

export type StatusLaporan = 'menunggu' | 'disetujui' | 'revisi';

export interface Industri {
  nama: string;
  alamat: string;
}

export interface KontakPembimbing {
  nama: string;
  kontak: string;
}

export interface PeriodePkl {
  mulai: DateString;
  selesai: DateString;
}

export interface ProgresPkl {
  bulanKe: number;
  totalBulan: number;
}

/** null bila siswa belum upload laporan */
export interface LaporanSiswa {
  status: StatusLaporan;
  /** Catatan revisi dari guru */
  catatan: string | null;
}

/** S-PKL-1: GET /siswa/pkl */
export interface PklSiswa {
  status: StatusPkl;
  industri: Industri;
  pembimbingIndustri: KontakPembimbing;
  guruPembimbing: KontakPembimbing;
  periode: PeriodePkl;
  progres: ProgresPkl;
  laporan: LaporanSiswa | null;
}

/** S-PKL-2: GET /siswa/pkl/nilai. Semua null bila guru belum menginput nilai */
export interface NilaiPklSiswa {
  sikap: number | null;
  keterampilan: number | null;
  kedisiplinan: number | null;
  nilaiAkhir: number | null;
}

/** S-PKL-3: POST /siswa/pkl/laporan (201 saat baru, 200 saat mengganti file revisi) */
export interface UploadLaporanPayload {
  /** Hanya application/pdf, maksimal 10 MB */
  file: File;
}

export interface UploadLaporanResult {
  id: Uuid;
  status: StatusLaporan;
  diuploadPada: IsoDateTime;
}

/* ========================================================================== */
/* Siswa: Absensi dan izin                                                    */
/* ========================================================================== */

export interface RekapAbsensi {
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
}

/** S-ABS-1: wajib tepat satu dari bulan atau semester */
export type RekapAbsensiSiswaQuery =
  | { bulan: MonthString; semester?: never }
  | { semester: SemesterString; bulan?: never };

export type JenisIzin = 'izin' | 'sakit';

export type StatusIzin = 'menunggu' | 'disetujui' | 'ditolak';

/** S-ABS-2: POST /siswa/izin (multipart/form-data) */
export interface CreateIzinPayload {
  jenis: JenisIzin;
  tanggalMulai: DateString;
  /** Tidak boleh lebih awal dari tanggalMulai */
  tanggalSelesai: DateString;
  /** Maksimal 500 karakter */
  keterangan?: string;
  /** JPG, PNG, atau PDF, maksimal 5 MB */
  lampiran: File;
}

export interface IzinSiswa {
  id: Uuid;
  jenis: JenisIzin;
  tanggalMulai: DateString;
  tanggalSelesai: DateString;
  keterangan: string | null;
  status: StatusIzin;
  dibuatPada: IsoDateTime;
}

/* ========================================================================== */
/* Siswa: Keuangan                                                            */
/* ========================================================================== */

export type KomponenTagihan = 'SPP' | 'BAHAN_PRAKTIKUM' | 'UKK';

/** Status dihitung server dan saling lepas */
export type StatusTagihan = 'Lunas' | 'Belum Lunas' | 'Jatuh Tempo';

/** S-KEU-1: GET /siswa/tagihan */
export interface TagihanQuery extends PaginationParams {
  status?: StatusTagihan;
}

export interface Tagihan {
  id: Uuid;
  komponen: KomponenTagihan;
  keterangan: string | null;
  nominal: number;
  jatuhTempo: DateString;
  status: StatusTagihan;
}

/** S-KEU-2: GET /siswa/tagihan/ringkasan */
export interface RingkasanTagihan {
  /** Jumlah nominal semua tagihan belum lunas, termasuk yang jatuh tempo */
  total: number;
}

/** S-KEU-3: GET /siswa/info-pembayaran */
export interface InfoPembayaran {
  namaBank: string;
  nomorRekening: string;
  namaPenerima: string;
  jadwalLoket: string;
}

/** S-KEU-4: POST /siswa/pembayaran (multipart/form-data) */
export interface CreatePembayaranPayload {
  tagihanId: Uuid;
  /** Lebih dari 0 */
  nominal: number;
  tanggalTransfer: DateString;
  /** JPG atau PNG, maksimal 5 MB */
  bukti: File;
}

/** Endpoint hanya menyimpan bukti, verifikasi oleh Admin TU di luar scope */
export type StatusPembayaran = 'menunggu';

export interface Pembayaran {
  id: Uuid;
  tagihanId: Uuid;
  nominal: number;
  tanggalTransfer: DateString;
  status: StatusPembayaran;
  diuploadPada: IsoDateTime;
}

/* ========================================================================== */
/* Guru: PKL                                                                  */
/* ========================================================================== */

export interface LaporanRingkas {
  id: Uuid;
  status: StatusLaporan;
}

/** G-PKL-1: GET /guru/pkl/siswa */
export interface SiswaBimbingan {
  siswaId: Uuid;
  nis: string;
  nama: string;
  statusPkl: StatusPkl;
  industri: Industri;
  pembimbingIndustri: KontakPembimbing;
  /** null bila siswa belum upload */
  laporan: LaporanRingkas | null;
}

export interface SiswaRingkas {
  id: Uuid;
  nis: string;
  nama: string;
}

/** G-PKL-2: GET /guru/pkl/laporan/:id (Accept JSON). Juga hasil G-PKL-3 */
export interface LaporanPkl {
  id: Uuid;
  siswa: SiswaRingkas;
  namaFile: string;
  status: StatusLaporan;
  catatan: string | null;
  diuploadPada: IsoDateTime;
  diperiksaPada: IsoDateTime | null;
}

/** G-PKL-3: PATCH /guru/pkl/laporan/:id/review. Catatan wajib bila revisi */
export type ReviewLaporanPayload =
  | { status: 'disetujui'; catatan?: string }
  | { status: 'revisi'; catatan: string };

/** Semua nilai rentang 0 sampai 100 */
export interface NilaiIndustri {
  sikap: number;
  keterampilan: number;
  kedisiplinan: number;
}

/** G-PKL-4: PUT /guru/pkl/siswa/:siswaId/nilai. Client tidak mengirim nilaiAkhir */
export interface InputNilaiPklPayload {
  nilaiSekolah: number;
  nilaiIndustri: NilaiIndustri;
}

export interface NilaiPklGuru {
  siswaId: Uuid;
  nilaiSekolah: number;
  nilaiIndustri: NilaiIndustri;
  nilaiAkhir: number;
}

/* ========================================================================== */
/* Guru: Absensi dan izin                                                     */
/* ========================================================================== */

export type StatusKehadiran = 'hadir' | 'izin' | 'sakit' | 'alpa';

/** G-ABS-1: GET /guru/kelas/:kelasId/absensi/rekap */
export interface RekapAbsensiKelasQuery extends PaginationParams {
  bulan: MonthString;
}

export interface RekapAbsensiKelasItem extends RekapAbsensi {
  siswaId: Uuid;
  nis: string;
  nama: string;
}

/** G-ABS-2: POST /guru/kelas/:kelasId/absensi (upsert, atomik) */
export interface AbsensiItemPayload {
  siswaId: Uuid;
  status: StatusKehadiran;
}

export interface InputAbsensiKelasPayload {
  /** Tidak boleh di masa depan */
  tanggal: DateString;
  /** Minimal 1 item, siswaId tidak boleh ganda */
  data: AbsensiItemPayload[];
}

export interface InputAbsensiKelasResult {
  tanggal: DateString;
  tersimpan: number;
}

/** G-ABS-3: GET /guru/izin */
export interface IzinListQuery extends PaginationParams {
  status?: StatusIzin;
  kelasId?: Uuid;
}

export interface SiswaIzin extends SiswaRingkas {
  kelas: string;
}

export interface IzinListItem {
  id: Uuid;
  siswa: SiswaIzin;
  jenis: JenisIzin;
  tanggalMulai: DateString;
  tanggalSelesai: DateString;
  status: StatusIzin;
  dibuatPada: IsoDateTime;
}

/** G-ABS-4: GET /guru/izin/:id (Accept JSON). Juga hasil G-ABS-5 */
export interface IzinDetail extends IzinListItem {
  keterangan: string | null;
  catatan: string | null;
  diputuskanPada: IsoDateTime | null;
}

/** G-ABS-5: PATCH /guru/izin/:id/keputusan. Catatan wajib bila ditolak */
export type KeputusanIzinPayload =
  | { status: 'disetujui'; catatan?: string }
  | { status: 'ditolak'; catatan: string };

/* ========================================================================== */
/* Guru: Keuangan                                                             */
/* ========================================================================== */

export type StatusPembayaranSiswa = 'Lunas' | 'Belum Lunas';

/** G-KEU-1: GET /guru/kelas/:kelasId/tagihan/status (hanya wali kelas) */
export interface StatusTagihanSiswa {
  siswaId: Uuid;
  nama: string;
  status: StatusPembayaranSiswa;
}

/* ========================================================================== */
/* Auth                                                                       */
/* ========================================================================== */

/**
 * Proses login di luar scope api-spec.md, jadi bentuk payload dan response di bawah
 * adalah asumsi sisi client dan perlu disesuaikan dengan backend.
 */
export interface LoginPayload {
  nomorInduk: string;
  password: string;
}

/** Isi `data` dari response login. Token JWT memuat userId dan role */
export interface LoginResult {
  token: string;
  nama?: string;
}

/** Sesi pengguna yang dibaca dari token JWT (userId dan role) */
export interface AuthUser {
  userId: Uuid;
  role: Role;
  nama: string | null;
}
