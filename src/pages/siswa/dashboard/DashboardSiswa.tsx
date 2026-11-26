import { useState, type ReactNode } from 'react';
import { FiMapPin, FiCalendar, FiUser, FiChevronRight, FiCheckCircle, FiBriefcase } from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import Sidebar from '../../../components/layout/Sidebar';
import Footer from '../../../components/layout/Footer';
import NotificationBell from '../../../components/layout/NotificationBell';
import ProfileMenu from '../../../components/layout/ProfileMenu';
import styles from './DashboardSiswa.module.css';

import { useApi, type UseApiResult } from '../../../hooks/useApi';
import { useAuth } from '../../../hooks/useAuth';
import { getRekapAbsensiSiswa } from '../../../services/absensi.service';
import { getRingkasanTagihan, getTagihanSiswa } from '../../../services/keuangan.service';
import { getNilaiPklSiswa, getPklSiswa } from '../../../services/pkl.service';
import type {
  NilaiPklSiswa,
  PklSiswa,
  RekapAbsensi,
  RingkasanTagihan,
  StatusPkl,
  Tagihan,
} from '../../../types/portal.types';
import { formatBulan, persentaseHadir, toMonthValue, totalRekap } from '../../../utils/absensi';
import {
  formatNilai,
  formatRupiah,
  formatTanggal,
  formatTanggalSingkat,
} from '../../../utils/formatter';
import {
  TAGIHAN_PAGE_SIZE,
  getNamaTagihan,
  isBelumDibayar,
  urutkanJatuhTempo,
} from '../../../utils/keuangan';

/* ========================================================================== */
/* Konstanta & helper                                                         */
/* ========================================================================== */

const WARNA_HADIR = '#10b981';
const WARNA_IZIN = '#f59e0b';
const WARNA_SAKIT = '#3b82f6';
const WARNA_ALPA = '#ef4444';
const WARNA_KOSONG = '#e5e7eb';

/** Jumlah tagihan pada kartu "Tagihan Terbaru" dan agenda pada kartu "Agenda & Pengingat" */
const MAX_TAGIHAN_TERBARU = 3;
const MAX_AGENDA = 4;

type DotColor = 'dotBlue' | 'dotGreen' | 'dotYellow' | 'dotRed';

/** Isi satu kartu statistik di bagian atas dashboard */
interface StatView {
  value: string;
  sub: string;
  dot: DotColor;
  note: string;
}

const PKL_VIEW: Record<StatusPkl, { value: string; dot: DotColor; note: string }> = {
  'Belum Dimulai': { value: 'Belum Dimulai', dot: 'dotYellow', note: 'Belum dimulai' },
  Aktif: { value: 'Aktif PKL', dot: 'dotBlue', note: 'Sedang berjalan' },
  Selesai: { value: 'Selesai PKL', dot: 'dotGreen', note: 'Telah selesai' },
};

function getPklStat(pkl: UseApiResult<PklSiswa>): StatView {
  if (pkl.data) {
    const view = PKL_VIEW[pkl.data.status];
    return { ...view, sub: pkl.data.industri.nama };
  }
  if (pkl.error?.code === 'PKL_NOT_FOUND') {
    return { value: 'Belum ada', sub: 'Belum ada penempatan PKL', dot: 'dotYellow', note: 'Hubungi guru pembimbing' };
  }
  if (pkl.error) {
    return { value: '-', sub: 'Data PKL belum dapat dimuat', dot: 'dotRed', note: 'Gagal memuat' };
  }
  return { value: '…', sub: '', dot: 'dotYellow', note: 'Memuat…' };
}

