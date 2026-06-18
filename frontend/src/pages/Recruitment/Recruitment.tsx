import React, { useState, useEffect, useRef } from 'react';
import { useHR } from '../../context/HRContext';
import { recruitmentService } from '../../services/recruitmentService';
import { 
  Plus, 
  Users, 
  Briefcase, 
  Trash2,
  X,
  ArrowRight,
  ShieldAlert,
  Calendar,
  UserCheck,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  Edit,
  ClipboardList,
  Upload
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { RecruitmentCandidate } from '../../types';

export default function Recruitment() {
  const { user, addNotification } = useHR();

  // Role Protection
  const isHR = user?.role === 'HR' || user?.role === 'ADMIN';

  if (!isHR) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-4 animate-bounce">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white uppercase tracking-widest">Access Denied</h2>
        <p className="text-xs font-semibold text-slate-450 mt-1 max-w-sm leading-relaxed">
          The Recruitment board is restricted to Human Resources and administrative accounts. Please contact your system administrator if you require authorization.
        </p>
      </div>
    );
  }

  // Active Tab
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Jobs' | 'Candidates' | 'Interviews'>('Dashboard');

  // Backend Data
  const [jobs, setJobs] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<RecruitmentCandidate[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [reports, setReports] = useState<any>({ total_jobs: 0, total_candidates: 0, shortlisted_count: 0, hired_count: 0, rejected_count: 0 });
  const [analytics, setAnalytics] = useState<any>({ funnel: [], department_stats: [] });

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);

  // Modals state
  const [showJobModal, setShowJobModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);

  // Edit states
  const [editingJob, setEditingJob] = useState<any>(null);
  const [editingCandidate, setEditingCandidate] = useState<any>(null);
  const [editingInterview, setEditingInterview] = useState<any>(null);

  // Form Fields
  // 1. Job
  const [jobTitle, setJobTitle] = useState('');
  const [jobDept, setJobDept] = useState('Engineering');
  const [jobStatus, setJobStatus] = useState('ACTIVE');
  const [jobDesc, setJobDesc] = useState('');

  // 2. Candidate
  const [candFirstName, setCandFirstName] = useState('');
  const [candLastName, setCandLastName] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [candJobId, setCandJobId] = useState('');
  const [candExp, setCandExp] = useState(3);
  const [candStage, setCandStage] = useState('APPLIED');
  const [candSkills, setCandSkills] = useState('');
  const [candResume, setCandResume] = useState<File | null>(null);

  // 3. Interview
  const [intCandId, setIntCandId] = useState('');
  const [intDate, setIntDate] = useState('');
  const [intInterviewerId, setIntInterviewerId] = useState('1'); // fallback superuser
  const [intFeedback, setIntFeedback] = useState('');
  const [intStatus, setIntStatus] = useState('SCHEDULED');

  const [isLoading, setIsLoading] = useState(true);

  // Fetch data on tab change
  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'Dashboard') {
        const rep = await recruitmentService.getRecruitmentReports();
        const anal = await recruitmentService.getRecruitmentAnalytics();
        if (rep) setReports(rep);
        if (anal) setAnalytics(anal);
      } else if (activeTab === 'Jobs') {
        const data = await recruitmentService.getJobs();
        setJobs(data);
      } else if (activeTab === 'Candidates') {
        const data = await recruitmentService.getCandidates();
        setCandidates(data);
        const jList = await recruitmentService.getJobs();
        setJobs(jList);
      } else if (activeTab === 'Interviews') {
        const data = await recruitmentService.getInterviews();
        setInterviews(data);
        const cList = await recruitmentService.getCandidates();
        setCandidates(cList);
      }
    } catch (err) {
      console.error(err);
      addNotification('Error loading recruitment data.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setPage(1); // Reset page on tab shift
  }, [activeTab]);

  // Job opening handler (Create/Update)
  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle) return;

    const payload = {
      title: jobTitle,
      department_name: jobDept,
      status: jobStatus,
      description: jobDesc
    };

    setIsLoading(true);
    try {
      if (editingJob) {
        await recruitmentService.updateJob(editingJob.id, payload);
        addNotification('Job opening updated successfully.', 'success');
      } else {
        await recruitmentService.createJob(payload);
        addNotification('Job opening created successfully.', 'success');
      }
      setShowJobModal(false);
      setEditingJob(null);
      loadData();
    } catch (err) {
      console.error(err);
      addNotification('Failed to save job details.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  // Job delete handler
  const handleDeleteJob = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this job opening?')) return;
    setIsLoading(true);
    try {
      const success = await recruitmentService.deleteJob(id);
      if (success) {
        addNotification('Job opening deleted successfully.', 'success');
        loadData();
      } else {
        addNotification('Failed to delete job.', 'warning');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Candidate handler (Create/Update with multipart resume support)
  const handleCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candFirstName || !candEmail || !candJobId) return;

    const formData = new FormData();
    formData.append('first_name', candFirstName);
    formData.append('last_name', candLastName);
    formData.append('email', candEmail);
    formData.append('phone', candPhone);
    formData.append('job', candJobId);
    formData.append('experience_years', candExp.toString());
    formData.append('stage', candStage);
    formData.append('skills', candSkills);
    if (candResume) {
      formData.append('resume', candResume);
    }

    setIsLoading(true);
    try {
      if (editingCandidate) {
        await recruitmentService.updateCandidate(Number(editingCandidate.id), formData);
        addNotification('Candidate profile updated successfully.', 'success');
      } else {
        await recruitmentService.createCandidate(formData);
        addNotification('Candidate registered successfully.', 'success');
      }
      setShowCandidateModal(false);
      setEditingCandidate(null);
      setCandResume(null);
      loadData();
    } catch (err) {
      console.error(err);
      addNotification('Failed to save candidate details.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  // Candidate delete handler
  const handleDeleteCandidate = async (id: string) => {
    if (!window.confirm('Are you sure you want to reject and remove this candidate?')) return;
    setIsLoading(true);
    try {
      const success = await recruitmentService.deleteCandidate(id);
      if (success) {
        addNotification('Candidate removed from board.', 'success');
        loadData();
      } else {
        addNotification('Failed to remove candidate.', 'warning');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Interview handler (Schedule/Reschedule)
  const handleInterviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intCandId || !intDate) return;

    const payload = {
      candidate: Number(intCandId),
      interview_date: intDate,
      interviewer: Number(intInterviewerId),
      feedback: intFeedback,
      status: intStatus
    };

    setIsLoading(true);
    try {
      if (editingInterview) {
        await recruitmentService.updateInterview(editingInterview.id, payload);
        addNotification('Interview session rescheduled successfully.', 'success');
      } else {
        await recruitmentService.scheduleInterview(Number(intCandId), intDate, Number(intInterviewerId));
        addNotification('Interview scheduled successfully.', 'success');
      }
      setShowInterviewModal(false);
      setEditingInterview(null);
      loadData();
    } catch (err) {
      console.error(err);
      addNotification('Failed to schedule interview.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  // Interview delete (Cancel) handler
  const handleCancelInterview = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled interview?')) return;
    setIsLoading(true);
    try {
      const success = await recruitmentService.deleteInterview(id);
      if (success) {
        addNotification('Interview cancelled.', 'success');
        loadData();
      } else {
        addNotification('Failed to cancel interview.', 'warning');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filters mapping
  const filteredJobs = jobs.filter(j => {
    const matchesSearch = searchQuery === '' || j.title.toLowerCase().includes(searchQuery.toLowerCase()) || (j.department_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = searchQuery === '' || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredInterviews = interviews.filter(i => {
    const matchesSearch = searchQuery === '' || (i.candidate_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (i.interviewer_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Client-side pagination bounds
  const startIndex = (page - 1) * pageSize;
  const paginatedJobs = filteredJobs.slice(startIndex, startIndex + pageSize);
  const paginatedCandidates = filteredCandidates.slice(startIndex, startIndex + pageSize);
  const paginatedInterviews = filteredInterviews.slice(startIndex, startIndex + pageSize);

  // Conversion Funnel Data formatting
  const funnelChartData = React.useMemo(() => {
    if (!analytics.funnel) return [];
    return Object.entries(analytics.funnel).map(([stage, val]) => ({
      stage: stage.replace('_', ' '),
      count: val
    }));
  }, [analytics]);

  const deptChartData = React.useMemo(() => {
    if (!analytics.department_stats) return [];
    return Object.entries(analytics.department_stats).map(([dept, val]) => ({
      name: dept,
      Count: val
    }));
  }, [analytics]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col justify-between space-y-3 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-2xl">Recruitment Board</h1>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Corporate intelligence grids, vacancy funnels, and candidate ledger</p>
        </div>

        <div className="flex space-x-2">
          {activeTab === 'Jobs' && (
            <button
              onClick={() => {
                setEditingJob(null);
                setJobTitle('');
                setJobDept('Engineering');
                setJobStatus('ACTIVE');
                setJobDesc('');
                setShowJobModal(true);
              }}
              className="inline-flex h-9 items-center space-x-1.5 rounded-lg bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-700 shadow shadow-blue-500/10 transition active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Create Vacancy Role</span>
            </button>
          )}

          {activeTab === 'Candidates' && (
            <button
              onClick={() => {
                setEditingCandidate(null);
                setCandFirstName('');
                setCandLastName('');
                setCandEmail('');
                setCandPhone('');
                if (jobs.length > 0) setCandJobId(jobs[0].id);
                setCandExp(3);
                setCandStage('APPLIED');
                setCandSkills('');
                setCandResume(null);
                setShowCandidateModal(true);
              }}
              className="inline-flex h-9 items-center space-x-1.5 rounded-lg bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-700 shadow shadow-blue-500/10 transition active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Register Candidate</span>
            </button>
          )}

          {activeTab === 'Interviews' && (
            <button
              onClick={() => {
                setEditingInterview(null);
                if (candidates.length > 0) setIntCandId(candidates[0].id);
                setIntDate('');
                setIntFeedback('');
                setIntStatus('SCHEDULED');
                setShowInterviewModal(true);
              }}
              className="inline-flex h-9 items-center space-x-1.5 rounded-lg bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-700 shadow shadow-blue-500/10 transition active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Schedule Interview Round</span>
            </button>
          )}
        </div>
      </div>

      {/* DYNAMIC PIPELINE DASHBOARD STATS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Open Positions</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-slate-950 dark:text-white">{reports.total_jobs}</span>
              <span className="text-[10px] font-bold text-emerald-500">Active</span>
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40">
            <Briefcase className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Applications</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-slate-950 dark:text-white">{reports.total_candidates}</span>
              <span className="text-[10px] font-bold text-blue-500">Profiles</span>
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40">
            <Users className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Shortlisted</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-slate-950 dark:text-white">{reports.shortlisted_count}</span>
              <span className="text-[10px] font-bold text-amber-500">Pending Rounds</span>
            </div>
          </div>
          <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/40">
            <ClipboardList className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Offers Hired</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-slate-950 dark:text-white">{reports.hired_count}</span>
              <span className="text-[10px] font-bold text-emerald-500">Onboarded</span>
            </div>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/40">
            <UserCheck className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Rejected</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-slate-950 dark:text-white">{reports.rejected_count}</span>
              <span className="text-[10px] font-semibold text-rose-500">Archived</span>
            </div>
          </div>
          <div className="rounded-lg bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/40">
            <X className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* TABS SELECT BAR */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 pb-px">
        {[
          { id: 'Dashboard', label: 'Pipeline Analytics' },
          { id: 'Jobs', label: 'Job Openings' },
          { id: 'Candidates', label: 'Candidates Ledger' },
          { id: 'Interviews', label: 'Interviews Schedule' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`pb-2.5 px-4 text-xs font-bold transition-all relative ${
              activeTab === t.id
                ? 'text-blue-500 font-extrabold border-b-2 border-blue-500'
                : 'text-slate-550 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SEARCH AND FILTERS */}
      {activeTab !== 'Dashboard' && (
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-805 dark:bg-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'Jobs' ? 'Search jobs or department...' :
                activeTab === 'Candidates' ? 'Search candidates or applied role...' :
                'Search interviews by candidate or interviewer...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8.5 rounded-md border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="All">All Statuses</option>
              {activeTab === 'Jobs' && (
                <>
                  <option value="ACTIVE">Active</option>
                  <option value="CLOSED">Closed</option>
                </>
              )}
              {activeTab === 'Candidates' && (
                <>
                  <option value="APPLIED">Applied</option>
                  <option value="SCREENING">Screening</option>
                  <option value="INTERVIEW">Interviewing</option>
                  <option value="SHORTLISTED">Shortlisted</option>
                  <option value="OFFERED">Offer Made</option>
                  <option value="HIRED">Hired</option>
                </>
              )}
              {activeTab === 'Interviews' && (
                <>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </>
              )}
            </select>
          </div>
        </div>
      )}

      {/* CORE CONTENT LAYOUT SWITCH */}
      <div className="space-y-4">
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'Dashboard' && (
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Conversion Funnel drops chart */}
            {funnelChartData.length > 0 ? (
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850 space-y-4">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Recruitment Conversion Funnel</h3>
                  <p className="text-[10px] text-slate-400">Yield drop rate of candidate profiles</p>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <XAxis dataKey="stage" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ fontSize: '10px' }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850 flex items-center justify-center text-xs text-slate-450 h-56">
                <span>No funnel data available yet.</span>
              </div>
            )}

            {/* Department Breakdown */}
            {deptChartData.length > 0 ? (
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850 space-y-4">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Applications by Department</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Active department hiring needs distribution</p>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={deptChartData}>
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="Count" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-805 dark:bg-slate-850 flex items-center justify-center text-xs text-slate-450 h-56">
                <span>No department-wise metrics logged yet.</span>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: JOBS */}
        {activeTab === 'Jobs' && (
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-805 dark:bg-slate-850">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                    <th className="px-6 py-3.5">Job Title</th>
                    <th className="px-6 py-3.5">Department</th>
                    <th className="px-6 py-3.5">Description</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold dark:divide-slate-800/40">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">Synchronizing job listings...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedJobs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-405">
                        <div className="flex flex-col items-center justify-center space-y-2 py-4">
                          <Briefcase className="h-8 w-8 text-slate-350 animate-pulse" />
                          <span className="font-bold text-xs text-slate-850 dark:text-slate-300">No job roles found</span>
                          <span className="text-[10px] text-slate-450 max-w-xs leading-normal">
                            Create a new role opening using the trigger button at the top.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="px-6 py-3.5 text-slate-900 dark:text-white font-extrabold">{job.title}</td>
                        <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400">{job.department_name}</td>
                        <td className="px-6 py-3.5 text-slate-400 dark:text-slate-500 font-medium truncate max-w-xs">{job.description}</td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                            job.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              setEditingJob(job);
                              setJobTitle(job.title);
                              setJobDept(job.department_name);
                              setJobStatus(job.status);
                              setJobDesc(job.description);
                              setShowJobModal(true);
                            }}
                            className="rounded p-1 bg-slate-50 hover:bg-slate-100 text-slate-650 dark:bg-slate-800 dark:text-slate-300"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            className="rounded p-1 bg-rose-50 hover:bg-rose-100 text-rose-650 dark:bg-slate-800 dark:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredJobs.length > pageSize && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-3 dark:border-slate-808 dark:bg-slate-850">
                <span className="text-[10px] font-bold text-slate-455 uppercase">
                  Showing {startIndex + 1} - {Math.min(startIndex + pageSize, filteredJobs.length)} of {filteredJobs.length} openings
                </span>
                <div className="flex space-x-1">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-505 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={page * pageSize >= filteredJobs.length}
                    onClick={() => setPage(prev => prev + 1)}
                    className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-505 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CANDIDATES */}
        {activeTab === 'Candidates' && (
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-805 dark:bg-slate-850">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                    <th className="px-6 py-3.5">Candidate Name</th>
                    <th className="px-6 py-3.5">Applied Position</th>
                    <th className="px-6 py-3.5">Skills</th>
                    <th className="px-6 py-3.5">Experience</th>
                    <th className="px-6 py-3.5">Registered Date</th>
                    <th className="px-6 py-3.5">Stage Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold dark:divide-slate-800/40">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">Synchronizing candidate rosters...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2 py-4">
                          <Users className="h-8 w-8 text-slate-350" />
                          <span className="font-bold text-xs text-slate-850 dark:text-slate-305 font-sans">No candidates registered</span>
                          <span className="text-[10px] text-slate-450 max-w-xs leading-normal">
                            No profiles match the filter parameters. Add a candidate using the button at top.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedCandidates.map((cand) => (
                      <tr key={cand.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center space-x-2.5">
                            <img src={cand.avatar} alt="User" className="h-7.5 w-7.5 rounded-full object-cover border border-slate-100 dark:border-slate-808" />
                            <span className="font-extrabold text-slate-850 dark:text-slate-100">{cand.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 dark:text-slate-450">{cand.role}</td>
                        <td className="px-6 py-3.5 text-slate-450 max-w-xs truncate">{cand.tags?.join(', ') || 'React'}</td>
                        <td className="px-6 py-3.5 font-mono text-slate-500">{cand.experience}</td>
                        <td className="px-6 py-3.5 font-mono text-slate-400 text-[11px]">{new Date(cand.appliedDate).toLocaleDateString()}</td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                            cand.status === 'HIRED'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30'
                              : cand.status === 'APPLIED'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30'
                          }`}>
                            {cand.status || cand.stage}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              setEditingCandidate(cand);
                              setCandFirstName(cand.name.split(' ')[0] || '');
                              setCandLastName(cand.name.split(' ').slice(1).join(' ') || '');
                              setCandEmail('');
                              setCandPhone('');
                              const matchedJob = jobs.find(j => j.title.toLowerCase() === cand.role.toLowerCase());
                              setCandJobId(matchedJob ? matchedJob.id : (jobs[0]?.id || ''));
                              setCandExp(3);
                              setCandStage(cand.status || 'APPLIED');
                              setCandSkills(cand.tags?.join(', ') || '');
                              setShowCandidateModal(true);
                            }}
                            className="rounded p-1 bg-slate-50 hover:bg-slate-100 text-slate-650 dark:bg-slate-800 dark:text-slate-305"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCandidate(cand.id)}
                            className="rounded p-1 bg-rose-50 hover:bg-rose-100 text-rose-650 dark:bg-slate-800 dark:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: INTERVIEWS */}
        {activeTab === 'Interviews' && (
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-805 dark:bg-slate-850">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                    <th className="px-6 py-3.5">Candidate</th>
                    <th className="px-6 py-3.5">Interviewer</th>
                    <th className="px-6 py-3.5">Date &amp; Time</th>
                    <th className="px-6 py-3.5">Feedback Notes</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold dark:divide-slate-800/40">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">Synchronizing scheduled loops...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedInterviews.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2 py-4">
                          <Calendar className="h-8 w-8 text-slate-350" />
                          <span className="font-bold text-xs text-slate-850 dark:text-slate-300">No interviews scheduled</span>
                          <span className="text-[10px] text-slate-455 max-w-xs leading-normal">
                            Schedule a new interview round using the trigger button at the top.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedInterviews.map((int) => (
                      <tr key={int.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="px-6 py-3.5 text-slate-900 dark:text-white font-extrabold">{int.candidate_name}</td>
                        <td className="px-6 py-3.5 text-slate-650 dark:text-slate-400">{int.interviewer_name || 'HR Manager'}</td>
                        <td className="px-6 py-3.5 font-mono text-slate-500">{new Date(int.interview_date).toLocaleString()}</td>
                        <td className="px-6 py-3.5 text-slate-400 max-w-xs truncate">{int.feedback || 'Pending feedback...'}</td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                            int.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30'
                              : int.status === 'SCHEDULED'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30'
                          }`}>
                            {int.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              setEditingInterview(int);
                              setIntCandId(int.candidate || '');
                              setIntDate(new Date(int.interview_date).toISOString().slice(0, 16));
                              setIntInterviewerId(int.interviewer || '1');
                              setIntFeedback(int.feedback || '');
                              setIntStatus(int.status);
                              setShowInterviewModal(true);
                            }}
                            className="rounded p-1 bg-slate-50 hover:bg-slate-100 text-slate-650 dark:bg-slate-800 dark:text-slate-300"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleCancelInterview(int.id)}
                            className="rounded p-1 bg-rose-50 hover:bg-rose-100 text-rose-650 dark:bg-slate-800 dark:text-rose-450"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* MODAL: Create/Update Job Opening */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                {editingJob ? 'Update Vacancy Details' : 'Create Vacancy Role'}
              </h3>
              <button onClick={() => setShowJobModal(false)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleJobSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Position Role Title *</label>
                <input
                  required
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Staff Backend Engineer"
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Department</label>
                  <select
                    value={jobDept}
                    onChange={(e) => setJobDept(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-850 dark:border-slate-800"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="HR">Human Resources</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Pipeline Status</label>
                  <select
                    value={jobStatus}
                    onChange={(e) => setJobStatus(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-850 dark:border-slate-800"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Description</label>
                <textarea
                  rows={4}
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  placeholder="Responsibilities and structural specifications..."
                  className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-850 dark:border-slate-800"
                />
              </div>

              <div className="pt-2 flex space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
                  className="flex-1 border border-slate-200 rounded-lg py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-blue-700 active:scale-[0.98]"
                >
                  Save Opening
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: Register Candidate */}
      {showCandidateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                {editingCandidate ? 'Update Profile details' : 'Register Candidate'}
              </h3>
              <button onClick={() => setShowCandidateModal(false)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCandidateSubmit} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">First Name *</label>
                  <input
                    required
                    type="text"
                    value={candFirstName}
                    onChange={(e) => setCandFirstName(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Last Name</label>
                  <input
                    type="text"
                    value={candLastName}
                    onChange={(e) => setCandLastName(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Email Address *</label>
                <input
                  required
                  type="email"
                  value={candEmail}
                  onChange={(e) => setCandEmail(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Mobile Phone</label>
                  <input
                    type="text"
                    value={candPhone}
                    onChange={(e) => setCandPhone(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Experience Years</label>
                  <input
                    type="number"
                    value={candExp}
                    onChange={(e) => setCandExp(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Target Role Opening *</label>
                  <select
                    value={candJobId}
                    onChange={(e) => setCandJobId(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-855 dark:border-slate-800"
                  >
                    <option value="">Select vacancy role...</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>{j.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Stage Status</label>
                  <select
                    value={candStage}
                    onChange={(e) => setCandStage(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-855 dark:border-slate-800"
                  >
                    <option value="APPLIED">Applied</option>
                    <option value="SCREENING">Screening</option>
                    <option value="INTERVIEW">Interviewing</option>
                    <option value="SHORTLISTED">Shortlisted</option>
                    <option value="OFFERED">Offer Made</option>
                    <option value="HIRED">Hired</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Skills Keywords</label>
                <input
                  type="text"
                  value={candSkills}
                  onChange={(e) => setCandSkills(e.target.value)}
                  placeholder="e.g. Django, React, AWS, Python"
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-850 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Attach Resume PDF *</label>
                <div className="mt-1 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-md p-4 bg-slate-50 hover:bg-slate-100 cursor-pointer dark:border-slate-800">
                  <label className="flex flex-col items-center space-y-1.5 cursor-pointer">
                    <Upload className="h-6 w-6 text-slate-400" />
                    <span className="text-xs text-slate-500 font-bold">
                      {candResume ? candResume.name : 'Upload Resume File'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setCandResume(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-2 flex space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowCandidateModal(false)}
                  className="flex-1 border border-slate-200 rounded-lg py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-blue-700 active:scale-[0.98]"
                >
                  Save Profile
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: Schedule Interview Round */}
      {showInterviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                {editingInterview ? 'Update Session parameters' : 'Schedule Interview Round'}
              </h3>
              <button onClick={() => setShowInterviewModal(false)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleInterviewSubmit} className="mt-4 space-y-4">
              
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Select Candidate Claimant</label>
                <select
                  disabled={!!editingInterview}
                  value={intCandId}
                  onChange={(e) => setIntCandId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-855 dark:border-slate-800"
                >
                  <option value="">Select candidate...</option>
                  {candidates.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Scheduled Date &amp; Time *</label>
                <input
                  required
                  type="datetime-local"
                  value={intDate}
                  onChange={(e) => setIntDate(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-850 dark:border-slate-800"
                />
              </div>

              {editingInterview && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Feedback Reviews</label>
                    <textarea
                      rows={3}
                      value={intFeedback}
                      onChange={(e) => setIntFeedback(e.target.value)}
                      placeholder="Write evaluation ratings or feedback details..."
                      className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-850 dark:border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Round Status</label>
                    <select
                      value={intStatus}
                      onChange={(e) => setIntStatus(e.target.value)}
                      className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-855 dark:border-slate-800"
                    >
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </>
              )}

              <div className="pt-2 flex space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowInterviewModal(false)}
                  className="flex-1 border border-slate-200 rounded-lg py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-blue-700 active:scale-[0.98]"
                >
                  Schedule Round
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
