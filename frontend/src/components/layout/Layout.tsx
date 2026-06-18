import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useHR } from '../../context/HRContext';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  const { isAuthenticated } = useHR();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate, location.pathname]);

  if (!isAuthenticated) {
    return null; // Don't show layout if not logged in; handle redirect
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      
      {/* Persistent Left Sidebar */}
      <Sidebar />

      {/* Main Panel Content (Header + Dynamic Outlet) */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        
        {/* Core Main View Container */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-950 p-6 transition-colors duration-200 dark:bg-slate-950">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
