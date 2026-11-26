import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { getInisial } from '../../utils/formatter';
import styles from './ProfileMenu.module.css';

export default function ProfileMenu() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const name = user?.nama ?? (role === 'guru' ? 'Guru' : 'Siswa');
  const roleLabel = role === 'guru' ? 'Akun guru' : 'Akun siswa';

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.container} ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={`Profil ${name}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls="profile-menu"
        onClick={() => setIsOpen((open) => !open)}
      >
        {getInisial(name)}
      </button>
      {isOpen && (
        <div id="profile-menu" className={styles.dropdown} aria-label="Menu profil">
          <div className={styles.info}>
            <strong>{name}</strong>
            <span>{roleLabel}</span>
          </div>
          <div className={styles.divider} />
          <button type="button" className={styles.logout} onClick={handleLogout}>
            <FiLogOut aria-hidden="true" />
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}
