import type { KomponenTagihan, Tagihan } from '../types/portal.types';

/** Batas maksimum limit di S-KEU-1, supaya semua tagihan siswa muat dalam satu halaman */
export const TAGIHAN_PAGE_SIZE = 100;

/** Batas maksimum limit di G-KEU-1, supaya satu kelas muat dalam satu halaman */
export const STATUS_KELAS_PAGE_SIZE = 100;

/** Batas ukuran bukti pembayaran (S-KEU-4) */
export const MAX_BUKTI_SIZE = 5 * 1024 * 1024;

const BUKTI_MIME_TYPES = ['image/jpeg', 'image/png'];
const BUKTI_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

export const KOMPONEN_LABEL: Record<KomponenTagihan, string> = {
  SPP: 'SPP',
  BAHAN_PRAKTIKUM: 'Bahan praktikum',
  UKK: 'UKK',
};

/** Nama tagihan untuk ditampilkan: keterangan bila ada, kalau tidak nama komponennya */
export function getNamaTagihan(tagihan: Pick<Tagihan, 'keterangan' | 'komponen'>): string {
  return tagihan.keterangan?.trim() || KOMPONEN_LABEL[tagihan.komponen];
}

/** Belum dibayar mencakup Belum Lunas dan Jatuh Tempo, karena kedua status saling lepas di server */
export function isBelumDibayar(tagihan: Pick<Tagihan, 'status'>): boolean {
  return tagihan.status === 'Belum Lunas' || tagihan.status === 'Jatuh Tempo';
}

/** Salinan daftar yang diurutkan menurut tanggal jatuh tempo (YYYY-MM-DD) */
export function urutkanJatuhTempo(items: readonly Tagihan[], arah: 'asc' | 'desc'): Tagihan[] {
  const sorted = [...items].sort((a, b) => a.jatuhTempo.localeCompare(b.jatuhTempo));
  return arah === 'asc' ? sorted : sorted.reverse();
}

/** Pesan masalah bila bukti bukan JPG atau PNG atau lebih dari 5 MB, null bila berkas dapat dikirim */
export function validateBukti(file: File): string | null {
  const name = file.name.toLowerCase();
  const typeOk =
    BUKTI_MIME_TYPES.includes(file.type) ||
    // Sebagian browser tidak mengisi MIME, jadi ekstensi dipakai sebagai cadangan
    (file.type === '' && BUKTI_EXTENSIONS.some((extension) => name.endsWith(extension)));

  if (!typeOk) return 'Bukti pembayaran harus berupa gambar JPG atau PNG.';
  if (file.size > MAX_BUKTI_SIZE) return 'Ukuran bukti pembayaran maksimal 5 MB.';
  return null;
}
