const TANGGAL_FORMAT = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const BULAN_SINGKAT_FORMAT = new Intl.DateTimeFormat('id-ID', { month: 'short' });

const NILAI_FORMAT = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

const RUPIAH_FORMAT = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

/** Baca YYYY-MM-DD (sebagai tanggal lokal agar tidak bergeser zona waktu) atau ISO 8601 lengkap */
function parseTanggal(value: string | null | undefined): Date | null {
  if (!value) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Format tanggal ke bahasa Indonesia, contoh "13 Juli 2026".
 * Menerima YYYY-MM-DD (dibaca sebagai tanggal lokal agar tidak bergeser zona waktu)
 * maupun ISO 8601 lengkap. Nilai kosong atau tidak valid menghasilkan "-".
 */
export function formatTanggal(value: string | null | undefined): string {
  const date = parseTanggal(value);
  return date ? TANGGAL_FORMAT.format(date) : '-';
}

/** Tanggal untuk kotak agenda, contoh { tgl: "20", bulan: "Nov" }. Nilai tidak valid menghasilkan "-" */
export function formatTanggalSingkat(value: string | null | undefined): { tgl: string; bulan: string } {
  const date = parseTanggal(value);
  if (!date) return { tgl: '-', bulan: '' };
  return { tgl: String(date.getDate()).padStart(2, '0'), bulan: BULAN_SINGKAT_FORMAT.format(date) };
}

/** Format nilai dengan koma desimal, contoh 87,6. Nilai null atau undefined menghasilkan "-" */
export function formatNilai(value: number | null | undefined): string {
  return typeof value === 'number' ? NILAI_FORMAT.format(value) : '-';
}

/** Format rupiah tanpa desimal, contoh "Rp 350.000". Nilai null atau undefined menghasilkan "-" */
export function formatRupiah(value: number | null | undefined): string {
  return typeof value === 'number' ? RUPIAH_FORMAT.format(value) : '-';
}

/** Inisial untuk avatar: huruf pertama kata pertama dan terakhir, "?" bila nama kosong */
export function getInisial(nama: string | null | undefined): string {
  const words = nama?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return '?';

  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
  return `${first}${last}`.toUpperCase();
}
