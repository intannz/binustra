import { useState, type ChangeEvent, type FormEvent } from 'react';
import { 
  FiBell, FiChevronRight, FiCreditCard, FiUpload, 
  FiCopy, FiX, FiUploadCloud, FiFileText, FiAlertCircle, FiRefreshCw
} from 'react-icons/fi';
import Sidebar from '../../../components/layout/Sidebar';
import Footer from '../../../components/layout/Footer';
import styles from './InfoTagihan.module.css';

import { useApi } from '../../../hooks/useApi';
import { useAuth } from '../../../hooks/useAuth';
import { isApiError } from '../../../services/api';
import {
  getInfoPembayaran,
  getRingkasanTagihan,
  getTagihanSiswa,
  uploadBuktiPembayaran,
} from '../../../services/keuangan.service';
import { describeError, toDateInputValue } from '../../../utils/absensi';
import { formatRupiah, formatTanggal, getInisial } from '../../../utils/formatter';
import {
  TAGIHAN_PAGE_SIZE,
  getNamaTagihan,
  isBelumDibayar,
  urutkanJatuhTempo,
  validateBukti,
} from '../../../utils/keuangan';

/* ========================================================================== */
/* Konstanta & helper                                                         */
/* ========================================================================== */

interface PaymentFailure {
  message: string;
  /** true bila data tagihan di layar sudah tidak sesuai server dan perlu dimuat ulang */
  staleState: boolean;
}

/** Ubah kegagalan S-KEU-4 menjadi pesan siap tampil */
function toPaymentFailure(err: unknown): PaymentFailure {
  const fallback = 'Bukti pembayaran belum dapat dikirim. Silakan coba lagi.';
  if (!isApiError(err)) return { message: fallback, staleState: false };

  switch (err.code) {
    case 'TAGIHAN_NOT_FOUND':
      return { message: 'Tagihan tidak ditemukan. Daftar tagihan dimuat ulang.', staleState: true };
    case 'TAGIHAN_SUDAH_LUNAS':
      return { message: 'Tagihan ini sudah lunas, jadi bukti pembayaran tidak diperlukan.', staleState: true };
    case 'FILE_TYPE_INVALID':
      return { message: 'Bukti pembayaran harus berupa gambar JPG atau PNG.', staleState: false };
    case 'FILE_TOO_LARGE':
      return { message: 'Ukuran bukti pembayaran maksimal 5 MB.', staleState: false };
    default:
      return { message: describeError(err, fallback), staleState: false };
  }
}

/* ========================================================================== */
/* Halaman                                                                    */
/* ========================================================================== */

