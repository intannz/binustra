import { useState, type FormEvent } from 'react';
import { FiBell, FiChevronRight, FiUpload, FiX, FiUploadCloud, FiFileText } from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Sidebar from '../../../components/layout/Sidebar';
import Footer from '../../../components/layout/Footer';
import styles from './RekapAbsensiSiswa.module.css';

// Import Dummy Data
import { absensiData } from '../../../data/dummyDashboard'; // Menggunakan data bulan & rekap dari dashboard
import { riwayatKehadiran } from '../../../data/dummyAbsensi';

export default function RekapAbsensiSiswa() {
  const [isIzinModalOpen, setIsIzinModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitIzin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setIsIzinModalOpen(false);
  };

  // Data untuk Diagram Donat Recharts
  const chartData = [
    { name: 'Hadir', value: absensiData.hadir, color: '#10b981' },
    { name: 'Sisa', value: 0, color: '#e5e7eb' }
  ];

  return (
    <div className={styles.layout}>
      <Sidebar />
      
      <main className={styles.mainContent}>
        {/* --- Header / Breadcrumb --- */}
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <span>Dashboard Siswa</span> <FiChevronRight /> <strong>Absensi</strong>
          </div>
          <div className={styles.headerActions}>
            <FiBell className={styles.bellIcon} />
            <div className={styles.avatar}>AP</div>
          </div>
        </header>

        <div className={styles.contentWrapper}>
          {/* --- Judul Halaman --- */}
          <div className={styles.pageTitleBox}>
            <p className={styles.subtitle}>PORTAL AKADEMIK / SISWA</p>
            <h1>Absensi & Kehadiran</h1>
            <p className={styles.description}>Kehadiran yang baik, langkah awal untuk berprestasi</p>
          </div>

          {/* --- Top Grid (Statistik & Pengajuan) --- */}
          <div className={styles.gridTop}>
            
            {/* Card Statistik Kehadiran */}
            <div className={styles.card}>
              <div className={styles.cardHeaderFlex}>
                <h3>Statistik kehadiran</h3>
                <span className={styles.badgeMonth}>{absensiData.bulan}</span>
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
                  <div className={styles.chartCenterText}>{absensiData.persentase}%</div>
                </div>
                <div className={styles.legendWrapper}>
                  <p><span className={styles.dotGreen}></span> Hadir <strong className={styles.legendVal}>{absensiData.hadir} Hari</strong></p>
                  <p><span className={styles.dotYellow}></span> Izin <strong className={styles.legendVal}>{absensiData.izin} Hari</strong></p>
                  <p><span className={styles.dotBlue}></span> Sakit <strong className={styles.legendVal}>{absensiData.sakit} Hari</strong></p>
                  <p><span className={styles.dotRed}></span> Alpa <strong className={styles.legendVal}>{absensiData.alpa} Hari</strong></p>
                </div>
              </div>
            </div>

            {/* Card Pengajuan Izin */}
            <div className={styles.card}>
              <h3>Pengajuan Izin</h3>
              <div className={styles.izinContent}>
                <h4>{submitted ? 'Pengajuan izin terkirim' : 'Belum ada pengajuan izin'}</h4>
                <p>Lampirkan surat izin untuk ketidakhadiranmu. Pengajuan akan ditinjau oleh wali kelas.</p>
                <button className={styles.primaryBtn} onClick={() => setIsIzinModalOpen(true)}>
                  <FiUpload /> Ajukan izin
                </button>
              </div>
            </div>

          </div>

          {/* --- Tabel Riwayat Kehadiran --- */}
          <div className={styles.cardFull}>
            <h3>Riwayat Kehadiran</h3>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jam Masuk</th>
                    <th>Status Kehadiran</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {riwayatKehadiran.map((item) => (
                    <tr key={item.id}>
                      <td>{item.tanggal}</td>
                      <td>{item.jamMasuk}</td>
                      <td><span className={styles.statusHadir}>{item.status}</span></td>
                      <td>{item.keterangan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
        <Footer />
      </main>

      {/* ================= MODAL PENGAJUAN IZIN ================= */}
      {isIzinModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h2>Ajukan izin kehadiran</h2>
              <button className={styles.closeBtn} onClick={() => setIsIzinModalOpen(false)}>
                <FiX />
              </button>
            </div>
            <form className={styles.modalBody} onSubmit={handleSubmitIzin}>
              <div className={styles.inputGroup}>
                <label htmlFor="tanggal-izin">Tanggal izin</label>
                <input id="tanggal-izin" type="date" required />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="alasan-izin">Alasan izin</label>
                <textarea id="alasan-izin" placeholder="Tuliskan alasan izin anda" rows={3} required></textarea>
              </div>
              <div className={styles.dropzone}>
                <FiUploadCloud className={styles.dropzoneIcon} />
                <p>Pilih berkas untuk diunggah</p>
                <span>Gambar PNG atau JPG</span>
                <input type="file" accept="image/png,image/jpeg" required aria-label="Pilih surat izin" />
              </div>
              <div className={styles.modalFooter}>
                <button type="submit" className={styles.submitBtn}>
                  <FiFileText /> Kirim pengajuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}