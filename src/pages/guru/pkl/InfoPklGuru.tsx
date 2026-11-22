import { useState, type FormEvent } from 'react';
import { 
  FiBell, FiChevronRight, FiSearch, FiX, FiFileText, FiCheckCircle
} from 'react-icons/fi';
import Sidebar from '../../../components/layout/Sidebar';
import Footer from '../../../components/layout/Footer';
import styles from './InfoPklGuru.module.css';

// Import Dummy Data
import { guruProfile, daftarSiswaBimbinganLengkap } from '../../../data/dummyGuru';

export default function InfoPklGuru() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSiswa, setSelectedSiswa] = useState<typeof daftarSiswaBimbinganLengkap[number] | null>(null);
  const [students, setStudents] = useState(daftarSiswaBimbinganLengkap);
  const [score, setScore] = useState('');

  // Filter data berdasarkan input pencarian
  const filteredSiswa = students.filter(siswa => 
    siswa.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleReview = (siswa: typeof daftarSiswaBimbinganLengkap[number]) => {
    setSelectedSiswa(siswa);
    setScore(siswa.nilai === '-' ? '' : siswa.nilai);
  };

  const handleSaveReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSiswa) return;

    setStudents((current) => current.map((siswa) => siswa.id === selectedSiswa.id
      ? { ...siswa, nilai: score, statusLaporan: 'Terverifikasi' }
      : siswa));
    setSelectedSiswa(null);
  };

  return (
    <div className={styles.layout}>
      <Sidebar />
      
      <main className={styles.mainContent}>
        {/* --- Header / Breadcrumb --- */}
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <span>Dashboard Guru</span> <FiChevronRight /> <strong>Praktik Kerja Lapangan</strong>
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
            <h1>Praktik Kerja Lapangan</h1>
            <p className={styles.description}>Dampingi, tinjau laporan, dan nilai perjalanan PKL siswa.</p>
          </div>

          {/* --- Tabel Daftar Siswa Bimbingan --- */}
          <div className={styles.cardFull}>
            <h3>Daftar siswa bimbingan</h3>
            
            <div className={styles.searchContainer}>
              <FiSearch className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Cari nama siswa..." 
                className={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Siswa</th>
                    <th>Tempat PKL</th>
                    <th>Status Laporan</th>
                    <th>Nilai</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSiswa.map((siswa) => (
                    <tr key={siswa.id}>
                      <td>
                        <strong>{siswa.nama}</strong><br/>
                        <span className={styles.tableSub}>{siswa.kelas} - {siswa.statusPkl}</span>
                      </td>
                      <td>{siswa.tempat}</td>
                      <td>
                        <span className={
                          siswa.statusLaporan === 'Terverifikasi' ? styles.statusTerverifikasi :
                          siswa.statusLaporan === 'Menunggu verifikasi' ? styles.statusMenunggu :
                          styles.statusBelum
                        }>
                          {siswa.statusLaporan}
                        </span>
                      </td>
                      <td>{siswa.nilai}</td>
                      <td>
                        <button 
                          className={styles.tinjauBtn}
                          onClick={() => handleReview(siswa)}
                          disabled={siswa.statusLaporan === 'Belum diunggah'}
                        >
                          Tinjau
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
        <Footer />
      </main>

      {/* ================= MODAL VERIFIKASI & PENILAIAN ================= */}
      {selectedSiswa && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h2>Verifikasi & penilaian PKL</h2>
              <button className={styles.closeBtn} onClick={() => setSelectedSiswa(null)}>
                <FiX />
              </button>
            </div>
            <form className={styles.modalBody} onSubmit={handleSaveReview}>
              
              <div className={styles.studentNameDisplay}>
                {selectedSiswa.nama}
              </div>

              <div className={styles.fileLinkBox}>
                <FiFileText className={styles.fileIcon} />
                <span>{selectedSiswa.file}</span>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="nilai-pkl">Nilai akhir PKL (0 - 100)</label>
                <input
                  id="nilai-pkl"
                  type="number" 
                  value={score}
                  onChange={(event) => setScore(event.target.value)}
                  min="0" max="100"
                  required
                />
              </div>
              <div className={styles.modalFooter}>
                <button type="submit" className={styles.submitBtn}>
                  <FiCheckCircle /> Verifikasi & simpan nilai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}