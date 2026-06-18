import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHR } from '../../context/HRContext';
import { 
  User, 
  Briefcase, 
  Clock, 
  Calendar, 
  CreditCard, 
  Edit, 
  MessageSquare, 
  ChevronRight, 
  PhoneCall, 
  Heart, 
  Download,
  AlertCircle,
  Award,
  Inbox,
  RefreshCw,
  Camera
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { AvatarComponent } from './Employees';
import { attendanceService } from '../../services/attendanceService';
import { AttendanceRecord } from '../../types';

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    employees, 
    updateEmployee, 
    restoreEmployee, 
    uploadEmployeePhoto, 
    addNotification 
  } = useHR();

  const targetId = id || 'EMP-8829';
  const employee = employees.find(e => e.id === targetId) || employees[0];

  const [activeTab, setActiveTab] = useState<'Personal' | 'Employment' | 'Leave' | 'Attendance' | 'Payroll'>('Personal');
  const [isEditing, setIsEditing] = useState(false);

  // Profile fields state
  const [phone, setPhone] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [office, setOffice] = useState('');
  const [salary, setSalary] = useState(0);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Attendance history and summary state
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Sync state values when employee changes
  useEffect(() => {
    if (employee) {
      setPhone(employee.phone || '');
      setEmailAddress(employee.email || '');
      setOffice(employee.location || '');
      setSalary(employee.salary || 0);
    }
  }, [employee]);

  // Fetch attendance data when active tab is Attendance
  useEffect(() => {
    if (activeTab === 'Attendance' && employee?.id) {
      const fetchAttendanceData = async () => {
        setLoadingAttendance(true);
        try {
          const history = await attendanceService.getAttendanceHistory({ employee_id: employee.id });
          setAttendanceHistory(history);
          
          const now = new Date();
          const summary = await attendanceService.getMonthlySummary({
            employee_id: employee.id,
            year: now.getFullYear(),
            month: now.getMonth() + 1
          });
          if (summary) {
            setAttendanceSummary(summary);
          }
        } catch (error) {
          console.error("Error fetching attendance details for employee:", error);
        } finally {
          setLoadingAttendance(false);
        }
      };
      fetchAttendanceData();
    }
  }, [activeTab, employee?.id]);

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
        <Inbox className="h-10 w-10 text-slate-300 mb-2" />
        <p className="text-sm font-semibold">No employee record loaded</p>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateEmployee(employee.id, {
        phone,
        email: emailAddress,
        location: office,
        salary: Number(salary)
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      addNotification('Failed to update employee details.', 'warning');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addNotification('Image file size cannot exceed 5MB.', 'warning');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'jpg' && ext !== 'jpeg' && ext !== 'png') {
      addNotification('Only JPG, JPEG, and PNG images are allowed.', 'warning');
      return;
    }

    setPhotoUploading(true);
    try {
      await uploadEmployeePhoto(employee.id, file);
    } catch (err) {
      console.error(err);
      addNotification('Error uploading profile picture.', 'warning');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleDownloadPaystub = () => {
    addNotification(`Initiated download for Paystub (${employee.name} - Nov 2026).pdf`, 'success');
  };

  // Sparkline charts
  const sparkline1 = [{ val: 2 }, { val: 4 }, { val: 3 }, { val: 5 }, { val: 6 }, { val: 8 }];
  const sparkline2 = [{ val: 10 }, { val: 15 }, { val: 12 }, { val: 17 }, { val: 15 }, { val: 21 }];
  const sparkline3 = [{ val: 8 }, { val: 7 }, { val: 9 }, { val: 8 }, { val: 8.5 }, { val: 9.3 }];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* PROFILE HEADER CARD */}
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-805 dark:bg-slate-850">
        <div className="h-28 w-full bg-gradient-to-r from-blue-700 via-indigo-800 to-indigo-950 animate-gradient" />
        
        <div className="relative px-6 pb-6 pt-0">
          <div className="flex flex-col items-center sm:flex-row sm:items-end sm:space-x-6 md:justify-between md:items-center">
            
            <div className="relative -mt-14 flex flex-col items-center text-center sm:flex-row sm:items-end sm:text-left">
              <div className="relative group">
                <AvatarComponent emp={employee} className="h-24 w-24 text-2xl" />
                <label className="absolute inset-0 rounded-full bg-black/45 flex flex-col items-center justify-center text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 cursor-pointer transition duration-150">
                  <Camera className="h-4 w-4 mb-0.5" />
                  <span>{photoUploading ? 'Saving...' : 'Upload'}</span>
                  <input 
                    type="file" 
                    onChange={handlePhotoUpload} 
                    accept="image/*"
                    className="hidden" 
                    disabled={photoUploading}
                  />
                </label>
                <span className={`absolute bottom-1 right-2 h-4.5 w-4.5 rounded-full border-3 border-white dark:border-slate-850 ${
                  employee.status === 'ACTIVE' || employee.status === 'REMOTE' ? 'bg-emerald-500' :
                  employee.status === 'ON LEAVE' ? 'bg-amber-500' : 'bg-rose-500'
                }`} />
              </div>
              <div className="mt-4 sm:ml-4 sm:mt-0">
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">{employee.name}</h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-mono">
                    {employee.id}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1 dark:text-slate-400">
                  {employee.role} &bull; <span className="font-bold text-brand-blue dark:text-blue-400">{employee.location}</span>
                </p>
              </div>
            </div>

            {/* Profile actions element */}
            <div className="mt-4 flex space-x-2 md:mt-0">
              {employee.status === 'TERMINATED' || employee.status === 'RESIGNED' ? (
                <button
                  onClick={async () => {
                    if (window.confirm(`Are you sure you want to restore ${employee.name} to active status?`)) {
                      await restoreEmployee(employee.id);
                    }
                  }}
                  className="inline-flex h-9 items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Restore Profile</span>
                </button>
              ) : null}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="inline-flex h-9 items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-55 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </button>
              <button
                onClick={() => addNotification(`Message box opened for conversation with ${employee.name}`, 'info')}
                className="inline-flex h-9 items-center space-x-1.5 rounded-lg bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-700 shadow-sm"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Message</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* DETAILED CONTENT AREA & SIDEBAR */}
      <div className="grid gap-6 lg:grid-cols-4">
        
        {/* Left Column Tabs menu Navigation */}
        <div className="space-y-1.5">
          {[
            { id: 'Personal', label: 'Personal Information', icon: User },
            { id: 'Employment', label: 'Employment Details', icon: Briefcase },
            { id: 'Attendance', label: 'Attendance Records', icon: Clock },
            { id: 'Leave', label: 'Leave & Absences', icon: Calendar },
            { id: 'Payroll', label: 'Payroll & Salary', icon: CreditCard }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-xs font-bold tracking-wide transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white font-extrabold shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-300 dark:hover:bg-slate-800 border border-transparent dark:border-slate-800/40'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </button>
          ))}
        </div>

        {/* MIDDLE CORE METRICS & FORMS (2 COLUMNS) */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* TAB 1: PERSONAL DETAILS */}
          {activeTab === 'Personal' && (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-50 dark:border-slate-800">
                Personal Information Details
              </h3>
              
              {/* Termination / Resignation details alert */}
              {(employee.status === 'TERMINATED' || employee.status === 'RESIGNED') && (
                <div className="rounded-lg bg-rose-50/35 border border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/40 p-4 text-xs">
                  <p className="font-extrabold uppercase text-[9px] text-rose-600 dark:text-rose-400 tracking-wider flex items-center space-x-1.5">
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                    <span>Termination details ({employee.status})</span>
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 mt-2 font-semibold">
                    <p><strong className="text-slate-500">Date:</strong> {employee.termination_date || 'N/A'}</p>
                    <p><strong className="text-slate-500">Reason:</strong> {employee.termination_reason || 'N/A'}</p>
                    <p className="col-span-2"><strong className="text-slate-500">Notes:</strong> {employee.termination_notes || 'No notes logged.'}</p>
                  </div>
                </div>
              )}

              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Mobile Phone Number</label>
                    <input
                      type="text"
                      className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                    <input
                      type="email"
                      className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Operating Office Location</label>
                    <input
                      type="text"
                      className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                      value={office}
                      onChange={(e) => setOffice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Salary (INR)</label>
                    <input
                      type="number"
                      placeholder="e.g. 600000"
                      className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                      value={salary}
                      onChange={(e) => setSalary(Number(e.target.value))}
                    />
                  </div>
                  
                  <div className="flex space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 rounded border border-slate-200 py-2 text-xs font-bold text-slate-700"
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 rounded py-2 text-xs font-extrabold text-white"
                    >
                      Save Profile
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: 'Full Personal Name', val: employee.name },
                    { label: 'Corporate Email', val: employee.email },
                    { label: 'Registered Mobile', val: employee.phone || '(555) 123-5678' },
                    { label: 'Operating Location', val: employee.location },
                    { label: 'Emergency Contact', val: employee.personalInfo.emergencyContact },
                    { label: 'Covered Health Plans', val: employee.personalInfo.healthBenefits },
                    { label: 'Product Status Code', val: employee.personalInfo.productStatus }
                  ].map((field, index) => (
                    <div key={index} className="space-y-1">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{field.label}</span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{field.val}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EMPLOYMENT DETAILS */}
          {activeTab === 'Employment' && (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-50 dark:border-slate-800">
                Employment Configuration details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Position &amp; Role Title</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{employee.role}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Department classification</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{employee.department}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Immediate reporting manager</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{employee.manager}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Commencement join Date</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{employee.joinDate}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Employment Status</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase mt-1 ${
                    employee.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                      : employee.status === 'ON LEAVE'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                      : employee.status === 'PROBATION'
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400'
                      : employee.status === 'SUSPENDED'
                      ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
                      : employee.status === 'RESIGNED'
                      ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      : employee.status === 'REMOTE'
                      ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                  }`}>
                    {employee.status}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Annual Salary (INR)</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">₹{employee.salary.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Corporate Employment type</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Active Full-Time Specialist</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ATTENDANCE HIGHLIGHTS */}
          {activeTab === 'Attendance' && (() => {
            const totalDays = attendanceSummary?.total_days ?? 0;
            const presentDays = (attendanceSummary?.Present ?? 0) + (attendanceSummary?.Late ?? 0) + (attendanceSummary?.['Half Day'] ?? 0);
            const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 1000) / 10 : employee.metrics.attendanceRate;

            const attendanceTrendData = attendanceHistory.length > 0
              ? [...attendanceHistory].reverse().slice(-6).map(r => {
                  let hrs = 0;
                  if (r.workHours && r.workHours !== '-') {
                    const match = r.workHours.match(/(\d+)h\s*(\d+)m/);
                    if (match) {
                      hrs = parseInt(match[1]) + (parseInt(match[2]) / 60.0);
                    }
                  }
                  return { val: hrs };
                })
              : sparkline2;

            return (
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850 space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-50 dark:border-slate-800">
                  Attendance Trends summary
                </h3>
                
                {loadingAttendance ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-2">
                    <RefreshCw className="h-6 w-6 text-blue-500 animate-spin" />
                    <span className="text-xs font-semibold text-slate-500">Loading live attendance records...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800/40">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Avg Attendance Rate</p>
                        <p className="text-xl font-black text-slate-800 dark:text-white mt-1">{attendanceRate}%</p>
                      </div>
                      <div className="h-10 w-24">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <AreaChart data={attendanceTrendData}>
                            <Area type="monotone" dataKey="val" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-350">Historical Attendance points</p>
                      <div className="mt-2 space-y-2 text-xs font-semibold">
                        <div className="flex justify-between border-b border-slate-50 pb-1.5 last:border-0 dark:border-slate-800">
                          <span className="text-slate-400">Present (Normal)</span>
                          <span className="text-slate-700 dark:text-slate-200">{attendanceSummary?.Present ?? 0} sessions</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5 last:border-0 dark:border-slate-800">
                          <span className="text-slate-400">Late Arrivals</span>
                          <span className="text-slate-700 dark:text-slate-200">{attendanceSummary?.Late ?? 0} sessions</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5 last:border-0 dark:border-slate-800">
                          <span className="text-slate-400">Half Day</span>
                          <span className="text-slate-700 dark:text-slate-200">{attendanceSummary?.['Half Day'] ?? 0} sessions</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5 last:border-0 dark:border-slate-800">
                          <span className="text-slate-400">Approved Leaves</span>
                          <span className="text-slate-700 dark:text-slate-200">{attendanceSummary?.Leave ?? 0} sessions</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5 last:border-0 dark:border-slate-800">
                          <span className="text-slate-400">Absences</span>
                          <span className="text-slate-700 dark:text-slate-200">{attendanceSummary?.Absent ?? 0} sessions</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5 last:border-0 dark:border-slate-800">
                          <span className="text-slate-400">Total Hours Worked</span>
                          <span className="text-slate-700 dark:text-slate-200">{attendanceSummary?.total_hours_worked ?? 0} hrs</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5 last:border-0 dark:border-slate-800">
                          <span className="text-slate-450 font-extrabold text-blue-600 dark:text-blue-400">Overtime Worked</span>
                          <span className="text-slate-705 dark:text-slate-200 font-extrabold">{attendanceSummary?.total_overtime ?? 0} hrs</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* TAB 4: LEAVE MATRIX */}
          {activeTab === 'Leave' && (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-50 dark:border-slate-800">
                Leave Balance allocation
              </h3>
              
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800/40">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Remaining Leave days</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white mt-1">{employee.metrics.leaveBalance} Days</p>
                </div>
                <div className="h-10 w-24">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={sparkline3}>
                      <Area type="monotone" dataKey="val" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PAYROLL INFORMATION */}
          {activeTab === 'Payroll' && (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-50 dark:border-slate-800">
                Payroll and direct deposit
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg dark:bg-slate-800/40">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Corporate Salary</span>
                    <span className="text-lg font-black text-slate-800 dark:text-white">₹{employee.salary.toLocaleString('en-IN')} / Annually</span>
                  </div>
                  <Download className="h-5 w-5 text-blue-500 cursor-pointer" onClick={handleDownloadPaystub} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 text-xs font-semibold">
                  <div>
                    <span className="text-slate-400">Payment Schedule</span>
                    <p className="text-slate-800 dark:text-slate-200">Semi-monthly (15th and 30th)</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Direct Deposit target</span>
                    <p className="text-slate-800 dark:text-slate-200">Chase Bank Checkings (*8821)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* THREE GRAPHIC MINI-SPARKLINES */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Hired Date Track', labelVal: employee.joinDate, data: sparkline1, color: '#3b82f6' },
              { label: 'Avg Attendance', labelVal: `${employee.metrics.attendanceRate}%`, data: sparkline2, color: '#10b981' },
              { label: 'Leave Balance', labelVal: `${employee.metrics.leaveBalance} Days`, data: sparkline3, color: '#f59e0b' }
            ].map((metric, idx) => (
              <div key={idx} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">{metric.label}</span>
                <span className="text-sm font-black text-slate-850 dark:text-white mt-0.5 block">{metric.labelVal}</span>
                <div className="h-10 mt-2">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={metric.data}>
                      <Area type="monotone" dataKey="val" stroke={metric.color} fill={metric.color} fillOpacity={0.06} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>

          {/* CAREER TIMELINE */}
          {employee.journey && employee.journey.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-50 dark:border-slate-800">
                Career Journey Timeline
              </h3>
              <div className="relative pl-6 space-y-5 before:absolute before:top-1 before:bottom-1 before:left-2 before:w-0.5 before:bg-slate-150 dark:before:bg-slate-800">
                
                {employee.journey.map((milestone) => (
                  <div key={milestone.id} className="relative">
                    <span className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-600 dark:border-slate-850" />
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400">{milestone.date}</span>
                      <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5 mt-0.5">
                        {milestone.type === 'AWARD' && <Award className="h-3 w-3 text-amber-500" />}
                        <span>{milestone.title}</span>
                      </p>
                      <p className="text-[10px] text-slate-550 dark:text-slate-400 leading-tight mt-0.5">{milestone.description}</p>
                    </div>
                  </div>
                ))}

              </div>
            </div>
          )}

        </div>

        {/* RIGHT SIDEBAR: REPORTING STRUCTURE & ACTIONS PANEL */}
        <div className="space-y-6">
          
          {/* Organisation Structure Card */}
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-50 dark:border-slate-800">
              Reporting Structure
            </h4>
            
            <div className="space-y-4 text-xs font-bold font-sans">
              
              {/* Boss / Manager */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800 flex items-center space-x-3">
                <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150" alt="Marcus" className="h-8 w-8 rounded-full object-cover" />
                <div>
                  <p className="text-slate-850 dark:text-white leading-tight">Marcus Sterling</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">VP of Technology</p>
                </div>
              </div>

              {/* Direct Path line connector */}
              <div className="flex justify-center h-4">
                <div className="w-0.5 bg-dashed bg-slate-300 dark:bg-slate-700 h-full" />
              </div>

              {/* Active Employee */}
              <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 flex items-center space-x-3 dark:bg-blue-950/20 dark:border-blue-950/40">
                <AvatarComponent emp={employee} className="h-8 w-8 text-xs" />
                <div>
                  <p className="text-slate-850 dark:text-sky-300 leading-tight">{employee.name}</p>
                  <p className="text-[10px] text-brand-blue dark:text-blue-400 font-extrabold">{employee.role}</p>
                </div>
              </div>

              {/* Direct Path line connector */}
              <div className="flex justify-center h-4">
                <div className="w-0.5 bg-dashed bg-slate-300 dark:bg-slate-700 h-full" />
              </div>

              {/* Direct Reports */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800 flex items-center space-x-3">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" alt="Mavos" className="h-8 w-8 rounded-full object-cover" />
                <div>
                  <p className="text-slate-850 dark:text-white leading-tight">Mavos Sterling</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Junior UI Designer</p>
                </div>
              </div>

            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850 space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-50 dark:border-slate-800">
              Employee Quick Actions
            </h4>
            
            <button
              onClick={handleDownloadPaystub}
              className="flex w-full items-center justify-between rounded-lg bg-slate-50/60 p-3 hover:bg-slate-100/80 text-xs font-extrabold transition dark:bg-slate-800/40 dark:hover:bg-slate-800 animate-in fade-in"
            >
              <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                <Download className="h-4 w-4 text-blue-500" />
                <span>Download Paystub</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-450" />
            </button>

            <button
              onClick={() => addNotification(`Emergency contacts for ${employee.name} displayed.`, 'info')}
              className="flex w-full items-center justify-between rounded-lg bg-slate-50/60 p-3 hover:bg-slate-100/80 text-xs font-extrabold transition dark:bg-slate-800/40 dark:hover:bg-slate-800"
            >
              <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                <PhoneCall className="h-4 w-4 text-emerald-500" />
                <span>Emergency Contact</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-450" />
            </button>

            <button
              onClick={() => addNotification(`Active benefits package for ${employee.name} loaded.`, 'info')}
              className="flex w-full items-center justify-between rounded-lg bg-slate-50/60 p-3 hover:bg-slate-100/80 text-xs font-extrabold transition dark:bg-slate-800/40 dark:hover:bg-slate-800"
            >
              <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                <Heart className="h-4 w-4 text-rose-500" />
                <span>Health Insurance</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-450" />
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}
