import api, { toFormData, type RequestOptions } from './api';
import type {
  CreatePembayaranPayload,
  InfoPembayaran,
  PaginatedResponse,
  Pembayaran,
  RingkasanTagihan,
  StatusTagihanSiswa,
  Tagihan,
  TagihanQuery,
  PaginationParams,
  Uuid,
} from '../types/portal.types';

/** Opsi request yang boleh dipakai pemanggil, misalnya signal untuk membatalkan request */
type CallOptions = Pick<RequestOptions, 'signal'>;

/* ========================================================================== */
/* Siswa                                                                      */
/* ========================================================================== */

/**
 * S-KEU-1: GET /siswa/tagihan. Rincian tagihan, berpagination.
 * Filter status=Belum Lunas tidak mencakup tagihan yang berstatus Jatuh Tempo.
 */
export function getTagihanSiswa(
  query: TagihanQuery = {},
  options?: CallOptions,
): Promise<PaginatedResponse<Tagihan>> {
  return api.getList<Tagihan>('/siswa/tagihan', {
    ...options,
    params: { status: query.status, page: query.page, limit: query.limit },
  });
}

/** S-KEU-2: GET /siswa/tagihan/ringkasan. Total tagihan belum lunas, termasuk yang jatuh tempo */
export function getRingkasanTagihan(options?: CallOptions): Promise<RingkasanTagihan> {
  return api.get<RingkasanTagihan>('/siswa/tagihan/ringkasan', options);
}

/** S-KEU-3: GET /siswa/info-pembayaran. Instruksi pembayaran manual */
export function getInfoPembayaran(options?: CallOptions): Promise<InfoPembayaran> {
  return api.get<InfoPembayaran>('/siswa/info-pembayaran', options);
}

/**
 * S-KEU-4: POST /siswa/pembayaran (multipart). Hanya menyimpan bukti dengan status menunggu.
 * Bukti JPG atau PNG, maksimal 5 MB.
 * Kegagalan: TAGIHAN_NOT_FOUND, TAGIHAN_SUDAH_LUNAS, FILE_TYPE_INVALID, FILE_TOO_LARGE, VALIDATION_ERROR.
 */
export function uploadBuktiPembayaran(
  payload: CreatePembayaranPayload,
  options?: CallOptions,
): Promise<Pembayaran> {
  return api.post<Pembayaran>(
    '/siswa/pembayaran',
    toFormData({
      tagihanId: payload.tagihanId,
      nominal: payload.nominal,
      tanggalTransfer: payload.tanggalTransfer,
      bukti: payload.bukti,
    }),
    options,
  );
}

/* ========================================================================== */
/* Guru                                                                       */
/* ========================================================================== */

/**
 * G-KEU-1: GET /guru/kelas/:kelasId/tagihan/status. Status pembayaran siswa satu kelas, read-only.
 * Hanya wali kelas yang boleh mengakses, pengajar biasa mendapat 403.
 */
export function getStatusTagihanKelas(
  kelasId: Uuid,
  query: PaginationParams = {},
  options?: CallOptions,
): Promise<PaginatedResponse<StatusTagihanSiswa>> {
  return api.getList<StatusTagihanSiswa>(
    `/guru/kelas/${encodeURIComponent(kelasId)}/tagihan/status`,
    {
      ...options,
      params: { page: query.page, limit: query.limit },
    },
  );
}
