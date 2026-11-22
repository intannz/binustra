import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiBriefcase, FiCheckSquare, FiCreditCard, FiLogOut } from 'react-icons/fi';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = localStorage.getItem('role') === 'guru' ? 'guru' : 'siswa';
  const links = [
    { path: `/${role}/dashboard`, label: 'Beranda', icon: FiHome },
    { path: `/${role}/pkl`, label: 'Praktik Kerja Lapangan', icon: FiBriefcase },
    { path: `/${role}/absensi`, label: 'Absensi', icon: FiCheckSquare },
    { path: `/${role}/keuangan`, label: 'Keuangan', icon: FiCreditCard },
  ];

  const handleLogout = () => {
    localStorage.removeItem('role');
    localStorage.removeItem('nama');
    navigate('/login', { replace: true });
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <h2>BINUSTRA</h2>
        <p>PORTAL SEKOLAH</p>
      </div>

      <div className={styles.schoolInfo}>
        <div className={styles.schoolIcon}><FiHome /></div>
        <div>
          <p className={styles.schoolName}>SMK Bintang Nusantara</p>
          <p className={styles.schoolYear}>Tahun ajaran 2026/2027</p>
        </div>
      </div>

      <p className={styles.menuLabel}>MENU UTAMA</p>
      <nav className={styles.nav}>
        {links.map(({ path, label, icon: Icon }) => (
          <Link key={path} to={path} className={location.pathname === path ? styles.active : ''}>
            <Icon className={styles.icon} /> {label}
          </Link>
        ))}
      </nav>
      <button type="button" className={styles.logoutButton} onClick={handleLogout}>
        <FiLogOut className={styles.icon} /> Keluar
      </button>
    </aside>
  );
}