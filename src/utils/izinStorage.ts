import type { IzinSiswa, StatusIzin } from '../types/portal.types';

const STORAGE_KEY = 'binustra_riwayat_izin_siswa';
const STORAGE_EVENT = 'binustra:riwayat-izin-siswa-changed';

export interface IzinSiswaTersimpan extends IzinSiswa {
  siswaId: string;
  catatanGuru: string | null;
}

type IzinSiswaMap = Record<string, IzinSiswaTersimpan[]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJenisIzin(value: unknown): value is IzinSiswa['jenis'] {
  return value === 'izin' || value === 'sakit';
}

function isStatusIzin(value: unknown): value is StatusIzin {
  return value === 'menunggu' || value === 'disetujui' || value === 'ditolak';
}

function isStoredIzin(value: unknown, siswaId: string): value is IzinSiswaTersimpan {
  return (
    isRecord(value) &&
    value.siswaId === siswaId &&
    typeof value.id === 'string' &&
    isJenisIzin(value.jenis) &&
    typeof value.tanggalMulai === 'string' &&
    typeof value.tanggalSelesai === 'string' &&
    (typeof value.keterangan === 'string' || value.keterangan === null) &&
    isStatusIzin(value.status) &&
    typeof value.dibuatPada === 'string' &&
    (typeof value.catatanGuru === 'string' || value.catatanGuru === null)
  );
}

function readAllIzin(): IzinSiswaMap {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error('Riwayat pengajuan izin di browser tidak dapat dibaca.');
  }

  if (!isRecord(parsed)) {
    throw new Error('Format riwayat pengajuan izin di browser tidak valid.');
  }

  const riwayat: IzinSiswaMap = {};
  for (const [siswaId, value] of Object.entries(parsed)) {
    if (!Array.isArray(value) || !value.every((item) => isStoredIzin(item, siswaId))) {
      throw new Error('Format riwayat pengajuan izin di browser tidak valid.');
    }
    riwayat[siswaId] = value;
  }

  return riwayat;
}

function writeAllIzin(riwayat: IzinSiswaMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(riwayat));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function getStoredIzinSiswa(siswaId: string): IzinSiswaTersimpan[] {
  return [...(readAllIzin()[siswaId] ?? [])].sort((a, b) => b.dibuatPada.localeCompare(a.dibuatPada));
}

export function upsertStoredIzinSiswa(siswaId: string, izin: IzinSiswa): IzinSiswaTersimpan {
  const riwayat = readAllIzin();
  const current = riwayat[siswaId] ?? [];
  const previous = current.find((item) => item.id === izin.id);
  const storedIzin: IzinSiswaTersimpan = {
    ...izin,
    siswaId,
    catatanGuru: previous?.catatanGuru ?? null,
  };

  riwayat[siswaId] = [storedIzin, ...current.filter((item) => item.id !== izin.id)];
  writeAllIzin(riwayat);
  return storedIzin;
}

export function updateStoredIzinStatus(
  id: string,
  status: StatusIzin,
  catatanGuru?: string | null,
): boolean {
  const riwayat = readAllIzin();
  let changed = false;

  for (const [siswaId, entries] of Object.entries(riwayat)) {
    riwayat[siswaId] = entries.map((entry) => {
      if (entry.id !== id) return entry;
      changed = true;
      return {
        ...entry,
        status,
        catatanGuru: catatanGuru === undefined ? entry.catatanGuru : catatanGuru,
      };
    });
  }

  if (changed) writeAllIzin(riwayat);
  return changed;
}

export function syncStoredIzinStatuses(
  entries: readonly { id: string; status: StatusIzin }[],
): boolean {
  const statusById = new Map(entries.map((entry) => [entry.id, entry.status]));
  if (statusById.size === 0) return false;

  const riwayat = readAllIzin();
  let changed = false;

  for (const [siswaId, cachedEntries] of Object.entries(riwayat)) {
    riwayat[siswaId] = cachedEntries.map((entry) => {
      const status = statusById.get(entry.id);
      if (status === undefined || status === entry.status) return entry;
      changed = true;
      return { ...entry, status };
    });
  }

  if (changed) writeAllIzin(riwayat);
  return changed;
}

export function subscribeStoredIzinSiswa(onChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener('storage', handleStorage);
  window.addEventListener(STORAGE_EVENT, onChange);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(STORAGE_EVENT, onChange);
  };
}
