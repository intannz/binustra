import { useState } from 'react';
import { FiBell, FiRefreshCw } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import styles from './NotificationBell.module.css';

export default function NotificationBell() {
  const navigate = useNavigate();
  const { items, unreadCount, loading, errors, storageError, markAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : 'Notifikasi'}
        aria-expanded={open}
        aria-controls="notification-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <FiBell aria-hidden="true" />
        {unreadCount > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section id="notification-panel" className={styles.panel} aria-label="Notifikasi">
          <div className={styles.panelHeader}>
            <h2>Notifikasi</h2>
            {unreadCount > 0 && <span>{unreadCount} belum dibaca</span>}
          </div>

          {storageError && (
            <p className={styles.warning} role="alert">
              Status baca tidak dapat disimpan di browser ini.
            </p>
          )}

          {errors.map((error) => (
            <div key={error.label} className={styles.error}>
              <p role="alert">{error.label}: {error.message}</p>
              <button type="button" className={styles.retry} onClick={error.retry}>
                <FiRefreshCw aria-hidden="true" /> Coba lagi
              </button>
            </div>
          ))}

          {items.length > 0 ? (
            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`${styles.item} ${item.isRead ? styles.read : styles.unread}`}
                    onClick={() => {
                      markAsRead(item.id);
                      setOpen(false);
                      navigate(item.path);
                    }}
                  >
                    <span className={styles.unreadDot} aria-hidden="true" />
                    <span className={styles.itemText}>
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : loading ? (
            <p className={styles.empty} role="status">Memuat notifikasi…</p>
          ) : (
            <p className={styles.empty}>Belum ada notifikasi dari data yang tersedia.</p>
          )}
        </section>
      )}
    </div>
  );
}
