import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HRProvider, useHR } from './context/HRContext';
import Layout from './components/layout/Layout';
import {
  Auth,
  Dashboard,
  Employees,
  Profile,
  Attendance,
  Leave,
  Payroll,
  Reports,
  Settings,
  Documents,
  Recruitment,
  UsersManagement,
  HRManagement
} from './pages';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useHR();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <HRProvider>
      <HashRouter>
        <Routes>
          {/* Public Auth routes */}
          <Route path="/login" element={<Auth />} />

          {/* Secure application shell */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            <Route path="employees" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
                <Employees />
              </ProtectedRoute>
            } />
            <Route path="employees/:id" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
                <Profile />
              </ProtectedRoute>
            } />
            
            <Route path="users" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <UsersManagement />
              </ProtectedRoute>
            } />

            <Route path="hr-management" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <HRManagement />
              </ProtectedRoute>
            } />
            
            <Route path="attendance" element={<Attendance />} />
            <Route path="leave" element={<Leave />} />
            <Route path="payroll" element={<Payroll />} />
            
            <Route path="recruitment" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
                <Recruitment />
              </ProtectedRoute>
            } />
            
            <Route path="analytics" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
                <Reports />
              </ProtectedRoute>
            } />
            
            <Route path="documents" element={<Documents />} />
            
            <Route path="settings" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Settings />
              </ProtectedRoute>
            } />
          </Route>

          {/* Core redirects */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </HRProvider>
  );
}