function getKehadiranStat(absensi: UseApiResult<RekapAbsensi>): StatView {
  if (absensi.data) {
    const persen = persentaseHadir(absensi.data);
    if (persen === null) {
      return { value: '-', sub: 'Belum ada data kehadiran', dot: 'dotYellow', note: 'Belum ada data' };
    }

    const sub = `${absensi.data.hadir} dari ${totalRekap(absensi.data)} hari tercatat`;
    if (persen >= 90) return { value: `${persen}%`, sub, dot: 'dotGreen', note: 'Sangat baik' };
    if (persen >= 75) return { value: `${persen}%`, sub, dot: 'dotYellow', note: 'Cukup baik' };
    return { value: `${persen}%`, sub, dot: 'dotRed', note: 'Perlu ditingkatkan' };
  }
  if (absensi.error) {
    return { value: '-', sub: 'Data kehadiran belum dapat dimuat', dot: 'dotRed', note: 'Gagal memuat' };
  }
  return { value: '…', sub: '', dot: 'dotYellow', note: 'Memuat…' };
}

function getTagihanStat(
  ringkasan: UseApiResult<RingkasanTagihan>,
  belumDibayar: readonly Tagihan[],
): StatView {
  if (ringkasan.data) {
    const value = formatRupiah(ringkasan.data.total);
    if (belumDibayar.length === 0) {
      return { value, sub: 'Tidak ada tagihan', dot: 'dotGreen', note: 'Semua tagihan lunas' };
    }

    const sub = getNamaTagihan(belumDibayar[0]);
    if (belumDibayar.some((item) => item.status === 'Jatuh Tempo')) {
      return { value, sub, dot: 'dotRed', note: `${belumDibayar.length} tagihan, ada yang jatuh tempo` };
    }
    return { value, sub, dot: 'dotYellow', note: `${belumDibayar.length} tagihan aktif` };
  }
  if (ringkasan.error) {
    return { value: '-', sub: 'Data tagihan belum dapat dimuat', dot: 'dotRed', note: 'Gagal memuat' };
  }
  return { value: '…', sub: '', dot: 'dotYellow', note: 'Memuat…' };
}

function getNilaiStat(nilai: UseApiResult<NilaiPklSiswa>): StatView {
  const belumTersedia: StatView = {
    value: 'Belum Tersedia',
    sub: 'Penilaian di akhir periode',
    dot: 'dotYellow',
    note: 'Menunggu Penilaian',
  };

  if (nilai.data) {
    if (nilai.data.nilaiAkhir === null) return belumTersedia;
    return {
      value: formatNilai(nilai.data.nilaiAkhir),
      sub: 'Nilai gabungan sekolah dan industri',
      dot: 'dotGreen',
      note: 'Sudah dinilai',
    };
  }
  if (nilai.error?.code === 'PKL_NOT_FOUND') return belumTersedia;
  if (nilai.error) {
    return { value: '-', sub: 'Nilai PKL belum dapat dimuat', dot: 'dotRed', note: 'Gagal memuat' };
  }
  return { value: '…', sub: '', dot: 'dotYellow', note: 'Memuat…' };
}

interface Agenda {
  id: string;
  tanggal: string;
  judul: string;
  deskripsi: string;
  path: string;
}

/** Agenda disusun dari data nyata: batas pembayaran tagihan dan akhir periode PKL */
function buildAgenda(belumDibayar: readonly Tagihan[], pkl: PklSiswa | undefined): Agenda[] {
  const items: Agenda[] = belumDibayar.map((item) => ({
    id: `tagihan-${item.id}`,
    tanggal: item.jatuhTempo,
    judul: item.status === 'Jatuh Tempo' ? 'Tagihan sudah jatuh tempo' : 'Batas pembayaran',
    deskripsi: getNamaTagihan(item),
    path: '/siswa/keuangan',
  }));

  if (pkl && pkl.status !== 'Selesai') {
    const perluLaporan = pkl.laporan === null || pkl.laporan.status === 'revisi';
    items.push({
      id: 'pkl-selesai',
      tanggal: pkl.periode.selesai,
      judul: 'Akhir periode PKL',
      deskripsi: perluLaporan ? 'Unggah laporan akhir dalam format PDF' : 'Periode PKL berakhir',
      path: '/siswa/pkl',
    });
  }

  return items.sort((a, b) => a.tanggal.localeCompare(b.tanggal)).slice(0, MAX_AGENDA);
}

