import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardSiswa from './pages/siswa/dashboard/DashboardSiswa';
import DashboardGuru from './pages/guru/dashboard/DashboardGuru';
import RekapAbsensiSiswa from './pages/siswa/absensi/RekapAbsensiSiswa';
import RekapAbsensiKelas from './pages/guru/absensi/RekapAbsensiKelas';
import InfoTagihan from './pages/siswa/keuangan/InfoTagihan';
import MonitoringTagihan from './pages/guru/keuangan/MonitoringTagihan';
import InfoPklSiswa from './pages/siswa/pkl/InfoPklSiswa';
import InfoPklGuru from './pages/guru/pkl/InfoPklGuru';
import Login from './pages/auth/Login';
import { useAuth } from './hooks/useAuth';
import { getDashboardPath } from './utils/routes';
import type { Role } from './types/portal.types';

const ProtectedRoute = ({ children, allowedRole }: { children: ReactNode; allowedRole: Role }) => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role !== allowedRole) return <Navigate to="/unauthorized" replace />;

  return <>{children}</>;
};

export default function App() {
  const { role } = useAuth();
  const defaultPath = getDashboardPath(role);

  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultPath} replace />} />
      <Route path="/login" element={<Login />} />

      <Route path="/siswa/dashboard" element={<ProtectedRoute allowedRole="siswa"><DashboardSiswa /></ProtectedRoute>} />
      <Route path="/siswa/pkl" element={<ProtectedRoute allowedRole="siswa"><InfoPklSiswa /></ProtectedRoute>} />
      <Route path="/siswa/absensi" element={<ProtectedRoute allowedRole="siswa"><RekapAbsensiSiswa /></ProtectedRoute>} />
      <Route path="/siswa/keuangan" element={<ProtectedRoute allowedRole="siswa"><InfoTagihan /></ProtectedRoute>} />

      <Route path="/guru/dashboard" element={<ProtectedRoute allowedRole="guru"><DashboardGuru /></ProtectedRoute>} />
      <Route path="/guru/pkl" element={<ProtectedRoute allowedRole="guru"><InfoPklGuru /></ProtectedRoute>} />
      <Route path="/guru/absensi" element={<ProtectedRoute allowedRole="guru"><RekapAbsensiKelas /></ProtectedRoute>} />
      <Route path="/guru/keuangan" element={<ProtectedRoute allowedRole="guru"><MonitoringTagihan /></ProtectedRoute>} />

      <Route path="/unauthorized" element={<Navigate to={defaultPath} replace />} />
      <Route path="*" element={<Navigate to={defaultPath} replace />} />
    </Routes>
  );
}