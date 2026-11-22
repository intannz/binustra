import api, { toFormData, type RequestOptions } from './api';
import type {
  CreateIzinPayload,
  FileAcceptType,
  InputAbsensiKelasPayload,
  InputAbsensiKelasResult,
  IzinDetail,
  IzinListItem,
  IzinListQuery,
  IzinSiswa,
  KeputusanIzinPayload,
  PaginatedResponse,
  RekapAbsensi,
  RekapAbsensiKelasItem,
  RekapAbsensiKelasQuery,
  RekapAbsensiSiswaQuery,
  Uuid,
} from '../types/portal.types';

/** Opsi request yang boleh dipakai pemanggil, misalnya signal untuk membatalkan request */
type CallOptions = Pick<RequestOptions, 'signal'>;

/* ========================================================================== */
/* Siswa                                                                      */
/* ========================================================================== */

/**
 * S-ABS-1: GET /siswa/absensi/rekap.
 * Wajib mengirim tepat satu dari `bulan` (YYYY-MM) atau `semester` (2026-2027-ganjil),
 * selain itu server membalas 422 VALIDATION_ERROR.
 */
export function getRekapAbsensiSiswa(
  query: RekapAbsensiSiswaQuery,
  options?: CallOptions,
): Promise<RekapAbsensi> {
  return api.get<RekapAbsensi>('/siswa/absensi/rekap', {
    ...options,
    params: { bulan: query.bulan, semester: query.semester },
  });
}

/**
 * S-ABS-2: POST /siswa/izin (multipart). Status awal selalu menunggu.
 * Lampiran JPG, PNG, atau PDF, maksimal 5 MB.
 * Kegagalan: VALIDATION_ERROR, FILE_TYPE_INVALID, FILE_TOO_LARGE.
 */
export function createIzin(payload: CreateIzinPayload, options?: CallOptions): Promise<IzinSiswa> {
  return api.post<IzinSiswa>(
    '/siswa/izin',
    toFormData({
      jenis: payload.jenis,
      tanggalMulai: payload.tanggalMulai,
      tanggalSelesai: payload.tanggalSelesai,
      keterangan: payload.keterangan,
      lampiran: payload.lampiran,
    }),
    options,
  );
}

/* ========================================================================== */
/* Guru                                                                       */
/* ========================================================================== */

/**
 * G-ABS-1: GET /guru/kelas/:kelasId/absensi/rekap.
 * `bulan` wajib (YYYY-MM). Guru harus wali kelas atau pengajar kelas ini, selain itu 403.
 */
export function getRekapAbsensiKelas(
  kelasId: Uuid,
  query: RekapAbsensiKelasQuery,
  options?: CallOptions,
): Promise<PaginatedResponse<RekapAbsensiKelasItem>> {
  return api.getList<RekapAbsensiKelasItem>(
    `/guru/kelas/${encodeURIComponent(kelasId)}/absensi/rekap`,
    {
      ...options,
      params: { bulan: query.bulan, page: query.page, limit: query.limit },
    },
  );
}

/**
 * G-ABS-2: POST /guru/kelas/:kelasId/absensi. Upsert dan atomik: gagal satu berarti gagal semua.
 * Kegagalan: SISWA_BUKAN_ANGGOTA_KELAS, SISWA_DUPLIKAT, VALIDATION_ERROR.
 */
export function inputAbsensiKelas(
  kelasId: Uuid,
  payload: InputAbsensiKelasPayload,
  options?: CallOptions,
): Promise<InputAbsensiKelasResult> {
  return api.post<InputAbsensiKelasResult>(
    `/guru/kelas/${encodeURIComponent(kelasId)}/absensi`,
    payload,
    options,
  );
}

/** G-ABS-3: GET /guru/izin. Daftar pengajuan izin, terbaru dulu, berpagination */
export function getDaftarIzin(
  query: IzinListQuery = {},
  options?: CallOptions,
): Promise<PaginatedResponse<IzinListItem>> {
  return api.getList<IzinListItem>('/guru/izin', {
    ...options,
    params: {
      status: query.status,
      kelasId: query.kelasId,
      page: query.page,
      limit: query.limit,
    },
  });
}

/** G-ABS-4 (JSON): GET /guru/izin/:id. Detail pengajuan izin */
export function getDetailIzin(id: Uuid, options?: CallOptions): Promise<IzinDetail> {
  return api.get<IzinDetail>(`/guru/izin/${encodeURIComponent(id)}`, options);
}

/**
 * G-ABS-4 (file): GET /guru/izin/:id dengan header Accept sesuai tipe lampiran.
 * Pilih application/pdf, image/jpeg, atau image/png. Mengembalikan Blob lampiran.
 */
export function downloadLampiranIzin(
  id: Uuid,
  accept: FileAcceptType,
  options?: CallOptions,
): Promise<Blob> {
  return api.download(`/guru/izin/${encodeURIComponent(id)}`, accept, options);
}

/**
 * G-ABS-5: PATCH /guru/izin/:id/keputusan.
 * Catatan wajib bila ditolak. Izin yang sudah diputuskan tidak bisa diputuskan ulang
 * (422 IZIN_SUDAH_DIPUTUSKAN). Saat disetujui, server mengisi absensi pada rentang tanggal izin.
 */
export function putuskanIzin(
  id: Uuid,
  payload: KeputusanIzinPayload,
  options?: CallOptions,
): Promise<IzinDetail> {
  return api.patch<IzinDetail>(`/guru/izin/${encodeURIComponent(id)}/keputusan`, payload, options);
}
