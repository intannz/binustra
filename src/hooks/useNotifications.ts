import { useEffect, useState } from 'react';
import { useApi } from './useApi';
import { useAuth } from './useAuth';
import { getDaftarIzin } from '../services/absensi.service';
import { getTagihanSiswa } from '../services/keuangan.service';
import { getPklSiswa, getSiswaBimbingan } from '../services/pkl.service';
import type { PaginatedResponse, Role, SiswaBimbingan, Tagihan } from '../types/portal.types';
import { formatRupiah, formatTanggal } from '../utils/formatter';
import { getNamaTagihan, isBelumDibayar, TAGIHAN_PAGE_SIZE } from '../utils/keuangan';
import {
  getStoredIzinSiswa,
  subscribeStoredIzinSiswa,
  type IzinSiswaTersimpan,
} from '../utils/izinStorage';
import {
  getPengajuanMitra,
  subscribePengajuanMitra,
  type PengajuanMitra,
} from '../utils/pklMitraStorage';

const READ_NOTIFICATIONS_KEY = 'binustra_read_notifications';
const PAGE_SIZE = 100;

export interface ClientNotification {
  id: string;
  title: string;
  detail: string;
  path: string;
  isRead: boolean;
}

export interface NotificationLoadError {
  label: string;
  message: string;
  retry: () => void;
}

interface StoredReadIds {
  ids: string[];
  storageError: boolean;
}

interface MitraNotificationState {
  entries: PengajuanMitra[];
  error: string | null;
}

interface IzinNotificationState {
  entries: IzinSiswaTersimpan[];
  error: string | null;
}

function readMitraEntries(): MitraNotificationState {
  try {
    return { entries: getPengajuanMitra(), error: null };
  } catch (error) {
    return {
      entries: [],
      error: error instanceof Error ? error.message : 'Data pengajuan mitra tidak dapat dibaca.',
    };
  }
}

function readIzinEntries(siswaId: string | null): IzinNotificationState {
  if (!siswaId) return { entries: [], error: null };
  try {
    return { entries: getStoredIzinSiswa(siswaId), error: null };
  } catch (error) {
    return {
      entries: [],
      error: error instanceof Error ? error.message : 'Riwayat pengajuan izin tidak dapat dibaca.',
    };
  }
}

function readStoredIds(): StoredReadIds {
  try {
    const stored = localStorage.getItem(READ_NOTIFICATIONS_KEY);
    if (stored === null) return { ids: [], storageError: false };

    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.every((id): id is string => typeof id === 'string')) {
      return { ids: parsed, storageError: false };
    }
    return { ids: [], storageError: true };
  } catch {
    return { ids: [], storageError: true };
  }
}

function getTagihanNotificationName(invoice: Tagihan): string {
  const name = getNamaTagihan(invoice);
  const [year, month] = invoice.jatuhTempo.split('-').map(Number);
  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
  return name.toLocaleLowerCase('id-ID').includes(monthLabel.toLocaleLowerCase('id-ID'))
    ? name
    : `${name} ${monthLabel}`;
}

async function getAllSiswaBimbingan(signal: AbortSignal): Promise<PaginatedResponse<SiswaBimbingan>> {
  const firstPage = await getSiswaBimbingan({ page: 1, limit: PAGE_SIZE }, { signal });
  const pageCount = Math.ceil(firstPage.meta.total / Math.max(firstPage.meta.limit, 1));
  const data = [...firstPage.data];

  for (let page = 2; page <= pageCount; page += 1) {
    const nextPage = await getSiswaBimbingan({ page, limit: PAGE_SIZE }, { signal });
    data.push(...nextPage.data);
  }

  return { data, meta: firstPage.meta };
}

async function getAllTagihanSiswa(signal: AbortSignal): Promise<PaginatedResponse<Tagihan>> {
  const firstPage = await getTagihanSiswa({ page: 1, limit: TAGIHAN_PAGE_SIZE }, { signal });
  const pageCount = Math.ceil(firstPage.meta.total / Math.max(firstPage.meta.limit, 1));
  const data = [...firstPage.data];

  for (let page = 2; page <= pageCount; page += 1) {
    const nextPage = await getTagihanSiswa({ page, limit: TAGIHAN_PAGE_SIZE }, { signal });
    data.push(...nextPage.data);
  }

  return { data, meta: firstPage.meta };
}

