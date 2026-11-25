import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiBriefcase,
  FiCheckSquare,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiHome,
  FiLogOut,
  FiMenu,
  FiX,
} from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { role: authRole, logout } = useAuth();
  const role = authRole === 'guru' ? 'guru' : 'siswa';
  const links = [
    { path: `/${role}/dashboard`, label: 'Beranda', icon: FiHome },
    { path: `/${role}/pkl`, label: 'Praktik Kerja Lapangan', icon: FiBriefcase },
    { path: `/${role}/absensi`, label: 'Absensi', icon: FiCheckSquare },
    { path: `/${role}/keuangan`, label: 'Keuangan', icon: FiCreditCard },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <button
        type="button"
        className={styles.mobileToggle}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Tutup navigasi' : 'Buka navigasi'}
        aria-expanded={mobileOpen}
        aria-controls="portal-sidebar"
      >
        {mobileOpen ? <FiX /> : <FiMenu />}
      </button>
      {mobileOpen && (
        <button
          type="button"
          className={styles.overlay}
          aria-label="Tutup navigasi"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        id="portal-sidebar"
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}
        aria-label="Navigasi utama"
      >
        <div className={styles.brand}>
          <div>
            <h2>BINUSTRA</h2>
            <p>PORTAL SEKOLAH</p>
          </div>
          <button
            type="button"
            className={styles.collapseButton}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        <div className={styles.schoolInfo} title="SMK Bintang Nusantara, Tahun ajaran 2026/2027">
          <div className={styles.schoolIcon}><FiHome /></div>
          <div className={styles.schoolText}>
            <p className={styles.schoolName}>SMK Bintang Nusantara</p>
            <p className={styles.schoolYear}>Tahun ajaran 2026/2027</p>
          </div>
        </div>

        <p className={styles.menuLabel}>MENU UTAMA</p>
        <nav className={styles.nav}>
          {links.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={location.pathname === path ? styles.active : ''}
              title={collapsed ? label : undefined}
              aria-current={location.pathname === path ? 'page' : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <Icon className={styles.icon} />
              <span className={styles.linkLabel}>{label}</span>
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className={styles.logoutButton}
          onClick={handleLogout}
          title={collapsed ? 'Keluar' : undefined}
        >
          <FiLogOut className={styles.icon} />
          <span className={styles.linkLabel}>Keluar</span>
        </button>
      </aside>
    </>
  );
}
