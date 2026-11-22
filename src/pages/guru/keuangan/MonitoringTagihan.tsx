import { useState } from 'react';
import { 
  FiBell, FiChevronRight, FiSearch, FiUsers, 
  FiCheckCircle, FiAlertCircle, FiMessageCircle 
} from 'react-icons/fi';
import Sidebar from '../../../components/layout/Sidebar';
import Footer from '../../../components/layout/Footer';
import styles from './MonitoringTagihan.module.css';

// Import Dummy Data
import { guruProfile, ringkasanKeuanganKelas, daftarTagihanKelas } from '../../../data/dummyGuru';

export default function MonitoringTagihan() {
  const [searchTerm, setSearchTerm] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');

  // Filter siswa berdasarkan input pencarian
  const filteredTagihan = daftarTagihanKelas.filter(siswa => 
    siswa.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    siswa.nis.includes(searchTerm)
  );

  const handleIngatkan = (nama: string) => {
    setReminderMessage(`Pengingat untuk orang tua ${nama} telah dicatat.`);
  };

  return (
    <div className={styles.layout}>
      <Sidebar />
      
      <main className={styles.mainContent}>
        {/* --- Header / Breadcrumb --- */}
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <span>Dashboard Guru</span> <FiChevronRight /> <strong>Keuangan</strong>
          </div>
          <div className={styles.headerActions}>
            <FiBell className={styles.bellIcon} />
            <div className={styles.avatar}>{guruProfile.inisial}</div>
          </div>
        </header>

        <div className={styles.contentWrapper}>
          {/* --- Judul Halaman --- */}
          <div className={styles.pageTitleBox}>
            <p className={styles.subtitle}>PORTAL AKADEMIK / Guru</p>
            <h1>Monitoring Tagihan Kelas</h1>
            <p className={styles.description}>Pantau status pembayaran siswa di kelas perwalian Anda untuk memberikan pengingat.</p>
          </div>

          {/* --- Summary Grid (3 Kolom) --- */}
          <div className={styles.summaryGrid}>
            <div className={styles.statCard}>
              <div className={styles.iconBoxBlue}><FiUsers /></div>
              <div>
                <p className={styles.statLabel}>Total Siswa Kelas</p>
                <h3>{ringkasanKeuanganKelas.totalSiswa} Siswa</h3>
                <p className={styles.statSub}>{guruProfile.role}</p>
              </div>
            </div>
            
            <div className={styles.statCard}>
              <div className={styles.iconBoxGreen}><FiCheckCircle /></div>
              <div>
                <p className={styles.statLabel}>Sudah Lunas</p>
                <h3>{ringkasanKeuanganKelas.lunas} Siswa</h3>
                <p className={styles.statSub}>Tagihan {ringkasanKeuanganKelas.tagihanAktif}</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.iconBoxYellow}><FiAlertCircle /></div>
              <div>
                <p className={styles.statLabel}>Belum Dibayar</p>
                <h3>{ringkasanKeuanganKelas.belumLunas} Siswa</h3>
                <p className={styles.statSub}>Perlu diingatkan</p>
              </div>
            </div>
          </div>

          {/* --- Tabel Daftar Tagihan --- */}
          <div className={styles.cardFull}>
            <div className={styles.cardHeaderFlex}>
              <h3>Status Pembayaran Siswa</h3>
              <div className={styles.searchContainer}>
                <FiSearch className={styles.searchIcon} />
                <input 
                  type="text" 
                  placeholder="Cari nama atau NIS..." 
                  className={styles.searchInput}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            {reminderMessage && <p role="status">{reminderMessage}</p>}

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Siswa</th>
                    <th>NIS</th>
                    <th>Tagihan Aktif</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTagihan.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.nama}</strong></td>
                      <td>{item.nis}</td>
                      <td>{item.tagihan}</td>
                      <td>
                        <span className={item.status === 'Lunas' ? styles.statusLunas : styles.statusBelum}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          className={styles.btnReminder}
                          onClick={() => handleIngatkan(item.nama)}
                          disabled={item.status === 'Lunas'}
                          title={item.status === 'Lunas' ? 'Sudah lunas' : 'Kirim pengingat'}
                        >
                          <FiMessageCircle /> Ingatkan
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredTagihan.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>
                        Tidak ada siswa yang cocok dengan pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
        <Footer />
      </main>
    </div>
  );
}