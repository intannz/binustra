import { useState, type FormEvent } from 'react';
import { 
  FiBell, FiChevronRight, FiCreditCard, FiUpload, 
  FiCopy, FiX, FiUploadCloud, FiFileText 
} from 'react-icons/fi';
import Sidebar from '../../../components/layout/Sidebar';
import Footer from '../../../components/layout/Footer';
import styles from './InfoTagihan.module.css';

// Import Dummy Data
import { riwayatTagihan } from '../../../data/dummyKeuangan';
import { studentProfile } from '../../../data/dummyDashboard';

export default function InfoTagihan() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const tagihanAktif = riwayatTagihan.find(t => t.status === 'Belum dibayar');

  const handleCopyAccount = () => {
    if (!navigator.clipboard) {
      setCopyMessage('Fitur salin tidak tersedia. Silakan salin nomor rekening secara manual.');
      return;
    }

    void navigator.clipboard.writeText('01234568910765')
      .then(() => setCopyMessage('Nomor rekening berhasil disalin.'))
      .catch(() => setCopyMessage('Nomor rekening tidak dapat disalin. Silakan salin secara manual.'));
  };

  const handleSubmitPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPaymentSubmitted(true);
    setIsUploadModalOpen(false);
  };

  return (
    <div className={styles.layout}>
      <Sidebar />
      
      <main className={styles.mainContent}>
        {/* --- Header / Breadcrumb --- */}
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <span>Dashboard Siswa</span> <FiChevronRight /> <strong>Keuangan</strong>
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
            <h1>Keuangan sekolah</h1>
            <p className={styles.description}>Pantau tagihan dan pembayaran dengan lebih mudah.</p>
          </div>

          {/* --- Top Grid (Tagihan & Info Pembayaran) --- */}
          <div className={styles.gridTop}>
            
            {/* Card Tagihan Aktif */}
            <div className={styles.card}>
              <div className={styles.cardHeaderFlex}>
                <div className={styles.cardIcon}><FiCreditCard /></div>
                {tagihanAktif && <span className={styles.badgeWarning}>{paymentSubmitted ? 'Menunggu verifikasi' : 'Belum dibayar'}</span>}
              </div>
              <div className={styles.tagihanInfo}>
                <p className={styles.tagihanLabel}>Total tagihan yang belum dibayar</p>
                <h2>{tagihanAktif ? tagihanAktif.nominal : 'Rp 0'}</h2>
                <p className={styles.tagihanBulan}>{tagihanAktif ? tagihanAktif.jenis : 'Tidak ada tagihan'}</p>
              </div>
              <button 
                className={styles.primaryBtn} 
                onClick={() => setIsUploadModalOpen(true)}
                disabled={!tagihanAktif || paymentSubmitted}
              >
                <FiUpload /> Unggah bukti pembayaran
              </button>
              <p className={styles.btnNote}>Pembayaran manual melalui transfer atau loket sekolah</p>
            </div>

            {/* Card Informasi Pembayaran */}
            <div className={styles.card}>
              <h3>Informasi pembayaran</h3>
              <p className={styles.infoDesc}>
                Pembayaran melalui transfer ke rekening sekolah. Gunakan nama siswa dan kelas pada keterangan transfer.
              </p>
              <div className={styles.bankBox}>
                <div>
                  <p className={styles.bankName}>Bank Mandiri</p>
                  <h4 className={styles.accountNumber}>0123 456 8910 765</h4>
                  <p className={styles.accountName}>a.n. SMK Bintang Nusantara</p>
                </div>
                <button className={styles.copyBtn} title="Salin nomor rekening" aria-label="Salin nomor rekening" onClick={handleCopyAccount}>
                  <FiCopy />
                </button>
              </div>
              {copyMessage && <p role="status">{copyMessage}</p>}
              <div className={styles.instructionList}>
                <p>1. Transfer sesuai nominal tagihan: <strong>{tagihanAktif ? tagihanAktif.nominal : '-'}</strong>.</p>
                <p>2. Tulis keterangan: <strong>{studentProfile.nama} - {studentProfile.kelas}</strong>.</p>
                <p>3. Unggah bukti pembayaran untuk diverifikasi.</p>
              </div>
            </div>

          </div>

          {/* --- Tabel Riwayat Tagihan --- */}
          <div className={styles.cardFull}>
            <h3>Detail & riwayat tagihan</h3>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Jenis tagihan</th>
                    <th>Nominal</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {riwayatTagihan.map((item) => (
                    <tr key={item.id}>
                      <td>{item.jenis}</td>
                      <td>{item.nominal}</td>
                      <td>
                        <span className={item.status === 'Lunas' ? styles.statusLunas : styles.statusBelum}>
                          {item.status === 'Belum dibayar' && paymentSubmitted ? 'Menunggu verifikasi' : item.status}
                        </span>
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

      {/* ================= MODAL UNGGAH BUKTI ================= */}
      {isUploadModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h2>Unggah bukti pembayaran</h2>
              <button className={styles.closeBtn} onClick={() => setIsUploadModalOpen(false)}>
                <FiX />
              </button>
            </div>
            <form className={styles.modalBody} onSubmit={handleSubmitPayment}>
              <div className={styles.dropzone}>
                <FiUploadCloud className={styles.dropzoneIcon} />
                <p>Pilih berkas untuk diunggah</p>
                <span>Gambar PNG atau JPG</span>
                <input type="file" accept="image/png,image/jpeg" required aria-label="Pilih bukti pembayaran" />
              </div>
              <div className={styles.modalFooter}>
                <button type="submit" className={styles.submitBtn}>
                  <FiFileText /> Kirim bukti
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}