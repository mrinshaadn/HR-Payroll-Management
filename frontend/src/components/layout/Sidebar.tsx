import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useHR } from '../../context/HRContext';
import { 
  BarChart3, 
  Briefcase, 
  Calendar, 
  Clock, 
  CreditCard, 
  FileText, 
  HelpCircle, 
  LayoutDashboard, 
  LifeBuoy, 
  LogOut, 
  Users, 
  Settings,
  Plus,
  Compass,
  X,
  FileCheck,
  Shield
} from 'lucide-react';

export default function Sidebar() {
  const { leaveRequests, candidates, logoutUser, user, addEmployee, addLeaveRequest, addNotification } = useHR();
  const navigate = useNavigate();
  const [showQuickRequest, setShowQuickRequest] = useState(false);
  
  // Quick request form states
  const [reqType, setReqType] = useState('leave');
  const [quickName, setQuickName] = useState('');
  const [quickRole, setQuickRole] = useState('');
  const [quickLeaveDays, setQuickLeaveDays] = useState('3 Days');

  const pendingLeavesCount = leaveRequests.filter(r => r.status === 'PENDING').length;
  const activeOpenings = candidates.length;

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Employees', path: '/employees', icon: Users },
    { name: 'Attendance', path: '/attendance', icon: Clock },
    { name: 'Leave', path: '/leave', icon: Calendar, badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined },
    { name: 'Payroll', path: '/payroll', icon: CreditCard },
    { name: 'Recruitment', path: '/recruitment', icon: Briefcase, badge: activeOpenings },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Documents', path: '/documents', icon: FileText },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({ name: 'HR Management', path: '/hr-management', icon: Users });
  }

  if (user?.role === 'ADMIN') {
    navItems.push({ name: 'Users', path: '/users', icon: Shield });
  }

  // Admin gets settings as well
  if (user?.role === 'ADMIN') {
    navItems.push({ name: 'Settings', path: '/settings', icon: Settings });
  }

  const filteredNavItems = navItems.filter((item) => {
    if (user?.role === 'EMPLOYEE') {
      const allowed = ['Dashboard', 'Attendance', 'Leave', 'Payroll', 'Documents'];
      return allowed.includes(item.name);
    }
    if (user?.role === 'HR') {
      const allowed = ['Dashboard', 'Employees', 'Attendance', 'Leave', 'Payroll', 'Recruitment', 'Analytics', 'Documents'];
      return allowed.includes(item.name);
    }
    return true;
  });

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reqType === 'leave') {
      addLeaveRequest({
        employeeName: quickName || 'Eleanor Vance',
        employeeAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        leaveType: 'Annual Leave',
        reason: 'Quick request submitted from sidebar panel',
        dates: 'Next Week',
        duration: quickLeaveDays,
      });
      addNotification(`Quick Leave requested for ${quickName || 'Eleanor Vance'} (${quickLeaveDays})`, 'success');
    } else {
      addEmployee({
        name: quickName || 'Alex Newman',
        email: `${(quickName || 'newman').toLowerCase().replace(' ', '')}@enterprise.co`,
        phone: '(555) 123-5678',
        status: 'ACTIVE',
        department: 'Engineering',
        role: quickRole || 'Software Engineer',
        manager: 'Sarah Jenkins',
        location: 'New York Office',
        salary: 85000,
      });
      addNotification(`Quick drafted employee: ${quickName || 'Alex Newman'}`, 'success');
      navigate('/employees');
    }
    setShowQuickRequest(false);
    setQuickName('');
    setQuickRole('');
  };

  return (
    <aside className="relative flex h-screen w-64 flex-col border-r bg-slate-900 text-slate-100 transition-all duration-300 dark:bg-slate-950/95 border-slate-800">
      
      {/* Brand & Logo */}
      <div className="flex h-16 items-center px-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-black text-white shadow-md shadow-blue-500/20">
            <Compass className="h-5 w-5 text-sky-100" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white leading-tight">HR FLOW</h1>
            <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase leading-none">Global Enterprise</p>
          </div>
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `group flex items-center justify-between rounded-lg px-3.5 py-2.5 text-xs font-bold tracking-wide transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white font-extrabold shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <div className="flex items-center space-x-3">
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </div>
            {item.badge !== undefined && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm ring-1 ring-rose-300/20">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}

        {user?.role !== 'EMPLOYEE' && (
          <div className="pt-4 mt-4 border-t border-slate-800/60">
            <button
              onClick={() => setShowQuickRequest(true)}
              className="flex w-full items-center justify-center space-x-2 rounded-lg bg-blue-600/10 hover:bg-blue-600 py-2.5 text-xs font-extrabold text-blue-400 hover:text-white transition duration-200 border border-blue-500/20"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Quick Request</span>
            </button>
          </div>
        )}
      </nav>

      {/* Bottom Footer Section */}
      <div className="p-4 border-t border-slate-800 space-y-1 bg-slate-900/60">
        <NavLink
          to="/settings"
          className="flex items-center space-x-3 rounded-lg px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition"
        >
          <HelpCircle className="h-4 w-4" />
          <span>Support & Help</span>
        </NavLink>

        <button
          onClick={() => {
            logoutUser();
            navigate('/login');
          }}
          className="flex w-full items-center space-x-3 rounded-lg px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition"
        >
          <LogOut className="h-4 w-4" />
          <span>Log Out</span>
        </button>
      </div>

      {/* Quick Action Flyout Drawer */}
      {showQuickRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-2x dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Quick Portal Request</h3>
              <button onClick={() => setShowQuickRequest(false)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleQuickSubmit} className="mt-4 space-y-4">
              {user?.role !== 'EMPLOYEE' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Request Type</label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReqType('leave')}
                      className={`py-2 text-xs font-bold rounded-lg border text-center transition ${
                        reqType === 'leave'
                          ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
                          : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'
                      }`}
                    >
                      Draft Leave Request
                    </button>
                    <button
                      type="button"
                      onClick={() => setReqType('employee')}
                      className={`py-2 text-xs font-bold rounded-lg border text-center transition ${
                        reqType === 'employee'
                          ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
                          : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'
                      }`}
                    >
                      Quick Add Employee
                    </button>
                  </div>
                </div>
              )}

              {reqType === 'leave' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Employee Select</label>
                    <input
                      required
                      type="text"
                      value={quickName}
                      onChange={(e) => setQuickName(e.target.value)}
                      placeholder="e.g. Eleanor Vance"
                      className="mt-1.5 h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Duration Needed</label>
                    <select
                      value={quickLeaveDays}
                      onChange={(e) => setQuickLeaveDays(e.target.value)}
                      className="mt-1.5 h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100"
                    >
                      <option value="1 Day">1 Day</option>
                      <option value="3 Days">3 Days</option>
                      <option value="5 Days">5 Days</option>
                      <option value="7 Days">7 Days</option>
                      <option value="10 Days">10 Days</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                    <input
                      required
                      type="text"
                      value={quickName}
                      onChange={(e) => setQuickName(e.target.value)}
                      placeholder="e.g. Sarah Taylor"
                      className="mt-1.5 h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Job Title / Role</label>
                    <input
                      required
                      type="text"
                      value={quickRole}
                      onChange={(e) => setQuickRole(e.target.value)}
                      placeholder="e.g. Lead Designer"
                      className="mt-1.5 h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className="h-10 w-full rounded-lg bg-blue-600 text-xs font-extrabold text-white shadow-sm hover:bg-blue-700 transition"
              >
                Submit Action
              </button>
            </form>
          </div>
        </div>
      )}

    </aside>
  );
}
