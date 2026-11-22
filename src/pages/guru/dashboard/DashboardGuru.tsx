import { 
  FiBell, FiChevronRight, FiCheckCircle, FiUsers, 
  FiCalendar, FiFileText, FiUpload, FiCheckSquare 
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Sidebar from '../../../components/layout/Sidebar';
import Footer from '../../../components/layout/Footer';
import styles from './DashboardGuru.module.css';

// Import Dummy Data
import { guruProfile, statsGuru, daftarSiswaBimbingan, rekapKehadiranKelas } from '../../../data/dummyGuru';

export default function DashboardGuru() {
  // Data untuk Recharts (Diagram Donat)
  const chartData = [
    { name: 'Hadir', value: rekapKehadiranKelas.hadir, color: '#10b981' }, // Hijau
    { name: 'Sisa', value: 0, color: '#e5e7eb' }
  ];

  return (
    <div className={styles.layout}>
      <Sidebar />
      
      <main className={styles.mainContent}>
        {/* --- Header / Breadcrumb --- */}
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <span>Dashboard Guru</span> <FiChevronRight /> <strong>Beranda</strong>
          </div>
          <div className={styles.headerActions}>
            <FiBell className={styles.bellIcon} />
            <div className={styles.avatar}>{guruProfile.inisial}</div>
          </div>
        </header>

        <div className={styles.contentWrapper}>
          {/* --- Page Title --- */}
          <div className={styles.pageTitleBox}>
            <p className={styles.subtitle}>PORTAL AKADEMIK / Guru</p>
            <h1>Beranda</h1>
            <p className={styles.description}>Semua informasi sekolahmu, dalam satu tempat.</p>
          </div>

          {/* --- Greeting --- */}
          <div className={styles.greetingBox}>
            <h2>Selamat pagi, {guruProfile.nama}!</h2>
            <p>Dampingi perjalanan siswa dan bantu mereka meraih potensi terbaik.<br/>Semua perkembangan kelas tersedia di sini.</p>
            <div className={styles.badge}>
              <FiCheckCircle /> {guruProfile.role} • {guruProfile.jurusan}
            </div>
          </div>

          {/* --- 3 Stats Cards (Khusus Guru) --- */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.iconBox}><FiUsers /></div>
              </div>
              <p className={styles.statLabel}>Siswa bimbingan</p>
              <h3>{statsGuru.siswaBimbingan} siswa</h3>
              <p className={styles.statSub}>Tersebar di {statsGuru.industri} industri</p>
              <div className={styles.statusIndicator}><span className={styles.dotBlue}></span> Sedang Berjalan</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.iconBox}><FiCalendar /></div>
              </div>
              <p className={styles.statLabel}>Kehadiran bulan ini</p>
              <h3>{statsGuru.kehadiranKelas} %</h3>
              <p className={styles.statSub}>Rata-rata kehadiran kelas</p>
              <div className={styles.statusIndicator}><span className={styles.dotGreen}></span> Sangat Baik</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={styles.iconBox}><FiFileText /></div>
              </div>
              <p className={styles.statLabel}>Laporan perlu verifikasi</p>
              <h3>{statsGuru.laporanMenunggu} laporan</h3>
              <p className={styles.statSub}>Menunggu persetujuan Anda</p>
              <div className={styles.statusIndicator}><span className={styles.dotYellow}></span> Tinjau laporan</div>
            </div>
          </div>

          {/* --- Main Grid (2 Columns) --- */}
          <div className={styles.mainGrid}>
            
            {/* Kolom Kiri */}
            <div className={styles.leftColumn}>
              {/* Card Siswa Bimbingan */}
              <div className={styles.card}>
                <div className={styles.cardHeaderFlex}>
                  <h3>Siswa Bimbingan</h3>
                  <Link to="/guru/pkl">Lihat detail <FiChevronRight /></Link>
                </div>
                <div className={styles.studentList}>
                  {daftarSiswaBimbingan.map((siswa) => (
                    <div className={styles.studentItem} key={siswa.id}>
                      <div className={styles.studentAvatar}>{siswa.inisial}</div>
                      <div className={styles.studentInfo}>
                        <h4>{siswa.nama}</h4>
                        <p>{siswa.perusahaan}</p>
                      </div>
                      <span className={styles.badgeSuccessLight}>{siswa.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Laporan Verifikasi */}
              <div className={styles.card}>
                <div className={styles.cardHeaderFlex}>
                  <h3>Laporan menunggu verifikasi</h3>
                  <Link to="/guru/pkl">Lihat detail <FiChevronRight /></Link>
                </div>
                <div className={styles.verificationBox}>
                  <div className={styles.verifIcon}><FiFileText /></div>
                  <div className={styles.verifText}>
                    <h4>{statsGuru.laporanMenunggu} Laporan perlu ditinjau</h4>
                    <p>Periksa laporan dan berikan penilaian siswa</p>
                  </div>
                </div>
                <Link to="/guru/pkl" className={styles.primaryButton}>
                  <FiUpload className={styles.btnIcon} /> Tinjau laporan
                </Link>
              </div>
            </div>

            {/* Kolom Kanan */}
            <div className={styles.rightColumn}>
              {/* Card Rekap Kehadiran */}
              <div className={styles.card}>
                <div className={styles.cardHeaderFlex}>
                  <h3>Rekap Kehadiran</h3>
                  <Link to="/guru/absensi">Lihat detail <FiChevronRight /></Link>
                </div>
                <p className={styles.monthLabel}>{rekapKehadiranKelas.bulan}</p>
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
                    <div className={styles.chartCenterText}>{rekapKehadiranKelas.persentase}%</div>
                  </div>
                  <div className={styles.chartLegend}>
                    <p><span className={styles.dotGreen}></span> Hadir <span>{rekapKehadiranKelas.hadir} Hari</span></p>
                    <p><span className={styles.dotYellow}></span> Izin <span>{rekapKehadiranKelas.izin} Hari</span></p>
                    <p><span className={styles.dotBlue}></span> Sakit <span>{rekapKehadiranKelas.sakit} Hari</span></p>
                    <p><span className={styles.dotRed}></span> Alpa <span>{rekapKehadiranKelas.alpa} Hari</span></p>
                  </div>
                </div>
                <div className={styles.praiseBox}>
                  <FiCheckCircle /> Kehadiran kelas sudah bagus Pertahankan!
                </div>
              </div>

              {/* Card Akses Cepat */}
              <div className={styles.card}>
                <h3>Akses cepat</h3>
                <div className={styles.quickAccessList}>
                  <Link to="/guru/pkl" className={styles.quickAccessItem}>
                    <div className={styles.quickIcon}><FiFileText /></div>
                    <div className={styles.quickText}>
                      <h4>Input nilai PKL</h4>
                      <p>Penilaian siswa bimbingan</p>
                    </div>
                    <FiChevronRight className={styles.quickArrow} />
                  </Link>
                  <Link to="/guru/absensi" className={styles.quickAccessItem}>
                    <div className={styles.quickIcon}><FiCheckSquare /></div>
                    <div className={styles.quickText}>
                      <h4>Validasi surat izin</h4>
                      <p>Tinjau pengajuan siswa</p>
                    </div>
                    <FiChevronRight className={styles.quickArrow} />
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
}