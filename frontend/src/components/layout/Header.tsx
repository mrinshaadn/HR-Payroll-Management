import React, { useState, useEffect } from 'react';
import { useHR } from '../../context/HRContext';
import { 
  Bell, 
  Search, 
  Clock, 
  Sun, 
  Moon, 
  ChevronDown, 
  LogOut, 
  CheckCircle,
  AlertTriangle,
  User,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router';

export default function Header() {
  const { 
    clockInActive, 
    toggleClockIn, 
    todayRecord,
    user, 
    logoutUser, 
    notifications, 
    settings, 
    updateSettings 
  } = useHR();
  
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const toggleTheme = () => {
    updateSettings({
      themeMode: settings.themeMode === 'light' ? 'dark' : 'light'
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/employees?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-slate-900 px-6 transition-colors duration-200 dark:bg-slate-900 border-slate-800 dark:border-slate-800 text-slate-100">
      
      {/* Search Input */}
      <form onSubmit={handleSearch} className="relative w-full max-w-md">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-450 dark:text-slate-500" />
        <input
          type="text"
          placeholder="Search employees, payroll, docs (e.g., Eleanor)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-10 w-full rounded-md border border-slate-700 bg-slate-800 pl-10 pr-4 text-xs font-medium text-slate-100 transition shadow-sm focus:border-brand-blue focus:bg-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-brand-blue"
        />
      </form>
 
      {/* Right Side Widgets */}
      <div className="flex items-center space-x-4">
        
        {/* Dynamic Clock Widget */}
        <div className="hidden items-center space-x-2 rounded-lg bg-slate-850 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-300 dark:bg-slate-850 dark:text-slate-300 md:flex">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>{formatDate(currentTime)}</span>
          <span className="text-slate-700 dark:text-slate-700">|</span>
          <span className="text-brand-blue dark:text-blue-400">{formatTime(currentTime)}</span>
        </div>
 
        {/* Theme Toggler */}
        <button
          onClick={toggleTheme}
          title="Toggle UI Theme"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-850 text-slate-300 transition duration-200 hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 dark:hover:bg-slate-800 hover:text-white dark:hover:text-white"
        >
          {settings.themeMode === 'light' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4 text-amber-400" />
          )}
        </button>

        {/* Real-time Clock-In/Out Button & Status Info */}
        <div className="flex items-center space-x-2">
          {todayRecord && (
            <div className="text-[10px] text-right font-medium text-slate-350 mr-1 hidden sm:block">
              {clockInActive ? (
                <div>
                  <span className="font-bold text-emerald-450">Active: </span>
                  Checked In at {todayRecord.clockIn} ({todayRecord.status})
                </div>
              ) : (
                todayRecord.clockOut && todayRecord.clockOut !== '-' && (
                  <div>
                    <span className="font-bold text-blue-400">Completed: </span>
                    Work Hours: {todayRecord.workHours}
                  </div>
                )
              )}
            </div>
          )}
          
          <button
            onClick={toggleClockIn}
            disabled={todayRecord !== null && todayRecord.clockOut !== null && todayRecord.clockOut !== '-'}
            className={`flex h-9 items-center space-x-1.5 rounded-lg border px-3.5 text-xs font-extrabold shadow-sm transition-all duration-300 ${
              todayRecord !== null && todayRecord.clockOut !== null && todayRecord.clockOut !== '-'
                ? 'border-slate-700 bg-slate-800 text-slate-400 cursor-not-allowed'
                : clockInActive
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400 animate-pulse'
                : 'border-slate-300 bg-slate-900 text-white hover:bg-slate-800 dark:border-slate-700 dark:bg-blue-600 dark:hover:bg-blue-700'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${
              todayRecord !== null && todayRecord.clockOut !== null && todayRecord.clockOut !== '-'
                ? 'bg-slate-600'
                : clockInActive 
                ? 'bg-emerald-500' 
                : 'bg-slate-400 dark:bg-slate-100'
            }`} />
            <span>
              {todayRecord !== null && todayRecord.clockOut !== null && todayRecord.clockOut !== '-'
                ? 'Completed'
                : clockInActive
                ? 'Check Out'
                : 'Check In'}
            </span>
          </button>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Bell className="h-4 w-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-150 bg-white py-1 shadow-xl transition-all duration-200 dark:border-slate-805 dark:bg-slate-850">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Alert Center</h4>
                <p className="text-[10px] font-semibold text-brand-blue dark:text-blue-400">{notifications.length} Pending</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-400 dark:text-slate-500">
                    <Check className="h-8 w-8 text-emerald-500 mb-1" />
                    <p className="text-[11px] font-medium">All caught up!</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className="flex items-start space-x-3 border-b border-slate-50 p-3 hover:bg-slate-50/50 dark:border-slate-800/40 dark:hover:bg-slate-800/40">
                      <div className="mt-0.5">
                        {notif.type === 'success' ? (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        ) : notif.type === 'warning' ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        ) : (
                          <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{notif.text}</p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{notif.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown Profile Grid */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center space-x-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {(() => {
              const avatarUrl = user?.avatar;
              const name = user?.name || 'Admin';
              const parts = name.trim().split(' ');
              const initials = parts.map(p => p[0] || '').join('').toUpperCase().slice(0, 2) || 'A';
              let hash = 0;
              for (let i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
              }
              const h = Math.abs(hash % 360);
              
              return avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="h-8 w-8 rounded-full border border-slate-750 object-cover dark:border-slate-700/85"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const fallback = document.getElementById('header-avatar-fallback');
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
              ) : (
                <div 
                  style={{ backgroundColor: `hsl(${h}, 65%, 40%)`, color: '#ffffff' }}
                  className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs border border-slate-750 dark:border-slate-700/85 shadow-sm"
                >
                  {initials}
                </div>
              );
            })()}
            <div className="hidden text-left md:block">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                {user?.name || 'Alex Rodriguez'}
              </p>
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                {user?.role || 'HR Director'}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-150 bg-white py-1 shadow-xl dark:border-slate-805 dark:bg-slate-850">
              <div className="border-b border-slate-100 px-4 py-2 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Connected User</p>
                <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">{user?.email}</p>
              </div>
              
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/settings');
                }}
                className="flex w-full items-center space-x-2 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>My Settings</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex w-full items-center space-x-2 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
