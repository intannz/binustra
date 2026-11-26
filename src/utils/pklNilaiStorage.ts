import type { NilaiPklGuru } from '../types/portal.types';

const STORAGE_KEY = 'binustra_nilai_pkl_guru';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNilaiPklGuru(value: unknown, siswaId: string): value is NilaiPklGuru {
  if (!isRecord(value) || value.siswaId !== siswaId || !isRecord(value.nilaiIndustri)) return false;

  return [
    value.nilaiSekolah,
    value.nilaiIndustri.sikap,
    value.nilaiIndustri.keterampilan,
    value.nilaiIndustri.kedisiplinan,
    value.nilaiAkhir,
  ].every((score) => typeof score === 'number' && Number.isFinite(score));
}

export function getStoredNilaiPklGuru(): Record<string, NilaiPklGuru | undefined> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error('Data nilai PKL tersimpan di browser tidak dapat dibaca.');
  }

  if (!isRecord(parsed)) {
    throw new Error('Format data nilai PKL tersimpan di browser tidak valid.');
  }

  const nilaiBySiswa: Record<string, NilaiPklGuru | undefined> = {};
  for (const [siswaId, nilai] of Object.entries(parsed)) {
    if (!isNilaiPklGuru(nilai, siswaId)) {
      throw new Error('Format nilai PKL tersimpan di browser tidak valid.');
    }
    nilaiBySiswa[siswaId] = nilai;
  }

  return nilaiBySiswa;
}

export function saveStoredNilaiPklGuru(
  nilaiBySiswa: Record<string, NilaiPklGuru | undefined>,
): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nilaiBySiswa));
}
