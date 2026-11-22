import { useState, type FormEvent } from 'react';
import { 
  FiBell, FiChevronRight, FiBriefcase, FiUpload, FiFileText, 
  FiX, FiUploadCloud
} from 'react-icons/fi';
import Sidebar from '../../../components/layout/Sidebar';
import Footer from '../../../components/layout/Footer';
import styles from './InfoPklSiswa.module.css';

export default function InfoPklSiswa() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isMitraModalOpen, setIsMitraModalOpen] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [partnerSubmitted, setPartnerSubmitted] = useState(false);

  const handleReportSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReportSubmitted(true);
    setIsReportModalOpen(false);
  };

  const handlePartnerSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPartnerSubmitted(true);
    setIsMitraModalOpen(false);
  };

  return (
    <div className={styles.layout}>
      <Sidebar />
      
      <main className={styles.mainContent}>
        {/* --- Header / Breadcrumb --- */}
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <span>Dashboard Siswa</span> <FiChevronRight /> <strong>Praktik Kerja Lapangan</strong>
          </div>
          <div className={styles.headerActions}>
            <FiBell className={styles.bellIcon} />
            <div className={styles.avatar}>AP</div>
          </div>
        </header>

        <div className={styles.contentWrapper}>
          {/* --- Page Title --- */}
          <div className={styles.pageTitleBox}>
            <p className={styles.subtitle}>PORTAL AKADEMIK / SISWA</p>
            <h1>Praktik Kerja Lapangan</h1>
            <p className={styles.description}>Pantau PKL, laporan, dan penilaian.</p>
          </div>

          {/* --- Main Grid --- */}
          <div className={styles.gridContainer}>
            
            {/* Kiri: Informasi Penempatan */}
            <div className={styles.card}>
              <div className={styles.cardHeaderFlex}>
                <h3>Informasi penempatan</h3>
                <span className={styles.badgeSuccess}>Sedang berlangsung</span>
              </div>
              
              <div className={styles.companyProfile}>
                <div className={styles.companyIcon}><FiBriefcase /></div>
                <div>
                  <h4>PT. KAI Persero</h4>
                  <p>Kereta Api Indonesia</p>
                </div>
              </div>

              <div className={styles.infoList}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Posisi</span>
                  <span className={styles.infoValue}>Manajemen Jaringan Lokal (LAN)</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Alamat industri</span>
                  <span className={styles.infoValue}>Jl. Puspitek Raya No. 1, Pamulang, Tangerang Selatan</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Periode PKL</span>
                  <span className={styles.infoValue}>13 Juli - 18 Desember 2026</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Jam kerja</span>
                  <span className={styles.infoValue}>Senin - Jumat, 08.00 - 16.00</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Guru pembimbing</span>
                  <span className={styles.infoValue}>Ahmad, S.Kom, M.Kom</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Pembimbing industri</span>
                  <span className={styles.infoValue}>Budi Santoso</span>
                </div>
              </div>

              <div className={styles.progressContainer}>
                <p>Minggu 13 dari 20</p>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: '65%' }}></div>
                </div>
              </div>
            </div>

            {/* Kanan: Card Laporan & Card Mitra */}
            <div className={styles.rightColumn}>
              
              {/* Card Laporan */}
              <div className={styles.card}>
                <div className={styles.cardHeaderFlex}>
                  <h3>Laporan & Nilai PKL</h3>
                  <span className={reportSubmitted ? styles.badgeSuccess : styles.badgeWarning}>
                    {reportSubmitted ? 'Menunggu verifikasi' : 'Belum diunggah'}
                  </span>
                </div>
                <div className={styles.fileItem}>
                  <div className={styles.fileIcon}><FiFileText /></div>
                  <div>
                    <h4>Laporan Akhir PKL</h4>
                    <p>Lengkapi laporan sebagai penilaian PKL</p>
                  </div>
                </div>
                <button className={styles.primaryButton} onClick={() => setIsReportModalOpen(true)}>
                  <FiUpload className={styles.btnIcon} />
                  <div>
                    <strong>Unggah laporan akhir PKL</strong>
                    <span>Dokumen PDF</span>
                  </div>
                </button>
                <div className={styles.divider}></div>
                <p className={styles.scoreText}>Nilai akhir PKL</p>
              </div>

              {/* Card Mitra */}
              <div className={styles.card}>
                <div className={styles.cardHeaderFlex}>
                  <h3>Mitra & Proposal PKL</h3>
                  <span className={partnerSubmitted ? styles.badgeSuccess : styles.badgeWarning}>
                    {partnerSubmitted ? 'Menunggu verifikasi' : 'Belum diajukan'}
                  </span>
                </div>
                <div className={styles.fileItem}>
                  <div className={styles.fileIcon}><FiBriefcase /></div>
                  <div>
                    <h4>Ajukan mitra industri</h4>
                    <p>Isi data mitra dan unggah proposal PKL (PDF)</p>
                  </div>
                </div>
                <button className={styles.primaryButtonSmall} onClick={() => setIsMitraModalOpen(true)}>
                  <FiUpload /> Input mitra
                </button>
              </div>

            </div>
          </div>

          {/* --- Linimasa PKL --- */}
          <div className={styles.card}>
            <h3>Linimasa PKL</h3>
            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineDotActive}></div>
                <div className={styles.timelineLineActive}></div>
                <p className={styles.timelineDate}>13 Juli 2026</p>
                <h4>Mulai praktik kerja lapangan</h4>
                <p className={styles.timelineDesc}>Penempatan di PT KAI Persero</p>
              </div>
              <div className={styles.timelineItem}>
                <div className={styles.timelineDotActive}></div>
                <div className={styles.timelineLine}></div>
                <p className={styles.timelineDate}>14 Oktober 2026</p>
                <h4>PKL sedang berlangsung</h4>
                <p className={styles.timelineDesc}>Minggu ke-13 dari 20</p>
              </div>
              <div className={styles.timelineItem}>
                <div className={styles.timelineDot}></div>
                <p className={styles.timelineDate}>18 Desember 2026</p>
                <h4>Akhir periode PKL</h4>
                <p className={styles.timelineDesc}>Pengumpulan laporan dan penilaian akhir</p>
              </div>
            </div>
          </div>

        </div>
        <Footer />
      </main>

      {/* ================= MODALS ================= */}

      {/* 1. Modal Unggah Laporan */}
      {isReportModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h2>Unggah laporan akhir PKL</h2>
              <button className={styles.closeBtn} onClick={() => setIsReportModalOpen(false)}>
                <FiX />
              </button>
            </div>
            <form className={styles.modalBody} onSubmit={handleReportSubmit}>
              <div className={styles.dropzone}>
                <FiUploadCloud className={styles.dropzoneIcon} />
                <p>Pilih berkas untuk diunggah</p>
                <span>Dokumen PDF</span>
                <input type="file" accept="application/pdf" required aria-label="Pilih laporan PKL dalam format PDF" />
              </div>
              <div className={styles.modalFooter}>
                <button type="submit" className={styles.submitBtn}>
                  <FiFileText /> Kirim dokumen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Ajukan Mitra */}
      {isMitraModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBoxLarge}>
            <div className={styles.modalHeader}>
              <h2>Ajukan mitra & proposal PKL</h2>
              <button className={styles.closeBtn} onClick={() => setIsMitraModalOpen(false)}>
                <FiX />
              </button>
            </div>
            <form className={styles.modalBody} onSubmit={handlePartnerSubmit}>
              <div className={styles.inputGroup}>
                <label htmlFor="nama-mitra">Nama mitra industri</label>
                <input id="nama-mitra" type="text" placeholder="Contoh: PT Telkom Indonesia" required />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="bidang-usaha">Bidang usaha</label>
                <input id="bidang-usaha" type="text" placeholder="Contoh: Teknologi Informasi" required />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="alamat-mitra">Alamat mitra</label>
                <textarea id="alamat-mitra" placeholder="Alamat lengkap perusahaan" rows={3} required></textarea>
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="kontak-pembimbing">Kontak pembimbing industri</label>
                <input id="kontak-pembimbing" type="text" placeholder="Nama & nomor telepon" required />
              </div>
              <div className={styles.inputGroup}>
                <label>Proposal PKL (PDF)</label>
                <div className={styles.dropzone}>
                  <FiUploadCloud className={styles.dropzoneIcon} />
                  <p>Pilih berkas untuk diunggah</p>
                  <span>Dokumen PDF</span>
                  <input type="file" accept="application/pdf" required aria-label="Pilih proposal PKL dalam format PDF" />
                </div>
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