function StateNote({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <p className={styles.stateNote} role="status">
      {children}
      {onRetry && (
        <>
          {' '}
          <button type="button" className={styles.inlineRetry} onClick={onRetry}>Coba lagi</button>
        </>
      )}
    </p>
  );
}

/* ========================================================================== */
/* Halaman                                                                    */
/* ========================================================================== */

export default function DashboardSiswa() {
  const { user } = useAuth();

  const [bulan] = useState(() => toMonthValue(new Date()));

  const pkl = useApi('dashboard:siswa:pkl', (signal) => getPklSiswa({ signal }));
  const nilai = useApi('dashboard:siswa:pkl-nilai', (signal) => getNilaiPklSiswa({ signal }));
  const absensi = useApi(`dashboard:siswa:absensi:${bulan}`, (signal) =>
    getRekapAbsensiSiswa({ bulan }, { signal }),
  );
  const tagihan = useApi('dashboard:siswa:tagihan', (signal) =>
    getTagihanSiswa({ page: 1, limit: TAGIHAN_PAGE_SIZE }, { signal }),
  );
  const ringkasan = useApi('dashboard:siswa:ringkasan', (signal) => getRingkasanTagihan({ signal }));

  /* ---------- PKL ---------- */
  const pklData = pkl.error?.code === 'PKL_NOT_FOUND' ? undefined : pkl.data;
  const pklNotFound = pkl.error?.code === 'PKL_NOT_FOUND';
  const progressPercent = pklData && pklData.progres.totalBulan > 0
    ? Math.min(100, Math.round((pklData.progres.bulanKe / pklData.progres.totalBulan) * 100))
    : 0;

  /* ---------- Absensi ---------- */
  const rekap = absensi.data;
  const persentase = rekap ? persentaseHadir(rekap) : null;
  const chartData = rekap && persentase !== null
    ? [
        { name: 'Hadir', value: rekap.hadir, color: WARNA_HADIR },
        { name: 'Izin', value: rekap.izin, color: WARNA_IZIN },
        { name: 'Sakit', value: rekap.sakit, color: WARNA_SAKIT },
        { name: 'Alpa', value: rekap.alpa, color: WARNA_ALPA },
      ]
    : [{ name: 'Belum ada data', value: 1, color: WARNA_KOSONG }];
  const formatHari = (value: number | undefined): string => (rekap && value !== undefined ? `${value} Hari` : '-');

  /* ---------- Tagihan ---------- */
  const semuaTagihan = tagihan.data?.data ?? [];
  // Filter status Belum Lunas tidak mencakup Jatuh Tempo, jadi keduanya disaring di sini
  const belumDibayar = urutkanJatuhTempo(semuaTagihan.filter(isBelumDibayar), 'asc');
  const tagihanTerbaru = urutkanJatuhTempo(semuaTagihan, 'desc').slice(0, MAX_TAGIHAN_TERBARU);

  /* ---------- Tampilan ---------- */
  const statPkl = getPklStat(pkl);
  const statKehadiran = getKehadiranStat(absensi);
  const statTagihan = getTagihanStat(ringkasan, belumDibayar);
  const statNilai = getNilaiStat(nilai);
  const agenda = buildAgenda(belumDibayar, pklData);

  const namaDepan = user?.nama?.trim().split(/\s+/)[0];

  return (
    <div className={`${styles.layout} appLayout`}>
      <Sidebar />
      
      <main className={styles.mainContent}>
        {/* --- Top Navbar / Breadcrumb --- */}
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <span>Dashboard Siswa</span> <FiChevronRight /> <strong>Beranda</strong>
          </div>
          <div className={styles.headerActions}>
            <NotificationBell />
            <ProfileMenu />
          </div>
        </header>

        <div className={styles.contentWrapper}>
          {/* --- Judul Halaman --- */}
          <div className={styles.topSection}>
            <div className={styles.pageTitle}>
              <p className={styles.subtitle}>PORTAL AKADEMIK / SISWA</p>
              <h1>Beranda</h1>
              <p className={styles.description}>Semua informasi sekolahmu, dalam satu tempat.</p>
            </div>
          </div>

          {/* --- Greeting --- */}
          <div className={styles.greetingBox}>
            <h2>Selamat pagi{namaDepan ? `, ${namaDepan}` : ''}!</h2>
            <p>Setiap langkah hari ini membawa kamu lebih dekat ke masa depan.<br/>Yuk, pantau perjalanan belajarmu!</p>
            <div className={styles.badge}>
              <FiCheckCircle /> {pklData ? `PKL ${pklData.status} • ${pklData.industri.nama}` : 'Siswa'}
            </div>
          </div>

          {/* --- 4 Stats Cards --- */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Status PKL</p>
              <h3>{statPkl.value}</h3>
              <p className={styles.statSub}>{statPkl.sub}</p>
              <div className={styles.statusIndicator}><span className={styles[statPkl.dot]}></span> {statPkl.note}</div>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Kehadiran bulan ini</p>
              <h3>{statKehadiran.value}</h3>
              <p className={styles.statSub}>{statKehadiran.sub}</p>
              <div className={styles.statusIndicator}><span className={styles[statKehadiran.dot]}></span> {statKehadiran.note}</div>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Tagihan belum dibayar</p>
              <h3>{statTagihan.value}</h3>
              <p className={styles.statSub}>{statTagihan.sub}</p>
              <div className={styles.statusIndicator}><span className={styles[statTagihan.dot]}></span> {statTagihan.note}</div>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Nilai akhir PKL</p>
              <h3>{statNilai.value}</h3>
              <p className={styles.statSub}>{statNilai.sub}</p>
              <div className={styles.statusIndicator}><span className={styles[statNilai.dot]}></span> {statNilai.note}</div>
            </div>
          </div>

          {/* --- Main Content Grid (2 Columns) --- */}
          <div className={styles.mainGrid}>
            
            {/* Card 1: PKL */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>Praktik Kerja Lapangan</h3>
                <Link to="/siswa/pkl">Lihat detail <FiChevronRight /></Link>
              </div>
              {pklData ? (
                <>
                  <div className={styles.companyHeader}>
                    <div className={styles.companyIcon}><FiBriefcase /></div>
                    <div>
                      <h4>{pklData.industri.nama}</h4>
                      <p>{PKL_VIEW[pklData.status].note}</p>
                    </div>
                  </div>
                  <div className={styles.pklDetailsGrid}>
                    <div>
                      <p className={styles.detailLabel}><FiMapPin /> Lokasi industri</p>
                      <p className={styles.detailValue}>{pklData.industri.alamat}</p>
                    </div>
                    <div>
                      <p className={styles.detailLabel}><FiCalendar /> Periode PKL</p>
                      <p className={styles.detailValue}>
                        {formatTanggal(pklData.periode.mulai)} - {formatTanggal(pklData.periode.selesai)}
                      </p>
                    </div>
                    <div>
                      <p className={styles.detailLabel}><FiUser /> Pembimbing industri</p>
                      <p className={styles.detailValue}>{pklData.pembimbingIndustri.nama}</p>
                    </div>
                    <div>
                      <p className={styles.detailLabel}><FiUser /> Guru Pembimbing</p>
                      <p className={styles.detailValue}>{pklData.guruPembimbing.nama}</p>
                    </div>
                  </div>
                  <div className={styles.progressContainer}>
                    <div className={styles.progressText}>
                      <span>Progres periode PKL</span>
                      <span>
                        {pklData.status === 'Belum Dimulai'
                          ? 'Belum dimulai'
                          : `Bulan ${pklData.progres.bulanKe} dari ${pklData.progres.totalBulan}`}
                      </span>
                    </div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${progressPercent}%` }}></div>
                    </div>
                  </div>
                </>
              ) : pkl.loading ? (
                <StateNote>Memuat informasi PKL…</StateNote>
              ) : pklNotFound ? (
                <StateNote>Anda belum tercatat pada penempatan PKL. Hubungi guru pembimbing atau pihak sekolah.</StateNote>
              ) : (
                <StateNote onRetry={() => pkl.refetch()}>Informasi PKL belum dapat dimuat.</StateNote>
              )}
            </div>

            {/* Card 2: Kehadiran */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>Rekap Kehadiran</h3>
                <Link to="/siswa/absensi">Lihat detail <FiChevronRight /></Link>
              </div>
              <p className={styles.monthLabel}>{formatBulan(bulan)}</p>
              <div className={styles.chartContainer}>
                <div className={styles.chartWrapper}>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={chartData} innerRadius={50} outerRadius={65} dataKey="value" stroke="none">
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className={styles.chartCenterText}>
                    {absensi.loading ? '…' : persentase === null ? '-' : `${persentase}%`}
                  </div>
                </div>
                <div className={styles.chartLegend}>
                  <p><span className={styles.dotGreen}></span> Hadir <span>{formatHari(rekap?.hadir)}</span></p>
                  <p><span className={styles.dotYellow}></span> Izin <span>{formatHari(rekap?.izin)}</span></p>
                  <p><span className={styles.dotBlue}></span> Sakit <span>{formatHari(rekap?.sakit)}</span></p>
                  <p><span className={styles.dotRed}></span> Alpa <span>{formatHari(rekap?.alpa)}</span></p>
                </div>
              </div>
              {absensi.error ? (
                <StateNote onRetry={() => absensi.refetch()}>Data kehadiran belum dapat dimuat.</StateNote>
              ) : persentase === null ? (
                <StateNote>{absensi.loading ? 'Memuat data kehadiran…' : 'Belum ada data kehadiran bulan ini.'}</StateNote>
              ) : persentase >= 90 ? (
                <div className={styles.praiseBox}>
                  <FiCheckCircle /> Kehadiranmu sudah bagus. Pertahankan!
                </div>
              ) : (
                <StateNote>Usahakan hadir setiap hari sekolah untuk meningkatkan kehadiranmu.</StateNote>
              )}
            </div>

            {/* Card 3: Tagihan */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>Tagihan Terbaru</h3>
                <Link to="/siswa/keuangan">Lihat detail <FiChevronRight /></Link>
              </div>
              {tagihanTerbaru.length > 0 ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Tagihan</th>
                      <th>Jumlah</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tagihanTerbaru.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{getNamaTagihan(item)}</strong><br/>
                          <span className={styles.tableSub}>Jatuh tempo {formatTanggal(item.jatuhTempo)}</span>
                        </td>
                        <td><strong>{formatRupiah(item.nominal)}</strong></td>
                        <td>{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : tagihan.loading ? (
                <StateNote>Memuat tagihan…</StateNote>
              ) : tagihan.error ? (
                <StateNote onRetry={() => tagihan.refetch()}>Daftar tagihan belum dapat dimuat.</StateNote>
              ) : (
                <StateNote>Belum ada tagihan.</StateNote>
              )}
            </div>

            {/* Card 4: Agenda */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>Agenda & Pengingat</h3>
                <span className={styles.badgeCount}>{agenda.length} agenda</span>
              </div>
              {agenda.length > 0 ? (
                <div className={styles.agendaList}>
                  {agenda.map((item) => {
                    const { tgl, bulan: bulanSingkat } = formatTanggalSingkat(item.tanggal);
                    return (
                      <Link className={styles.agendaItem} key={item.id} to={item.path}>
                        <div className={styles.dateBox}>
                          <strong>{tgl}</strong>
                          <span>{bulanSingkat}</span>
                        </div>
                        <div className={styles.agendaText}>
                          <h4>{item.judul}</h4>
                          <p>{item.deskripsi}</p>
                        </div>
                        <FiChevronRight className={styles.agendaArrow} />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <StateNote>
                  {tagihan.loading || pkl.loading ? 'Memuat agenda…' : 'Belum ada agenda atau pengingat.'}
                </StateNote>
              )}
            </div>

          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
}
