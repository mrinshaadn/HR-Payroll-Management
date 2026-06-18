import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHR } from '../../context/HRContext';
import { 
  Building2, 
  Mail, 
  Lock, 
  ArrowRight,
  TrendingUp,
  Percent,
  Compass,
  DollarSign
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer 
} from 'recharts';

// Mini data structures for high-fidelity floating graphics on the left
const workforceTrendsData = [
  { value: 10 }, { value: 15 }, { value: 13 }, { value: 20 }, { value: 18 }, { value: 25 }, { value: 29 }
];

const retentionData = [
  { value: 90 }, { value: 92 }, { value: 91 }, { value: 94 }, { value: 93 }, { value: 95 }
];

const payrollData = [
  { name: 'Jan', value: 800000 },
  { name: 'Feb', value: 900000 },
  { name: 'Mar', value: 1000000 },
  { name: 'Apr', value: 950000 },
  { name: 'May', value: 1100000 },
  { name: 'Jun', value: 1200000 }
];

const pieData = [
  { value: 40, color: '#3b82f6' },
  { value: 30, color: '#10b981' },
  { value: 20, color: '#f59e0b' },
  { value: 10, color: '#ec4899' }
];

export default function Auth() {
  const { loginUser, isAuthenticated, addNotification } = useHR();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  React.useEffect(() => {
    const checkScreen = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await loginUser(email, password);
      setLoading(false);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid credentials. Please enter a valid username/email and password.');
      }
    } catch (err) {
      setLoading(false);
      setError('An error occurred. Please try again.');
    }
  };

  const triggerQuickLogin = async () => {
    setEmail('admin');
    setPassword('admin123');
    setLoading(true);
    const success = await loginUser('admin', 'admin123');
    setLoading(false);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Failed to log in with admin account.');
    }
  };

  const triggerQuickEmployeeLogin = async () => {
    setEmail('shahabas');
    setPassword('password123');
    setLoading(true);
    const success = await loginUser('shahabas', 'password123');
    setLoading(false);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Failed to log in with employee account.');
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden">
      
      {/* LEFT COLUMN: GORGEOUS EXCLUSIVE WORKSPACE ILLUSTRATIONS */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 p-12 text-white lg:flex border-r border-slate-800">
        
        {/* Top Header */}
        <div className="flex items-center space-x-2">
          <Compass className="h-6 w-6 text-blue-500 animate-spin-slow" />
          <span className="text-xl font-black tracking-wider uppercase bg-gradient-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">HR FLOW</span>
        </div>

        {/* Big Bold Headline */}
        <div className="relative z-10 max-w-lg mt-4">
          <h2 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
            Manage your <br/>
            <span className="bg-gradient-to-r from-blue-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">workforce smarter</span>
          </h2>
          <p className="mt-4 text-sm font-semibold text-slate-400 leading-relaxed">
            The modern unified portal to process payroll globally, organize attendance, monitor compliance documents, and optimize teams with high-fidelity automation metrics.
          </p>
        </div>

        {/* FLOATING HIGH FIDELITY GRAPHIC GRID (An exact match to Screenshot 1!) */}
        <div className="relative flex-1 py-12 flex items-center justify-center">
          <div className="relative w-full max-w-md h-72">
            
            {/* Grid background mesh */}
            <div className="absolute inset-0 bg-[radial-gradient(#334155_1.2px,transparent_1.2px)] [background-size:16px_16px] opacity-20" />

            {/* Float Card 1: Workforce Trends (Growth) */}
            <div className="absolute top-2 left-0 w-44 rounded-xl bg-white/10 p-3 shadow-xl backdrop-blur-md border border-white/10">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Workforce Trends</span>
              <span className="text-lg font-black text-white flex items-center space-x-1 mt-0.5">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span>+12% Growth</span>
              </span>
              <div className="h-10 mt-1.5 w-full">
                {isLargeScreen && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <LineChart data={workforceTrendsData}>
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Float Card 2: Retention Rate */}
            <div className="absolute top-5 right-2 w-40 rounded-xl bg-white/10 p-3 shadow-xl backdrop-blur-md border border-white/10">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Retention Rate</span>
              <span className="text-lg font-black text-emerald-400 block mt-0.5">95%</span>
              <div className="h-10 mt-1.5 w-full">
                {isLargeScreen && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <LineChart data={retentionData}>
                      <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Float Card 3: Centerpiece - Payroll Insights */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-52 rounded-xl bg-white/15 p-4 shadow-2xl backdrop-blur-lg border border-white/20">
              <span className="text-[10px] font-extrabold text-blue-300 block uppercase tracking-wider">Payroll Insights</span>
              <span className="text-xl font-black text-white mt-1 block">$1.2M Monthly</span>
              <div className="h-16 mt-2 w-full">
                {isLargeScreen && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={payrollData}>
                      <defs>
                        <linearGradient id="barGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                      <Bar dataKey="value" fill="url(#barGlow)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Float Card 4: Avg Salary */}
            <div className="absolute bottom-1 left-4 w-36 rounded-xl bg-white/10 p-3 shadow-xl backdrop-blur-md border border-white/10">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Avg. Salary</span>
              <span className="text-lg font-black text-white block mt-0.5">$85k</span>
              <div className="flex items-end justify-between h-8 mt-1 space-x-1">
                {[4, 8, 5, 7, 9, 8].map((h, i) => (
                  <div key={i} className="flex-1 bg-blue-500/50 rounded-xs" style={{ height: `${h * 10}%` }} />
                ))}
              </div>
            </div>

            {/* Float Card 5: Location Breakdown */}
            <div className="absolute bottom-3 right-0 w-36 rounded-xl bg-white/10 p-3 shadow-xl backdrop-blur-md border border-white/10 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Location</span>
              <div className="flex items-center justify-between mt-2">
                <div className="h-12 w-12">
                  {isLargeScreen && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <PieChart>
                        <Pie data={pieData} innerRadius={12} outerRadius={22} paddingAngle={2} dataKey="value">
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="text-[9px] text-slate-400 font-bold space-y-1">
                  <p className="flex items-center"><span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-1" />USA (42%)</p>
                  <p className="flex items-center"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" />UK (25%)</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer info */}
        <div>
          <p className="text-[11px] font-medium text-slate-500">
            &copy; 2026 HR Flow Technologies, LLC. All rights scheduled.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: PROFESSIONAL HIGH-FIDELITY LOGIN CARD */}
      <div className="flex w-full flex-col justify-center items-center px-6 lg:w-1/2 bg-white dark:bg-slate-900 transition-colors duration-200">
        
        {/* Responsive Brand Header on Mobile/Tablet */}
        <div className="flex items-center space-x-2 py-4 lg:hidden absolute top-6">
          <Compass className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <span className="text-lg font-black tracking-wider text-slate-950 dark:text-white uppercase">HR FLOW</span>
        </div>

        {/* Main Authentication Container */}
        <div className="w-full max-w-md p-2">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Log In to Your Account</h1>
            <p className="text-xs font-semibold text-slate-400 mt-1 dark:text-slate-500">Enterprise Modernity HR &amp; Payroll Hub</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-600 dark:bg-rose-950/20 dark:border-rose-950/40">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 tracking-wide uppercase">Username or Email</label>
              <div className="relative mt-1">
                <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Enter your username or email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-55 pl-10 pr-4 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 dark:focus:bg-slate-900"
                />
              </div>
              <p className="text-[10px] font-semibold text-slate-400 mt-1 dark:text-slate-500">Hint: Use your corporate email account</p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 tracking-wide uppercase">Password</label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); addNotification('Password recovery link sent to your email!', 'info'); }} className="text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400">Forgot password?</a>
              </div>
              <div className="relative mt-1">
                <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Enter your security password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-55 pl-10 pr-4 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 dark:focus:bg-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center space-x-2 rounded-lg bg-blue-600 text-xs font-extrabold text-white shadow-md shadow-blue-500/10 hover:bg-blue-700 transition"
            >
              <span>{loading ? 'Working...' : 'Log In'}</span>
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          {/* Separation Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-y-1/2 left-0 right-0 border-t border-slate-200 dark:border-slate-800" />
            <span className="relative inline-block bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest dark:bg-slate-900">SSO Auths</span>
          </div>

          {/* Social Sign In Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={triggerQuickLogin}
              className="flex h-11 items-center justify-center space-x-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition dark:border-slate-850 dark:bg-slate-850 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.62-.06-1.21-.24-1.61-.59v.05z" strokeWidth="0" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Google Account</span>
            </button>

            <button
              onClick={triggerQuickLogin}
              className="flex h-11 items-center justify-center space-x-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition dark:border-slate-850 dark:bg-slate-850 dark:text-slate-300 dark:hover:bg-slate-850 dark:hover:bg-slate-800"
            >
              <svg className="h-4 w-4" viewBox="0 0 23 23">
                <path fill="#f35022" d="M1 1h10v10H1z"/>
                <path fill="#7fba00" d="M12 1h10v10H12z"/>
                <path fill="#00a4ef" d="M1 12h10v10H1z"/>
                <path fill="#ffb900" d="M12 12h10v10H12z"/>
              </svg>
              <span>Microsoft Account</span>
            </button>
          </div>

          <div className="mt-8 text-center bg-slate-100 border border-slate-150 p-3 rounded-lg dark:bg-slate-850 dark:border-slate-800">
            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">⚡ Pro Dev-Sandbox Tool</p>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Skip typing, use one-click automatic bypass:</p>
            <div className="flex space-x-2 justify-center mt-2">
              <button
                type="button"
                onClick={triggerQuickLogin}
                className="text-[10px] font-bold text-blue-500 bg-blue-50 py-1.5 px-3 rounded border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900 transition animate-pulse"
              >
                Quick HR Login
              </button>
              <button
                type="button"
                onClick={triggerQuickEmployeeLogin}
                className="text-[10px] font-bold text-emerald-500 bg-emerald-50 py-1.5 px-3 rounded border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900 transition"
              >
                Quick Employee Login
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
