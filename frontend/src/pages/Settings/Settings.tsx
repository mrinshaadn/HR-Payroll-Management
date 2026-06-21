import React, { useState, useEffect } from 'react';
import { useHR } from '../../context/HRContext';
import { settingsService } from '../../services/settingsService';
import { 
  Building, 
  User, 
  Bell, 
  Upload, 
  Check, 
  Save, 
  Shield, 
  Key,
  Globe,
  Settings as SettingsIcon,
  Loader2,
  Activity,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export default function Settings() {
  const { config, updateSettings, addNotification, user } = useHR();
  const isHR = user?.role === 'HR' || user?.role === 'ADMIN';

  // Navigation tab states
  const [activeTab, setActiveTab] = useState<'Profile' | 'Preferences' | 'Notifications' | 'Security' | 'Org'>('Profile');

  // Loading & error status
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Profile States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [avatar, setAvatar] = useState('');
  const [accountStatus, setAccountStatus] = useState('Active');
  const [lastLogin, setLastLogin] = useState('');

  // 2. Change Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // 3. User Preferences States
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('en');

  // 4. Notification Settings States
  const [emailNotif, setEmailNotif] = useState(true);
  const [attendanceNotif, setAttendanceNotif] = useState(true);
  const [leaveNotif, setLeaveNotif] = useState(true);
  const [payrollNotif, setPayrollNotif] = useState(true);
  const [recruitmentNotif, setRecruitmentNotif] = useState(true);

  // 5. Org Setup States (HR only)
  const [companyName, setCompanyName] = useState(config.companyName || 'Global Innovations Tech Group');
  const [adminEmail, setAdminEmail] = useState(config.adminEmail || 'admin@enterprise.co');
  const [payCycle, setPayCycle] = useState(config.payCycle || 'Semi-monthly');
  const [timezone, setTimezone] = useState(config.timezone || 'EST - Eastern Standard Time');

  // Load all settings
  const loadAllSettings = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const prof = await settingsService.getProfile();
      if (prof) {
        setFirstName(prof.first_name || '');
        setLastName(prof.last_name || '');
        setEmail(prof.email || '');
        setPhone(prof.phone || '');
        setAddress(prof.address || '');
        setAvatar(prof.avatar || '');
        setAccountStatus(prof.is_active ? 'Active' : 'Inactive');
        if (prof.last_login) {
          setLastLogin(new Date(prof.last_login).toLocaleString());
        }
      }

      const pref = await settingsService.getPreferences();
      if (pref) {
        setTheme(pref.theme || 'dark');
        setLanguage(pref.language || 'en');
      }

      const notif = await settingsService.getNotifications();
      if (notif) {
        setEmailNotif(notif.email_notifications);
        setAttendanceNotif(notif.attendance_notifications);
        setLeaveNotif(notif.leave_notifications);
        setPayrollNotif(notif.payroll_notifications);
        setRecruitmentNotif(notif.recruitment_notifications);
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      setErrorMsg('Failed to load details. Authentication token might be missing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllSettings();
  }, [user]);

  // Form submission handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (activeTab === 'Profile') {
        const res = await settingsService.updateProfile({
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          address,
          avatar
        });
        if (res) {
          setSuccessMsg('User profile updated successfully!');
          addNotification('User profile settings saved.', 'success');
        }
      } else if (activeTab === 'Preferences') {
        const res = await settingsService.updatePreferences({
          theme,
          language
        });
        if (res) {
          setSuccessMsg('User preferences updated successfully!');
          addNotification('User preferences configuration saved.', 'success');
          // If theme changed, apply theme class
          if (theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      } else if (activeTab === 'Notifications') {
        const res = await settingsService.updateNotifications({
          email_notifications: emailNotif,
          attendance_notifications: attendanceNotif,
          leave_notifications: leaveNotif,
          payroll_notifications: payrollNotif,
          recruitment_notifications: recruitmentNotif
        });
        if (res) {
          setSuccessMsg('Notification parameters saved successfully!');
          addNotification('Notification hooks updated.', 'success');
        }
      } else if (activeTab === 'Security') {
        if (!currentPassword || !newPassword || !confirmPassword) {
          setErrorMsg('All password fields are required.');
          setSaveLoading(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          setErrorMsg('New password and confirmation do not match.');
          setSaveLoading(false);
          return;
        }
        await settingsService.changePassword(currentPassword, newPassword);
        setSuccessMsg('Security credentials updated successfully!');
        addNotification('Account password updated.', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else if (activeTab === 'Org' && isHR) {
        updateSettings({
          companyName,
          adminEmail,
          payCycle,
          timezone
        });
        setSuccessMsg('Horizon Corporate organization parameters updated!');
        addNotification('Corporate configurations updated.', 'success');
      }
    } catch (err: any) {
      console.error('Save failed:', err);
      setErrorMsg(err.response?.data?.detail || 'An error occurred while saving configuration details.');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BAR */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-2xl flex items-center space-x-2">
          <SettingsIcon className="h-6 w-6 text-blue-600 animate-spin" style={{ animationDuration: '6s' }} />
          <span>System Configurations &amp; Settings</span>
        </h1>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Fine tune system parameters, personal dashboard layout, and verify security protocols
        </p>
      </div>

      {/* CORE 2-COLUMN SETTINGS SCREEN */}
      <div className="grid gap-6 lg:grid-cols-4">
        
        {/* Left Column Category list */}
        <div className="space-y-1.5">
          {[
            { id: 'Profile', label: 'My Profile', icon: User, show: true },
            { id: 'Preferences', label: 'User Preferences', icon: Globe, show: true },
            { id: 'Notifications', label: 'Alerts & Webhooks', icon: Bell, show: true },
            { id: 'Security', label: 'Security & Access', icon: Key, show: true },
            { id: 'Org', label: 'Organization Setup', icon: Building, show: isHR }
          ].map((item) => {
            if (!item.show) return null;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setErrorMsg('');
                  setSuccessMsg('');
                  setActiveTab(item.id as any);
                }}
                className={`flex w-full items-center space-x-2.5 rounded-lg px-4 py-2.5 text-xs font-bold tracking-wide transition border ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white font-extrabold shadow-sm border-blue-600'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:border-slate-800'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Quick Account Info card */}
          {firstName && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-xs space-y-2 mt-4">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Settings Session Profile</span>
              <div className="flex items-center space-x-2.5">
                <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-650 flex items-center justify-center font-bold text-xs uppercase dark:bg-blue-900/60 dark:text-blue-300">
                  {firstName[0]}
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 dark:text-white truncate">{firstName} {lastName}</p>
                  <p className="text-[9px] text-slate-505 dark:text-slate-400 font-semibold uppercase">{user?.role}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <p>Status: <span className="text-emerald-600 dark:text-emerald-450 font-bold">{accountStatus}</span></p>
                {lastLogin && <p>Last Login: <span className="font-mono">{lastLogin}</span></p>}
              </div>
            </div>
          )}
        </div>

        {/* Right Settings panel (3 Columns) */}
        <div className="lg:col-span-3">
          
          {loading ? (
            <div className="flex h-64 items-center justify-center bg-white rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center space-x-2 text-slate-400 text-xs">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="font-extrabold uppercase tracking-wider text-slate-550 dark:text-slate-400">Syncing dashboard parameters...</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              
              {errorMsg && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/60 dark:text-rose-300">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{errorMsg}</span>
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/60 dark:text-emerald-300">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>{successMsg}</span>
                  </div>
                </div>
              )}

              {/* TAB 1: MY PROFILE */}
              {activeTab === 'Profile' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-200 pb-3 dark:border-slate-800">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">Personal Vault Profile</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Review your personal coordinates and configure avatar profiles</p>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt="Avatar Logo"
                          className="h-14 w-14 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl uppercase dark:bg-blue-900 dark:text-blue-300">
                          {firstName ? firstName[0] : 'U'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Avatar Photo Link</h4>
                      <input
                        type="url"
                        value={avatar}
                        onChange={(e) => setAvatar(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="mt-1.5 h-8 w-80 rounded-md border border-slate-300 bg-slate-50 px-2 text-[10px] text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">First Name</label>
                      <input
                        required
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Last Name</label>
                      <input
                        required
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Personal Email</label>
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-555 dark:text-slate-400">Residential Address</label>
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows={2}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-850 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: USER PREFERENCES */}
              {activeTab === 'Preferences' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-200 pb-3 dark:border-slate-800">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">Horizon Preferences Panel</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Configure visual themes, locale parameters and personal layouts</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Application Theme Mode</label>
                      <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs text-slate-855 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                      >
                        <option value="light" className="dark:bg-slate-900">Horizon Premium Light</option>
                        <option value="dark" className="dark:bg-slate-900">Horizon Premium Dark</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-555 dark:text-slate-400">Default System Language</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs text-slate-855 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                      >
                        <option value="en" className="dark:bg-slate-900">English (United States)</option>
                        <option value="es" className="dark:bg-slate-900">Spanish (Español)</option>
                        <option value="fr" className="dark:bg-slate-900">French (Français)</option>
                        <option value="de" className="dark:bg-slate-900">German (Deutsch)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SYSTEM ALERTS & LOG LEVEL */}
              {activeTab === 'Notifications' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-200 pb-3 dark:border-slate-800">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">Alert Webhook Configurations</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Toggle hooks for emails, attendance milestones, leave requests and payouts</p>
                  </div>
                  
                  <div className="space-y-3.5 text-xs font-semibold">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={emailNotif}
                        onChange={(e) => setEmailNotif(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 dark:bg-slate-800 dark:border-slate-700" 
                      />
                      <span className="text-slate-700 dark:text-slate-300">Enable general email notifications</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={attendanceNotif}
                        onChange={(e) => setAttendanceNotif(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 dark:bg-slate-800 dark:border-slate-700" 
                      />
                      <span className="text-slate-700 dark:text-slate-300">Notify supervisor on daily attendance/late clock events</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={leaveNotif}
                        onChange={(e) => setLeaveNotif(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 dark:bg-slate-800 dark:border-slate-700" 
                      />
                      <span className="text-slate-700 dark:text-slate-300">Alert employee on leave request approvals / rejection events</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={payrollNotif}
                        onChange={(e) => setPayrollNotif(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 dark:bg-slate-800 dark:border-slate-700" 
                      />
                      <span className="text-slate-700 dark:text-slate-300">Notify on monthly paycheck generation and payslip disbursals</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={recruitmentNotif}
                        onChange={(e) => setRecruitmentNotif(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 dark:bg-slate-800 dark:border-slate-700" 
                      />
                      <span className="text-slate-700 dark:text-slate-300">Alert on new recruitment applicant funnels &amp; interviews</span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 4: PASSWORD MANAGEMENT SECURITY */}
              {activeTab === 'Security' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-200 pb-3 dark:border-slate-800">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">Security &amp; Passwords</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Update account login password securely</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="relative">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Current Password</label>
                      <div className="relative">
                        <input
                          required
                          type={showCurrent ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 pl-3 pr-10 text-xs text-slate-855 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent(!showCurrent)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-550 dark:text-slate-400"
                        >
                          {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-555 dark:text-slate-400">New Password</label>
                      <div className="relative">
                        <input
                          required
                          type={showNew ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 pl-3 pr-10 text-xs text-slate-855 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-550 dark:text-slate-400"
                        >
                          {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-555 dark:text-slate-400">Confirm New Password</label>
                      <input
                        required
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-855 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: ORGANIZATIONAL DETAILS (HR ONLY) */}
              {activeTab === 'Org' && isHR && (
                <div className="space-y-6">
                  <div className="border-b border-slate-200 pb-3 dark:border-slate-800">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">Horizon Corporate setups</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Manage company details, timezone and payroll disbursal presets</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Company Name</label>
                      <input
                        required
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-855 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-555 dark:text-slate-400">General Admin Contact Email</label>
                      <input
                        required
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-855 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-555 dark:text-slate-400">Active Payroll Disbursals Cycle</label>
                      <select
                        value={payCycle}
                        onChange={(e) => setPayCycle(e.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs text-slate-855 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                      >
                        <option value="Bi-weekly" className="dark:bg-slate-900">Bi-weekly Period (Every 14 Days)</option>
                        <option value="Semi-monthly" className="dark:bg-slate-900">Semi-monthly Period (15th and 30th)</option>
                        <option value="Monthly" className="dark:bg-slate-900">Monthly Period (Last slot monthly)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-555 dark:text-slate-400">Operating Timezone Selector</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs text-slate-855 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                      >
                        <option value="EST - Eastern Standard Time" className="dark:bg-slate-900">EST - Eastern Standard Time (NYC)</option>
                        <option value="PST - Pacific Standard Time" className="dark:bg-slate-900">PST - Pacific Standard Time (SF)</option>
                        <option value="BST - British Summer Time" className="dark:bg-slate-900">BST - British Summer Time (London)</option>
                        <option value="IST - Indian Standard Time" className="dark:bg-slate-900">IST - Indian Standard Time (Delhi)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Form Submission control panel */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={loadAllSettings}
                  disabled={saveLoading}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  Discard Changes
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="inline-flex items-center space-x-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-black text-white hover:bg-blue-700 shadow-sm disabled:opacity-50 transition"
                >
                  {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{saveLoading ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>

            </form>
          )}
        </div>

      </div>

    </div>
  );
}
