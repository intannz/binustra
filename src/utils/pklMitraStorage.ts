export type StatusPengajuanMitra = 'Menunggu' | 'Disetujui' | 'Ditolak';

export interface PengajuanMitra {
  id: string;
  siswaId: string;
  namaSiswa: string;
  namaPerusahaan: string;
  alamat: string;
  bidang: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  status: StatusPengajuanMitra;
  catatanGuru: string;
}

export type PengajuanMitraInput = Omit<
  PengajuanMitra,
  'id' | 'status' | 'catatanGuru'
>;

const STORAGE_KEY = 'binustra_pengajuan_mitra';
const STORAGE_EVENT = 'binustra:pengajuan-mitra-changed';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPengajuanMitra(value: unknown): value is PengajuanMitra {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.siswaId === 'string' &&
    typeof value.namaSiswa === 'string' &&
    typeof value.namaPerusahaan === 'string' &&
    typeof value.alamat === 'string' &&
    typeof value.bidang === 'string' &&
    typeof value.tanggalMulai === 'string' &&
    typeof value.tanggalSelesai === 'string' &&
    (value.status === 'Menunggu' || value.status === 'Disetujui' || value.status === 'Ditolak') &&
    typeof value.catatanGuru === 'string'
  );
}

function savePengajuanMitra(entries: PengajuanMitra[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function getPengajuanMitra(): PengajuanMitra[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error('Data pengajuan mitra di browser tidak dapat dibaca.');
  }

  if (!Array.isArray(parsed) || !parsed.every(isPengajuanMitra)) {
    throw new Error('Format data pengajuan mitra di browser tidak valid.');
  }
  return parsed;
}

export function tambahPengajuanMitra(input: PengajuanMitraInput): PengajuanMitra {
  const entries = getPengajuanMitra();
  const hasActiveApplication = entries.some(
    (entry) =>
      entry.siswaId === input.siswaId &&
      (entry.status === 'Menunggu' || entry.status === 'Disetujui'),
  );
  if (hasActiveApplication) {
    throw new Error('Pengajuan mitra yang aktif sudah tersedia untuk akun ini.');
  }

  const entry: PengajuanMitra = {
    ...input,
    id: crypto.randomUUID(),
    status: 'Menunggu',
    catatanGuru: '',
  };
  savePengajuanMitra([...entries, entry]);
  return entry;
}

export function putuskanPengajuanMitra(
  id: string,
  status: Exclude<StatusPengajuanMitra, 'Menunggu'>,
  catatanGuru: string,
): PengajuanMitra {
  const entries = getPengajuanMitra();
  const target = entries.find((entry) => entry.id === id);
  if (!target) throw new Error('Pengajuan mitra tidak ditemukan.');
  if (target.status !== 'Menunggu') throw new Error('Pengajuan mitra sudah diputuskan.');

  const updated: PengajuanMitra = { ...target, status, catatanGuru: catatanGuru.trim() };
  savePengajuanMitra(entries.map((entry) => (entry.id === id ? updated : entry)));
  return updated;
}

export function subscribePengajuanMitra(onChange: () => void): () => void {
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
