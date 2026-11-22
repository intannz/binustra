import { useState } from 'react';
import { FiBell, FiLogOut, FiMapPin, FiCalendar, FiUser, FiChevronRight, FiCheckCircle, FiBriefcase } from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../../../components/layout/Sidebar';
import Footer from '../../../components/layout/Footer';
import { useAuth } from '../../../hooks/useAuth';
import styles from './DashboardSiswa.module.css';

// Import Dummy Data
import { studentProfile, pklData, absensiData, tagihanData, agendaData } from '../../../data/dummyDashboard';

export default function DashboardSiswa() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Data untuk Recharts (Diagram Donat)
  const chartData = [
    { name: 'Hadir', value: absensiData.hadir, color: '#10b981' }, // Hijau
    { name: 'Sisa', value: 0, color: '#e5e7eb' } // Abu-abu jika tidak 100%
  ];

  return (
    <div className={styles.layout}>
      <Sidebar />
      
      <main className={styles.mainContent}>
        {/* --- Top Navbar / Breadcrumb --- */}
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <span>Dashboard Siswa</span> <FiChevronRight /> <strong>Beranda</strong>
          </div>
          
          <div className={styles.headerActions}>
            <FiBell className={styles.bellIcon} />
            
            {/* Tombol Profil / Avatar yang bisa diklik */}
            <div className={styles.profileDropdownContainer}>
              <button
                type="button"
                className={styles.avatar} 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                aria-label="Buka menu profil"
                aria-expanded={isDropdownOpen}
                aria-haspopup="menu"
              >
                AP
              </button>

              {/* Menu Dropdown Logout yang muncul saat diklik */}
              {isDropdownOpen && (
                <div className={styles.dropdownMenu} role="menu">
                  <button type="button" className={styles.dropdownItem} role="menuitem" onClick={handleLogout}>
                    <FiLogOut /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className={styles.contentWrapper}>
          {/* --- Header Section & Profile Card --- */}
          <div className={styles.topSection}>
            <div className={styles.pageTitle}>
              <p className={styles.subtitle}>PORTAL AKADEMIK / SISWA</p>
              <h1>Beranda</h1>
              <p className={styles.description}>Semua informasi sekolahmu, dalam satu tempat.</p>
            </div>
            
            <div className={styles.profileCard}>
              <div className={styles.profileInfo}>
                <strong>{studentProfile.nama}</strong>
                <span>{studentProfile.kelas} | {studentProfile.nis}</span>
              </div>
              <button className={styles.logoutBtn} onClick={handleLogout}><FiLogOut /> LOGOUT</button>
            </div>
          </div>

          {/* --- Greeting --- */}
          <div className={styles.greetingBox}>
            <h2>Selamat pagi, {studentProfile.nama.split(' ')[0]}!</h2>
            <p>Setiap langkah hari ini membawa kamu lebih dekat ke masa depan.<br/>Yuk, pantau perjalanan belajarmu!</p>
            <div className={styles.badge}>
              <FiCheckCircle /> {studentProfile.kelas} • {studentProfile.jurusan}
            </div>
          </div>

          {/* --- 4 Stats Cards --- */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Status PKL</p>
              <h3>{pklData.status}</h3>
              <p className={styles.statSub}>{pklData.perusahaan}</p>
              <div className={styles.statusIndicator}><span className={styles.dotBlue}></span> Sedang berjalan</div>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Kehadiran bulan ini</p>
              <h3>{absensiData.persentase}%</h3>
              <p className={styles.statSub}>{absensiData.hadir} dari {absensiData.hadir} hari sekolah</p>
              <div className={styles.statusIndicator}><span className={styles.dotGreen}></span> Sangat baik</div>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Tagihan belum dibayar</p>
              <h3>{tagihanData[0].jumlah}</h3>
              <p className={styles.statSub}>{tagihanData[0].nama}</p>
              <div className={styles.statusIndicator}><span className={styles.dotYellow}></span> 1 Tagihan aktif</div>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Nilai akhir PKL</p>
              <h3>Belum Tersedia</h3>
              <p className={styles.statSub}>Penilaian di akhir periode</p>
              <div className={styles.statusIndicator}><span className={styles.dotYellow}></span> Menunggu Penilaian</div>
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
              <div className={styles.companyHeader}>
                <div className={styles.companyIcon}><FiBriefcase /></div>
                <div>
                  <h4>{pklData.perusahaan}</h4>
                  <p>{pklData.namaPanjangPerusahaan}</p>
                </div>
              </div>
              <div className={styles.pklDetailsGrid}>
                <div>
                  <p className={styles.detailLabel}><FiMapPin /> Lokasi industri</p>
                  <p className={styles.detailValue}>{pklData.lokasi}</p>
                </div>
                <div>
                  <p className={styles.detailLabel}><FiCalendar /> Periode PKL</p>
                  <p className={styles.detailValue}>{pklData.periode}</p>
                </div>
                <div>
                  <p className={styles.detailLabel}><FiUser /> Posisi</p>
                  <p className={styles.detailValue}>{pklData.posisi}</p>
                </div>
                <div>
                  <p className={styles.detailLabel}><FiUser /> Guru Pembimbing</p>
                  <p className={styles.detailValue}>{pklData.pembimbing}</p>
                </div>
              </div>
              <div className={styles.progressContainer}>
                <div className={styles.progressText}>
                  <span>Progres periode PKL</span>
                  <span>Minggu {pklData.progressMinggu} dari {pklData.totalMinggu}</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${(pklData.progressMinggu/pklData.totalMinggu)*100}%` }}></div>
                </div>
              </div>
            </div>

            {/* Card 2: Kehadiran */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>Rekap Kehadiran</h3>
                <Link to="/siswa/absensi">Lihat detail <FiChevronRight /></Link>
              </div>
              <p className={styles.monthLabel}>{absensiData.bulan}</p>
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
                  <div className={styles.chartCenterText}>{absensiData.persentase}%</div>
                </div>
                <div className={styles.chartLegend}>
                  <p><span className={styles.dotGreen}></span> Hadir <span>{absensiData.hadir} Hari</span></p>
                  <p><span className={styles.dotYellow}></span> Izin <span>{absensiData.izin} Hari</span></p>
                  <p><span className={styles.dotBlue}></span> Sakit <span>{absensiData.sakit} Hari</span></p>
                  <p><span className={styles.dotRed}></span> Alpa <span>{absensiData.alpa} Hari</span></p>
                </div>
              </div>
              <div className={styles.praiseBox}>
                <FiCheckCircle /> Kehadiranmu sudah bagus Pertahankan!
              </div>
            </div>

            {/* Card 3: Tagihan */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>Tagihan Terbaru</h3>
                <Link to="/siswa/keuangan">Lihat detail <FiChevronRight /></Link>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tagihan</th>
                    <th>Jumlah</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tagihanData.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.nama}</strong><br/>
                        <span className={styles.tableSub}>{item.keterangan}</span>
                      </td>
                      <td><strong>{item.jumlah}</strong></td>
                      <td>{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Card 4: Agenda */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>Agenda & Pengingat</h3>
                <span className={styles.badgeCount}>{agendaData.length} agenda</span>
              </div>
              <div className={styles.agendaList}>
                {agendaData.map((agenda) => (
                  <div className={styles.agendaItem} key={agenda.id}>
                    <div className={styles.dateBox}>
                      <strong>{agenda.tgl}</strong>
                      <span>{agenda.bulan}</span>
                    </div>
                    <div className={styles.agendaText}>
                      <h4>{agenda.judul}</h4>
                      <p>{agenda.deskripsi}</p>
                    </div>
                    <FiChevronRight className={styles.agendaArrow} />
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
}