import { useEffect, useRef, useState } from 'react';
import { ApiError, isApiError } from '../services/api';

export interface UseApiResult<T> {
  /** Hasil terakhir yang berhasil. Tetap ada saat key berganti dan request baru berjalan */
  data: T | undefined;
  /** Error dari request untuk key saat ini, null bila belum ada atau berhasil */
  error: ApiError | null;
  /** true selama request untuk key saat ini belum selesai */
  loading: boolean;
  /** Ulangi request untuk key yang sama */
  refetch: () => void;
}

interface Settled<T> {
  requestId: string;
  data: T | undefined;
  error: ApiError | null;
}

function toApiError(err: unknown): ApiError {
  if (isApiError(err)) return err;
  return new ApiError(0, {
    code: 'UNKNOWN_ERROR',
    message: err instanceof Error ? err.message : 'Terjadi kesalahan yang tidak diketahui.',
  });
}

/**
 * Ambil data saat komponen tampil dan setiap kali `key` berubah.
 *
 * `key` mengidentifikasi request, jadi masukkan semua nilai yang memengaruhi hasilnya,
 * misalnya `tagihan:${status}:${page}`. Isi null untuk menunda request (misalnya id belum ada).
 * `fetcher` menerima AbortSignal yang otomatis dibatalkan saat key berganti atau komponen dilepas.
 *
 * @example
 * const { data, loading, error } = useApi('siswa:pkl', (signal) => getPklSiswa({ signal }));
 */
export function useApi<T>(
  key: string | null,
  fetcher: (signal: AbortSignal) => Promise<T>,
): UseApiResult<T> {
  const [reloadCount, setReloadCount] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const fetcherRef = useRef(fetcher);

  const requestId = key === null ? null : `${key}#${reloadCount}`;

  // Fetcher terbaru dipakai tanpa ikut menjadi dependency, jadi fungsi inline aman
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (requestId === null) return;

    const controller = new AbortController();
    fetcherRef.current(controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return;
        setSettled({ requestId, data, error: null });
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        const error = toApiError(err);
        setSettled((previous) => ({ requestId, data: previous?.data, error }));
      },
    );

    return () => controller.abort();
  }, [requestId]);

  const isCurrent = settled !== null && settled.requestId === requestId;

  return {
    data: requestId === null ? undefined : settled?.data,
    error: isCurrent ? settled.error : null,
    loading: requestId !== null && !isCurrent,
    refetch: () => setReloadCount((count) => count + 1),
  };
}