export default function InfoTagihan() {
  const { user } = useAuth();

  const tagihan = useApi('siswa:tagihan', (signal) =>
    getTagihanSiswa({ page: 1, limit: TAGIHAN_PAGE_SIZE }, { signal }),
  );
  const ringkasan = useApi('siswa:tagihan:ringkasan', (signal) => getRingkasanTagihan({ signal }));
  const info = useApi('siswa:info-pembayaran', (signal) => getInfoPembayaran({ signal }));

  const [today] = useState(() => toDateInputValue(new Date()));
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Bukti yang sudah terkirim pada sesi ini. Status "menunggu" tidak ada di daftar tagihan server
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);

  /* ---------- Form unggah bukti ---------- */
  const [selectedTagihanId, setSelectedTagihanId] = useState('');
  const [nominal, setNominal] = useState('');
  const [tanggalTransfer, setTanggalTransfer] = useState('');
  const [bukti, setBukti] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  /* ---------- Turunan data ---------- */
  const semuaTagihan = tagihan.data?.data ?? [];
  const totalTagihan = tagihan.data?.meta.total ?? 0;
  const riwayat = urutkanJatuhTempo(semuaTagihan, 'desc');

  // S-KEU-1 dipanggil tanpa filter status: Belum Lunas tidak mencakup Jatuh Tempo, jadi keduanya disaring di sini
  const belumDibayar = urutkanJatuhTempo(semuaTagihan.filter(isBelumDibayar), 'asc');
  const perluBukti = belumDibayar.filter((item) => !submittedIds.includes(item.id));
  const semuaMenunggu = belumDibayar.length > 0 && perluBukti.length === 0;
  const adaJatuhTempo = belumDibayar.some((item) => item.status === 'Jatuh Tempo');

  const infoNotFound = info.error?.status === 404;
  const infoData = infoNotFound ? undefined : info.data;

  const totalText = ringkasan.data ? formatRupiah(ringkasan.data.total) : ringkasan.loading ? '…' : '-';

  let badgeText = 'Belum dibayar';
  if (semuaMenunggu) badgeText = 'Menunggu verifikasi';
  else if (adaJatuhTempo) badgeText = 'Jatuh tempo';

  let tagihanLabel = 'Tidak ada tagihan';
  if (belumDibayar.length === 1) tagihanLabel = getNamaTagihan(belumDibayar[0]);
  else if (belumDibayar.length > 1) tagihanLabel = `${belumDibayar.length} tagihan belum dibayar`;
  else if (tagihan.loading) tagihanLabel = 'Memuat tagihan…';
  else if (tagihan.error) tagihanLabel = 'Tagihan belum dapat dimuat';

  const loadErrors = [
    { key: 'tagihan', label: 'Daftar tagihan', error: tagihan.error, retry: () => tagihan.refetch() },
    { key: 'ringkasan', label: 'Total tagihan', error: ringkasan.error, retry: () => ringkasan.refetch() },
    {
      key: 'info',
      label: 'Informasi pembayaran',
      error: infoNotFound ? null : info.error,
      retry: () => info.refetch(),
    },
  ];

  /* ---------- Handler ---------- */
  const handleCopyAccount = () => {
    if (!infoData) return;
    if (!navigator.clipboard) {
      setCopyMessage('Fitur salin tidak tersedia. Silakan salin nomor rekening secara manual.');
      return;
    }

    void navigator.clipboard.writeText(infoData.nomorRekening)
      .then(() => setCopyMessage('Nomor rekening berhasil disalin.'))
      .catch(() => setCopyMessage('Nomor rekening tidak dapat disalin. Silakan salin secara manual.'));
  };

  const openUploadModal = () => {
    const first = perluBukti[0];
    if (!first) return;

    setSelectedTagihanId(first.id);
    setNominal(String(first.nominal));
    setTanggalTransfer(today);
    setBukti(null);
    setUploadError(null);
    setNotice(null);
    setIsUploadModalOpen(true);
  };

  const closeUploadModal = () => {
    if (!isUploading) setIsUploadModalOpen(false);
  };

  const handleTagihanChange = (id: string) => {
    setSelectedTagihanId(id);
    const chosen = perluBukti.find((item) => item.id === id);
    if (chosen) setNominal(String(chosen.nominal));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    const problem = file === null ? null : validateBukti(file);

    setUploadError(problem);
    setBukti(problem === null ? file : null);
    // Berkas yang ditolak dikosongkan dari input agar tidak terlihat seolah terpilih
    if (problem !== null) event.target.value = '';
  };

  const handleSubmitPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const target = perluBukti.find((item) => item.id === selectedTagihanId);
    const nominalValue = Number(nominal);

    if (!target) {
      setUploadError('Pilih tagihan yang dibayar.');
      return;
    }
    if (nominal.trim() === '' || !Number.isFinite(nominalValue) || nominalValue <= 0) {
      setUploadError('Nominal harus lebih dari 0.');
      return;
    }
    if (tanggalTransfer === '') {
      setUploadError('Tanggal transfer wajib diisi.');
      return;
    }
    if (tanggalTransfer > today) {
      setUploadError('Tanggal transfer tidak boleh di masa depan.');
      return;
    }
    if (bukti === null) {
      setUploadError('Pilih berkas bukti pembayaran terlebih dahulu.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      await uploadBuktiPembayaran({
        tagihanId: target.id,
        nominal: nominalValue,
        tanggalTransfer,
        bukti,
      });
      setSubmittedIds((current) => [...current, target.id]);
      setIsUploadModalOpen(false);
      setNotice({
        kind: 'success',
        text: `Bukti pembayaran ${getNamaTagihan(target)} berhasil dikirim dan menunggu verifikasi.`,
      });
    } catch (err) {
      const failure = toPaymentFailure(err);
      if (failure.staleState) {
        // Tagihan di layar tidak lagi sesuai server: tutup modal, tampilkan alasan, muat ulang data
        setIsUploadModalOpen(false);
        setNotice({ kind: 'error', text: failure.message });
        tagihan.refetch();
        ringkasan.refetch();
      } else {
        setUploadError(failure.message);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const renderInfoPembayaran = () => {
    if (infoData) {
      return (
        <>
          <div className={styles.bankBox}>
            <div>
              <p className={styles.bankName}>{infoData.namaBank}</p>
              <h4 className={styles.accountNumber}>{infoData.nomorRekening}</h4>
              <p className={styles.accountName}>a.n. {infoData.namaPenerima}</p>
            </div>
            <button className={styles.copyBtn} title="Salin nomor rekening" aria-label="Salin nomor rekening" onClick={handleCopyAccount}>
              <FiCopy />
            </button>
          </div>
          {copyMessage && <p role="status">{copyMessage}</p>}
        </>
      );
    }

    let message = 'Informasi rekening belum dapat ditampilkan.';
    if (info.loading) message = 'Memuat informasi rekening…';
    else if (infoNotFound) message = 'Informasi rekening belum tersedia. Hubungi pihak sekolah.';

    return <p className={styles.stateNote} role="status">{message}</p>;
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
            <div className={styles.avatar}>{getInisial(user?.nama)}</div>
          </div>
        </header>

        <div className={styles.contentWrapper}>
          {/* --- Judul Halaman --- */}
          <div className={styles.pageTitleBox}>
            <p className={styles.subtitle}>PORTAL AKADEMIK / SISWA</p>
            <h1>Keuangan sekolah</h1>
            <p className={styles.description}>Pantau tagihan dan pembayaran dengan lebih mudah.</p>
          </div>

          {notice && (
            <div className={notice.kind === 'success' ? styles.alertSuccess : styles.alertError} role={notice.kind === 'success' ? 'status' : 'alert'}>
              {notice.kind === 'error' && <FiAlertCircle />}
              <span>{notice.text}</span>
            </div>
          )}

          {loadErrors.map((item) =>
            item.error ? (
              <div className={styles.alertError} role="alert" key={item.key}>
                <FiAlertCircle />
                <span>{item.label}: {describeError(item.error, 'belum dapat dimuat.')}</span>
                <button type="button" className={styles.retryBtn} onClick={item.retry}>
                  <FiRefreshCw /> Coba lagi
                </button>
              </div>
            ) : null,
          )}

          {/* --- Top Grid (Tagihan & Info Pembayaran) --- */}
          <div className={styles.gridTop}>
            
            {/* Card Tagihan Aktif */}
            <div className={styles.card}>
              <div className={styles.cardHeaderFlex}>
                <div className={styles.cardIcon}><FiCreditCard /></div>
                {belumDibayar.length > 0 && <span className={styles.badgeWarning}>{badgeText}</span>}
              </div>
              <div className={styles.tagihanInfo}>
                <p className={styles.tagihanLabel}>Total tagihan yang belum dibayar</p>
                <h2>{totalText}</h2>
                <p className={styles.tagihanBulan}>{tagihanLabel}</p>
              </div>
              <button 
                className={styles.primaryBtn} 
                onClick={openUploadModal}
                disabled={perluBukti.length === 0}
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
              {renderInfoPembayaran()}
              <div className={styles.instructionList}>
                <p>1. Transfer sesuai nominal tagihan: <strong>{ringkasan.data ? formatRupiah(ringkasan.data.total) : '-'}</strong>.</p>
                <p>2. Tulis keterangan: <strong>{user?.nama ? `${user.nama} dan kelas` : 'nama siswa dan kelas'}</strong>.</p>
                <p>3. Unggah bukti pembayaran untuk diverifikasi.</p>
                {infoData && <p>4. Atau bayar langsung di loket sekolah: <strong>{infoData.jadwalLoket}</strong>.</p>}
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
                  {riwayat.length === 0 ? (
                    <tr>
                      <td colSpan={3} className={styles.stateCell} role="status">
                        {tagihan.loading
                          ? 'Memuat tagihan…'
                          : tagihan.error
                            ? 'Daftar tagihan belum dapat ditampilkan.'
                            : 'Belum ada tagihan.'}
                      </td>
                    </tr>
                  ) : (
                    riwayat.map((item) => {
                      const menunggu = submittedIds.includes(item.id) && isBelumDibayar(item);
                      let statusClass = styles.statusBelum;
                      if (item.status === 'Lunas') statusClass = styles.statusLunas;
                      else if (item.status === 'Jatuh Tempo' && !menunggu) statusClass = styles.statusTempo;

                      return (
                        <tr key={item.id}>
                          <td>
                            {getNamaTagihan(item)}
                            <span className={styles.tagihanSub}>Jatuh tempo {formatTanggal(item.jatuhTempo)}</span>
                          </td>
                          <td>{formatRupiah(item.nominal)}</td>
                          <td>
                            <span className={statusClass}>
                              {menunggu ? 'Menunggu verifikasi' : item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {totalTagihan > semuaTagihan.length && (
              <p className={styles.truncNote}>
                Menampilkan {semuaTagihan.length} dari {totalTagihan} tagihan.
              </p>
            )}
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
              <button type="button" className={styles.closeBtn} onClick={closeUploadModal} aria-label="Tutup">
                <FiX />
              </button>
            </div>
            <form className={styles.modalBody} onSubmit={handleSubmitPayment} noValidate>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label htmlFor="bukti-tagihan">Tagihan yang dibayar</label>
                  <select
                    id="bukti-tagihan"
                    className={styles.formControl}
                    value={selectedTagihanId}
                    onChange={(event) => handleTagihanChange(event.target.value)}
                  >
                    {perluBukti.map((item) => (
                      <option key={item.id} value={item.id}>
                        {getNamaTagihan(item)} • {formatRupiah(item.nominal)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label htmlFor="bukti-nominal">Nominal transfer (Rp)</label>
                  <input
                    id="bukti-nominal"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    className={styles.formControl}
                    value={nominal}
                    onChange={(event) => setNominal(event.target.value)}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="bukti-tanggal">Tanggal transfer</label>
                  <input
                    id="bukti-tanggal"
                    type="date"
                    max={today}
                    className={styles.formControl}
                    value={tanggalTransfer}
                    onChange={(event) => setTanggalTransfer(event.target.value)}
                  />
                </div>
              </div>

              <div className={styles.dropzone}>
                <FiUploadCloud className={styles.dropzoneIcon} />
                <p>{bukti ? bukti.name : 'Pilih berkas untuk diunggah'}</p>
                <span>Gambar PNG atau JPG, maksimal 5 MB</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  aria-label="Pilih bukti pembayaran"
                  onChange={handleFileChange}
                />
              </div>

              {uploadError && <p className={styles.fieldError} role="alert">{uploadError}</p>}

              <div className={styles.modalFooter}>
                <button type="submit" className={styles.submitBtn} disabled={isUploading}>
                  <FiFileText /> {isUploading ? 'Mengirim…' : 'Kirim bukti'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