export function useNotifications() {
  const { user } = useAuth();
  const role: Role | null = user?.role ?? null;
  const userId = user?.userId ?? null;

  const tagihan = useApi(
    role === 'siswa' && userId ? `notifications:${userId}:tagihan` : null,
    getAllTagihanSiswa,
  );
  const pkl = useApi(
    role === 'siswa' && userId ? `notifications:${userId}:pkl` : null,
    (signal) => getPklSiswa({ signal }),
  );
  const siswaBimbingan = useApi(
    role === 'guru' && userId ? `notifications:${userId}:pkl-siswa` : null,
    (signal) => getAllSiswaBimbingan(signal),
  );
  const daftarIzin = useApi(
    role === 'guru' && userId ? `notifications:${userId}:izin` : null,
    (signal) => getDaftarIzin({ status: 'menunggu', page: 1, limit: PAGE_SIZE }, { signal }),
  );

  const [storedReadIds, setStoredReadIds] = useState<StoredReadIds>(readStoredIds);
  const [mitraState, setMitraState] = useState<MitraNotificationState>(readMitraEntries);
  const [izinState, setIzinState] = useState<IzinNotificationState>(() => readIzinEntries(userId));
  useEffect(
    () => subscribePengajuanMitra(() => setMitraState(readMitraEntries())),
    [],
  );
  useEffect(() => {
    if (role !== 'siswa' || !userId) return;
    const refreshIzin = () => setIzinState(readIzinEntries(userId));
    refreshIzin();
    return subscribeStoredIzinSiswa(refreshIzin);
  }, [role, userId]);

  const accountScope = `${role ?? 'unknown'}:${userId ?? 'unknown'}`;
  const readIdSet = new Set(storedReadIds.ids);
  const items: ClientNotification[] = [];

  if (role === 'siswa') {
    // API siswa belum menyediakan GET riwayat izin atau status keputusan izin.
    for (const invoice of tagihan.data?.data ?? []) {
      if (!isBelumDibayar(invoice)) continue;
      const id = `${accountScope}:tagihan:${invoice.id}`;
      items.push({
        id,
        title: `Tagihan ${getTagihanNotificationName(invoice)} sebesar ${formatRupiah(invoice.nominal)} belum lunas`,
        detail: invoice.status,
        path: '/siswa/keuangan',
        isRead: readIdSet.has(id),
      });
    }

    const laporan = pkl.data?.laporan;
    if (laporan?.status === 'revisi' || laporan?.status === 'disetujui') {
      const id = `${accountScope}:pkl:laporan:${laporan.status}`;
      items.push({
        id,
        title: laporan.status === 'revisi' ? 'Laporan PKL perlu revisi' : 'Laporan PKL disetujui',
        detail: laporan.catatan || 'Lihat status laporan PKL Anda.',
        path: '/siswa/pkl',
        isRead: readIdSet.has(id),
      });
    }

    for (const izin of izinState.entries) {
      if (izin.status !== 'disetujui' && izin.status !== 'ditolak') continue;
      const id = `${accountScope}:izin:${izin.id}:${izin.status}`;
      const status = izin.status === 'disetujui' ? 'disetujui' : 'ditolak';
      const jenis = izin.jenis === 'sakit' ? 'Sakit' : 'Izin';
      const rentangTanggal =
        izin.tanggalMulai === izin.tanggalSelesai
          ? formatTanggal(izin.tanggalMulai)
          : `${formatTanggal(izin.tanggalMulai)} - ${formatTanggal(izin.tanggalSelesai)}`;
      items.push({
        id,
        title: `Pengajuan ${jenis.toLocaleLowerCase('id-ID')} ${status}`,
        detail: `${jenis} tanggal ${rentangTanggal}${izin.catatanGuru ? `. Catatan: ${izin.catatanGuru}` : ''}`,
        path: '/siswa/absensi',
        isRead: readIdSet.has(id),
      });
    }
  } else if (role === 'guru') {
    const laporanMenunggu = (siswaBimbingan.data?.data ?? []).filter(
      (student) => student.laporan?.status === 'menunggu',
    );
    if (laporanMenunggu.length > 0) {
      const laporanIds = laporanMenunggu
        .map((student) => student.laporan?.id)
        .filter((id): id is string => id !== undefined)
        .sort();
      const id = `${accountScope}:pkl:menunggu:${laporanIds.join(',')}`;
      items.push({
        id,
        title: `Ada ${laporanMenunggu.length} laporan PKL menunggu review`,
        detail: 'Buka PKL untuk meninjau laporan siswa.',
        path: '/guru/pkl',
        isRead: readIdSet.has(id),
      });
    }

    const izinMenunggu = (daftarIzin.data?.data ?? []).filter((izin) => izin.status === 'menunggu');
    const jumlahIzinMenunggu = daftarIzin.data?.meta.total ?? izinMenunggu.length;
    if (jumlahIzinMenunggu > 0) {
      const izinIds = izinMenunggu.map((izin) => izin.id).sort();
      const id = `${accountScope}:izin:menunggu:${jumlahIzinMenunggu}:${izinIds.join(',')}`;
      items.push({
        id,
        title: `Ada ${jumlahIzinMenunggu} pengajuan izin siswa perlu keputusan`,
        detail: 'Buka halaman Absensi untuk meninjau pengajuan.',
        path: '/guru/absensi',
        isRead: readIdSet.has(id),
      });
    }

    const mitraMenunggu = mitraState.entries.filter((entry) => entry.status === 'Menunggu');
    if (mitraMenunggu.length > 0) {
      const mitraIds = mitraMenunggu.map((entry) => entry.id).sort();
      const id = `${accountScope}:pkl:mitra-menunggu:${mitraIds.join(',')}`;
      items.push({
        id,
        title: `Ada ${mitraMenunggu.length} pengajuan mitra PKL menunggu persetujuan`,
        detail: 'Buka PKL untuk meninjau pengajuan mitra siswa.',
        path: '/guru/pkl',
        isRead: readIdSet.has(id),
      });
    }
  }

  const errors: NotificationLoadError[] = [];
  if (role === 'siswa') {
    if (tagihan.error) {
      errors.push({ label: 'Tagihan', message: tagihan.error.message, retry: tagihan.refetch });
    }
    if (pkl.error && pkl.error.code !== 'PKL_NOT_FOUND') {
      errors.push({ label: 'PKL', message: pkl.error.message, retry: pkl.refetch });
    }
    if (izinState.error) {
      errors.push({
        label: 'Riwayat izin',
        message: izinState.error,
        retry: () => setIzinState(readIzinEntries(userId)),
      });
    }
  } else if (role === 'guru') {
    if (siswaBimbingan.error) {
      errors.push({
        label: 'Laporan PKL',
        message: siswaBimbingan.error.message,
        retry: siswaBimbingan.refetch,
      });
    }
    if (daftarIzin.error) {
      errors.push({ label: 'Pengajuan izin', message: daftarIzin.error.message, retry: daftarIzin.refetch });
    }
    if (mitraState.error) {
      errors.push({
        label: 'Pengajuan mitra PKL',
        message: mitraState.error,
        retry: () => setMitraState(readMitraEntries()),
      });
    }
  }

  const loading =
    role === 'siswa'
      ? tagihan.loading || pkl.loading
      : role === 'guru' && (siswaBimbingan.loading || daftarIzin.loading);

  const markAsRead = (id: string) => {
    if (readIdSet.has(id)) return;

    const ids = [...new Set([...storedReadIds.ids, id])];
    let storageError = false;
    try {
      localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(ids));
    } catch {
      storageError = true;
    }
    setStoredReadIds({ ids, storageError });
  };

  return {
    items,
    unreadCount: items.filter((item) => !item.isRead).length,
    loading,
    errors,
    storageError: storedReadIds.storageError,
    markAsRead,
  };
}
