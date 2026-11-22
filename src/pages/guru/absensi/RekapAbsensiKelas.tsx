import { useState } from 'react';
import { FiBell, FiChevronRight, FiCheck, FiImage } from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Sidebar from '../../../components/layout/Sidebar';
import Footer from '../../../components/layout/Footer';
import styles from './RekapAbsensiKelas.module.css';

// Import Dummy Data
import { guruProfile, rekapKehadiranKelas, daftarAbsensiKelas, dataPengajuanIzin } from '../../../data/dummyGuru';

export default function RekapAbsensiKelas() {
  // State untuk status Izin (menunggu, disetujui, ditolak)
  const [statusIzin, setStatusIzin] = useState<'menunggu' | 'disetujui' | 'ditolak'>('menunggu');
  
  // State untuk feedback simpan absen
  const [isSaved, setIsSaved] = useState(false);
  const [attendance, setAttendance] = useState(daftarAbsensiKelas);

  // Data untuk Recharts (Diagram Donat)
  const chartData = [
    { name: 'Hadir', value: rekapKehadiranKelas.hadir, color: '#10b981' },
    { name: 'Sisa', value: 0, color: '#e5e7eb' }
  ];

  const handleSimpanAbsen = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000); // Pesan hilang setelah 3 detik
  };

  const handleAttendanceChange = (id: number, kehadiran: string) => {
    setAttendance((current) => current.map((item) => item.id === id
      ? { ...item, kehadiran, keterangan: kehadiran }
      : item));
  };

  return (
    <div className={styles.layout}>
      <Sidebar />
      
      <main className={styles.mainContent}>
        {/* --- Header / Breadcrumb --- */}
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <span>Dashboard Guru</span> <FiChevronRight /> <strong>Absensi</strong>
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
            <h1>Absensi & Kehadiran</h1>
            <p className={styles.description}>Kehadiran yang baik, langkah awal untuk berprestasi</p>
          </div>

          {/* --- Top Grid (Statistik & Validasi) --- */}
          <div className={styles.gridTop}>
            
            {/* Card Statistik Kehadiran */}
            <div className={styles.card}>
              <div className={styles.cardHeaderFlex}>
                <h3>Statistik kehadiran</h3>
                <span className={styles.badgeMonth}>{rekapKehadiranKelas.bulan}</span>
              </div>
              <div className={styles.statsLayout}>
                <div className={styles.chartWrapper}>
                  <ResponsiveContainer width={120} height={120}>
                    <PieChart>
                      <Pie data={chartData} innerRadius={45} outerRadius={60} dataKey="value" stroke="none">
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className={styles.chartCenterText}>{rekapKehadiranKelas.persentase}%</div>
                </div>
                <div className={styles.legendWrapper}>
                  <p><span className={styles.dotGreen}></span> Hadir <strong className={styles.legendVal}>{rekapKehadiranKelas.hadir} Hari</strong></p>
                  <p><span className={styles.dotYellow}></span> Izin <strong className={styles.legendVal}>{rekapKehadiranKelas.izin} Hari</strong></p>
                  <p><span className={styles.dotBlue}></span> Sakit <strong className={styles.legendVal}>{rekapKehadiranKelas.sakit} Hari</strong></p>
                  <p><span className={styles.dotRed}></span> Alpa <strong className={styles.legendVal}>{rekapKehadiranKelas.alpa} Hari</strong></p>
                </div>
              </div>
            </div>

            {/* Card Validasi Surat Izin */}
            <div className={styles.card}>
              <div className={styles.cardHeaderFlex}>
                <h3>Validasi surat izin</h3>
                {statusIzin === 'menunggu' && <span className={styles.badgeWarning}>Menunggu persetujuan</span>}
                {statusIzin === 'disetujui' && <span className={styles.badgeSuccess}>Disetujui</span>}
                {statusIzin === 'ditolak' && <span className={styles.badgeDanger}>Ditolak</span>}
              </div>
              
              <div className={styles.izinContent}>
                <h4>{dataPengajuanIzin.nama}</h4>
                <p className={styles.izinDetail}>{dataPengajuanIzin.tanggal} • {dataPengajuanIzin.alasan}</p>
                
                <div className={styles.fileBox}>
                  <FiImage className={styles.fileIcon} />
                  <span>{dataPengajuanIzin.file}</span>
                </div>

                {statusIzin === 'menunggu' ? (
                  <div className={styles.actionButtons}>
                    <button className={styles.btnApprove} onClick={() => setStatusIzin('disetujui')}>
                      <FiCheck /> Setujui izin
                    </button>
                    <button className={styles.btnReject} onClick={() => setStatusIzin('ditolak')}>
                      Tolak
                    </button>
                  </div>
                ) : (
                  <p className={styles.feedbackText}>
                    Surat izin telah {statusIzin}.
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* --- Tabel Input Kehadiran Kelas --- */}
          <div className={styles.cardFull}>
            <h3>Rekap & input kehadiran kelas</h3>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Siswa</th>
                    <th>Kelas</th>
                    <th>Kehadiran</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((item) => (
                    <tr key={item.id}>
                      <td>{item.nama}</td>
                      <td>{item.kelas}</td>
                      <td>
                        <select
                          className={styles.selectInput}
                          value={item.kehadiran}
                          onChange={(event) => handleAttendanceChange(item.id, event.target.value)}
                        >
                          <option value="Hadir">Hadir</option>
                          <option value="Izin">Izin</option>
                          <option value="Sakit">Sakit</option>
                          <option value="Alpa">Alpa</option>
                        </select>
                      </td>
                      <td>
                        <span className={item.keterangan === 'Hadir' ? styles.statusHadir : styles.statusLain}>
                          {item.keterangan}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className={styles.footerActionBox}>
              <button className={styles.btnSave} onClick={handleSimpanAbsen}>
                <FiCheck /> Simpan kehadiran
              </button>
              {isSaved && <span className={styles.saveSuccessText}>Kehadiran kelas berhasil disimpan.</span>}
            </div>
          </div>

        </div>
        <Footer />
      </main>
    </div>
  );
}