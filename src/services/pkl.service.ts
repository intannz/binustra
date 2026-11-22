import api, { toFormData, type RequestOptions } from './api';
import type {
  InputNilaiPklPayload,
  LaporanPkl,
  NilaiPklGuru,
  NilaiPklSiswa,
  PaginatedResponse,
  PaginationParams,
  PklSiswa,
  ReviewLaporanPayload,
  SiswaBimbingan,
  UploadLaporanPayload,
  UploadLaporanResult,
  Uuid,
} from '../types/portal.types';

/** Opsi request yang boleh dipakai pemanggil, misalnya signal untuk membatalkan request */
type CallOptions = Pick<RequestOptions, 'signal'>;

/* ========================================================================== */
/* Siswa                                                                      */
/* ========================================================================== */

/** S-PKL-1: GET /siswa/pkl. Bila belum punya penempatan, server membalas 404 PKL_NOT_FOUND */
export function getPklSiswa(options?: CallOptions): Promise<PklSiswa> {
  return api.get<PklSiswa>('/siswa/pkl', options);
}

/** S-PKL-2: GET /siswa/pkl/nilai. Guru belum menginput nilai: tetap sukses dengan semua nilai null */
export function getNilaiPklSiswa(options?: CallOptions): Promise<NilaiPklSiswa> {
  return api.get<NilaiPklSiswa>('/siswa/pkl/nilai', options);
}

/**
 * S-PKL-3: POST /siswa/pkl/laporan (multipart, field `file`, PDF maksimal 10 MB).
 * Server membalas 201 untuk laporan baru dan 200 saat mengganti file yang berstatus revisi,
 * keduanya sama-sama mengembalikan UploadLaporanResult.
 * Kegagalan: FILE_TYPE_INVALID, FILE_TOO_LARGE, LAPORAN_TIDAK_DAPAT_DIUBAH, PKL_NOT_FOUND.
 */
export function uploadLaporanPkl(
  payload: UploadLaporanPayload,
  options?: CallOptions,
): Promise<UploadLaporanResult> {
  return api.post<UploadLaporanResult>(
    '/siswa/pkl/laporan',
    toFormData({ file: payload.file }),
    options,
  );
}

/* ========================================================================== */
/* Guru                                                                       */
/* ========================================================================== */

/** G-PKL-1: GET /guru/pkl/siswa. Daftar siswa bimbingan, berpagination */
export function getSiswaBimbingan(
  query: PaginationParams = {},
  options?: CallOptions,
): Promise<PaginatedResponse<SiswaBimbingan>> {
  return api.getList<SiswaBimbingan>('/guru/pkl/siswa', {
    ...options,
    params: { page: query.page, limit: query.limit },
  });
}

/** G-PKL-2 (JSON): GET /guru/pkl/laporan/:id. Metadata laporan */
export function getLaporanPkl(id: Uuid, options?: CallOptions): Promise<LaporanPkl> {
  return api.get<LaporanPkl>(`/guru/pkl/laporan/${encodeURIComponent(id)}`, options);
}

/** G-PKL-2 (file): GET /guru/pkl/laporan/:id dengan Accept application/pdf. Mengembalikan Blob PDF */
export function downloadLaporanPkl(id: Uuid, options?: CallOptions): Promise<Blob> {
  return api.download(`/guru/pkl/laporan/${encodeURIComponent(id)}`, 'application/pdf', options);
}

/**
 * G-PKL-3: PATCH /guru/pkl/laporan/:id/review.
 * Catatan wajib bila status revisi. Hanya laporan berstatus menunggu yang bisa direview,
 * selain itu server membalas 422 LAPORAN_TIDAK_DAPAT_DIREVIEW.
 */
export function reviewLaporanPkl(
  id: Uuid,
  payload: ReviewLaporanPayload,
  options?: CallOptions,
): Promise<LaporanPkl> {
  return api.patch<LaporanPkl>(
    `/guru/pkl/laporan/${encodeURIComponent(id)}/review`,
    payload,
    options,
  );
}

/**
 * G-PKL-4: PUT /guru/pkl/siswa/:siswaId/nilai. Upsert nilai akhir PKL.
 * Nilai rentang 0 sampai 100, nilaiAkhir dihitung server dan tidak dikirim dari client.
 */
export function inputNilaiPkl(
  siswaId: Uuid,
  payload: InputNilaiPklPayload,
  options?: CallOptions,
): Promise<NilaiPklGuru> {
  return api.put<NilaiPklGuru>(
    `/guru/pkl/siswa/${encodeURIComponent(siswaId)}/nilai`,
    payload,
    options,
  );
}
