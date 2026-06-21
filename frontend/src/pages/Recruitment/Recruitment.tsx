import React, { useState, useEffect, useRef } from 'react';
import { useHR } from '../../context/HRContext';
import { recruitmentService } from '../../services/recruitmentService';
import { employeeService } from '../../services/employeeService';
import { 
  Plus, 
  Users, 
  Briefcase, 
  Trash2,
  X,
  ShieldAlert,
  Calendar,
  UserCheck,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  Edit,
  ClipboardList,
  Upload,
  UserPlus,
  Compass,
  DollarSign
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { RecruitmentCandidate } from '../../types';
import { useNavigate } from 'react-router-dom';

const CandidateAvatar = ({ name, className = "h-8 w-8 text-xs font-bold" }: { name: string, className?: string }) => {
  const initials = name.trim().split(' ').map(p => p[0] || '').join('').toUpperCase().slice(0, 2) || 'CD';
  return (
    <div className={`${className} rounded-full flex items-center justify-center bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 border border-blue-200 dark:border-blue-800 shadow-sm`}>
      {initials}
    </div>
  );
};

export default function Recruitment() {
  const { user, addNotification } = useHR();
  const navigate = useNavigate();

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
  const [candidateViewMode, setCandidateViewMode] = useState<'list' | 'pipeline'>('pipeline');

  // Backend Data
  const [jobs, setJobs] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<RecruitmentCandidate[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [reports, setReports] = useState<any>({ total_jobs: 0, total_candidates: 0, shortlisted_count: 0, hired_count: 0, rejected_count: 0 });
  const [analytics, setAnalytics] = useState<any>({
    open_vacancies: 0,
    total_candidates: 0,
    interviews_today: 0,
    selected_candidates: 0,
    rejected_candidates: 0,
    source_distribution: [],
    funnel: [],
    hiring_trend: [],
    interview_success_rate: 75.0
  });

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

  // Metadata States
  const [dbDepartments, setDbDepartments] = useState<any[]>([]);
  const [dbDesignations, setDbDesignations] = useState<any[]>([]);
  const [hrStaff, setHrStaff] = useState<any[]>([]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [depts, desigs, hrs] = await Promise.all([
          employeeService.getDepartments(),
          employeeService.getDesignations(),
          employeeService.getHRStaff()
        ]);
        setDbDepartments(depts);
        setDbDesignations(desigs);
        setHrStaff(hrs.filter((h: any) => h.is_active));
      } catch (err) {
        console.error('Failed to load metadata in recruitment:', err);
      }
    };
    fetchMetadata();
  }, []);

  // Form Fields
  // 1. Job
  const [jobTitle, setJobTitle] = useState('');
  const [jobDeptId, setJobDeptId] = useState('');
  const [jobDesignationId, setJobDesignationId] = useState('');
  const [jobEmpType, setJobEmpType] = useState('Full-Time');
  const [jobLoc, setJobLoc] = useState('');
  const [jobExpReq, setJobExpReq] = useState('');
  const [jobSalaryRange, setJobSalaryRange] = useState('');
  const [jobVacancies, setJobVacancies] = useState(1);
  const [jobSkills, setJobSkills] = useState('');
  const [jobClosingDate, setJobClosingDate] = useState('');
  const [jobHiringManager, setJobHiringManager] = useState('');
  const [jobStatus, setJobStatus] = useState('Open'); // choices: Draft, Open, Closed, On Hold
  const [jobDesc, setJobDesc] = useState('');

  // 2. Candidate
  const [candFirstName, setCandFirstName] = useState('');
  const [candLastName, setCandLastName] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [candAddress, setCandAddress] = useState('');
  const [candEducation, setCandEducation] = useState('');
  const [candExperience, setCandExperience] = useState('3+ Years');
  const [candSkills, setCandSkills] = useState('');
  const [candJobId, setCandJobId] = useState('');
  const [candSource, setCandSource] = useState('Website'); // choices: Website, LinkedIn, Referral, Walk-In, Job Portal
  const [candStage, setCandStage] = useState('Applied'); // choices: Applied, Screening, Shortlisted, Interview Scheduled, Interview Completed, Selected, Rejected
  const [candResume, setCandResume] = useState<File | null>(null);

  // 3. Interview
  const [intCandId, setIntCandId] = useState('');
  const [intJobId, setIntJobId] = useState('');
  const [intRound, setIntRound] = useState('HR Screening'); // choices: HR Screening, Technical Round, Manager Round, Final Round
  const [intInterviewerId, setIntInterviewerId] = useState('');
  const [intDate, setIntDate] = useState('');
  const [intMode, setIntMode] = useState('Online'); // choices: Online, Offline, Phone
  const [intFeedback, setIntFeedback] = useState('');
  const [intStatus, setIntStatus] = useState('Scheduled'); // choices: Scheduled, Completed, Cancelled
  const [intRating, setIntRating] = useState<number>(5);

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

  // Sync designation select list based on department selection
  useEffect(() => {
    if (jobDeptId) {
      const filteredDesigs = dbDesignations.filter(
        d => String(d.department) === String(jobDeptId)
      );
      if (filteredDesigs.length > 0) {
        setJobDesignationId(String(filteredDesigs[0].id));
      } else {
        setJobDesignationId('');
      }
    }
  }, [jobDeptId, dbDesignations]);

  // Job opening handler (Create/Update/Duplicate/Close)
  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle || !jobDeptId || !jobDesignationId) {
      addNotification('Please fill in Title, Department, and Designation.', 'warning');
      return;
    }

    const payload = {
      job_title: jobTitle,
      department: Number(jobDeptId),
      designation: Number(jobDesignationId),
      employment_type: jobEmpType,
      location: jobLoc || 'New York Office',
      experience_required: jobExpReq || '3 Years',
      salary_range: jobSalaryRange || '₹5L - ₹8L',
      vacancies: Number(jobVacancies) || 1,
      required_skills: jobSkills || 'React, Django',
      closing_date: jobClosingDate || null,
      status: jobStatus,
      description: jobDesc
    };

    setIsLoading(true);
    try {
      if (editingJob) {
        await recruitmentService.updateJob(editingJob.id, payload);
        addNotification('Job vacancy updated successfully.', 'success');
      } else {
        await recruitmentService.createJob(payload);
        addNotification('Job vacancy created successfully.', 'success');
      }
      setShowJobModal(false);
      setEditingJob(null);
      loadData();
    } catch (err) {
      console.error(err);
      addNotification('Failed to save vacancy details.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  // Duplicate Vacancy Handler
  const handleDuplicateJob = async (job: any) => {
    const payload = {
      job_title: `${job.job_title} (Copy)`,
      department: job.department,
      designation: job.designation,
      employment_type: job.employment_type,
      location: job.location,
      experience_required: job.experience_required,
      salary_range: job.salary_range,
      vacancies: job.vacancies,
      required_skills: job.required_skills,
      closing_date: job.closing_date,
      status: 'Draft',
      description: job.description
    };
    setIsLoading(true);
    try {
      await recruitmentService.createJob(payload);
      addNotification('Vacancy duplicated to Draft successfully.', 'success');
      loadData();
    } catch (err) {
      console.error(err);
      addNotification('Failed to duplicate vacancy.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  // Close Vacancy Handler
  const handleCloseJob = async (job: any) => {
    setIsLoading(true);
    try {
      await recruitmentService.updateJob(job.id, { ...job, status: 'Closed' });
      addNotification('Job vacancy closed successfully.', 'success');
      loadData();
    } catch (err) {
      console.error(err);
      addNotification('Failed to close vacancy.', 'warning');
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
    formData.append('address', candAddress);
    formData.append('education', candEducation);
    formData.append('experience', candExperience);
    formData.append('skills', candSkills);
    formData.append('job_opening', candJobId);
    formData.append('source', candSource);
    formData.append('status', candStage);
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
    if (!intCandId || !intDate || !intInterviewerId) {
      addNotification('Please specify Candidate, Date, and Interviewer.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      if (editingInterview) {
        const payload = {
          candidate: Number(intCandId),
          job_opening: Number(intJobId),
          interview_date: intDate,
          interviewer: Number(intInterviewerId),
          interview_type: intMode,
          interview_round: intRound,
          feedback: intFeedback,
          rating: Number(intRating) || 5,
          status: intStatus
        };
        await recruitmentService.updateInterview(editingInterview.id, payload);
        addNotification('Interview session rescheduled successfully.', 'success');
      } else {
        await recruitmentService.scheduleInterview(
          Number(intCandId),
          Number(intJobId),
          intDate,
          Number(intInterviewerId),
          intMode,
          intRound
        );
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

  // Interview status updates (Reschedule / Cancel / Complete)
  const handleUpdateInterviewStatus = async (interview: any, newStatus: string) => {
    setIsLoading(true);
    try {
      const payload = {
        ...interview,
        status: newStatus
      };
      await recruitmentService.updateInterview(interview.id, payload);
      
      // If completed, update candidate status to Interview Completed
      if (newStatus === 'Completed') {
        await recruitmentService.updateCandidateStage(String(interview.candidate), 'Interview Completed');
      }
      
      addNotification(`Interview status updated to ${newStatus}.`, 'success');
      loadData();
    } catch (err) {
      console.error(err);
      addNotification('Failed to update status.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

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
    const title = j.job_title || j.title || '';
    const dept = j.department_name || '';
    const matchesSearch = searchQuery === '' || title.toLowerCase().includes(searchQuery.toLowerCase()) || dept.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = searchQuery === '' || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter || c.stage === statusFilter;
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

  // Chart datasets from live analytics
  const funnelChartData = React.useMemo(() => {
    if (!analytics.funnel) return [];
    return analytics.funnel.map((item: any) => ({
      stage: item.stage,
      count: item.value
    }));
  }, [analytics]);

  const sourceChartData = React.useMemo(() => {
    if (!analytics.source_distribution) return [];
    return analytics.source_distribution.map((item: any) => ({
      name: item.source,
      value: item.count
    }));
  }, [analytics]);

  const trendChartData = React.useMemo(() => {
    if (!analytics.hiring_trend) return [];
    return analytics.hiring_trend;
  }, [analytics]);

  const stages: RecruitmentCandidate['stage'][] = [
    'Applied',
    'Screening',
    'Shortlisted',
    'Interview Scheduled',
    'Interview Completed',
    'Selected',
    'Rejected'
  ];

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444'];

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
                if (dbDepartments.length > 0) {
                  setJobDeptId(String(dbDepartments[0].id));
                }
                setJobEmpType('Full-Time');
                setJobLoc('');
                setJobExpReq('');
                setJobSalaryRange('');
                setJobVacancies(1);
                setJobSkills('');
                setJobClosingDate('');
                setJobHiringManager('');
                setJobStatus('Open');
                setJobDesc('');
                setShowJobModal(true);
              }}
              className="inline-flex h-9 items-center space-x-1.5 rounded-lg bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-700 shadow shadow-blue-500/10 transition active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Create Vacancy</span>
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
                setCandAddress('');
                setCandEducation('');
                setCandExperience('3+ Years');
                setCandSkills('');
                if (jobs.length > 0) setCandJobId(String(jobs[0].id));
                setCandSource('Website');
                setCandStage('Applied');
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
                if (candidates.length > 0) {
                  setIntCandId(candidates[0].id);
                  setIntJobId(String(candidates[0].job_opening || ''));
                }
                if (hrStaff.length > 0) {
                  setIntInterviewerId(String(hrStaff[0].id));
                }
                setIntDate('');
                setIntMode('Online');
                setIntRound('HR Screening');
                setIntFeedback('');
                setIntRating(5);
                setIntStatus('Scheduled');
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
        <div className="flex items-center justify-between rounded-xl border border-slate-205 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <span className="text-[10px] font-extrabold text-slate-505 dark:text-slate-400 uppercase tracking-widest block">Open Vacancies</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{analytics.open_vacancies ?? reports.total_jobs}</span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Active</span>
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
            <Briefcase className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-205 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <span className="text-[10px] font-extrabold text-slate-505 dark:text-slate-400 uppercase tracking-widest block">Total Candidates</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{analytics.total_candidates ?? reports.total_candidates}</span>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Profiles</span>
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
            <Users className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-205 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <span className="text-[10px] font-extrabold text-slate-505 dark:text-slate-400 uppercase tracking-widest block">Interviews Today</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{analytics.interviews_today ?? 0}</span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Meetings</span>
            </div>
          </div>
          <div className="rounded-lg bg-amber-50 p-2 text-amber-650 dark:bg-amber-950/50 dark:text-amber-300">
            <Calendar className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-205 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <span className="text-[10px] font-extrabold text-slate-505 dark:text-slate-400 uppercase tracking-widest block">Selected Candidates</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{analytics.selected_candidates ?? reports.hired_count}</span>
              <span className="text-[10px] font-bold text-emerald-650 dark:text-emerald-400">Selected</span>
            </div>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
            <UserCheck className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-205 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <span className="text-[10px] font-extrabold text-slate-505 dark:text-slate-400 uppercase tracking-widest block">Rejected Candidates</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{analytics.rejected_candidates ?? reports.rejected_count}</span>
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Archived</span>
            </div>
          </div>
          <div className="rounded-lg bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
            <X className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* TABS SELECT BAR */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-px">
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
                ? 'text-blue-600 dark:text-blue-400 font-extrabold border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SEARCH AND FILTERS */}
      {activeTab !== 'Dashboard' && (
        <div className="rounded-xl border border-slate-205 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
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
                  <option value="Draft">Draft</option>
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                  <option value="On Hold">On Hold</option>
                </>
              )}
              {activeTab === 'Candidates' && (
                <>
                  <option value="Applied">Applied</option>
                  <option value="Screening">Screening</option>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Interview Scheduled">Interview Scheduled</option>
                  <option value="Interview Completed">Interview Completed</option>
                  <option value="Selected">Selected</option>
                  <option value="Rejected">Rejected</option>
                </>
              )}
              {activeTab === 'Interviews' && (
                <>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
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
              <div className="rounded-xl border border-slate-205 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recruitment Conversion Funnel</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Yield drop rate of candidate profiles</p>
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
              <div className="rounded-xl border border-slate-205 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 h-56">
                <span>No funnel data available yet.</span>
              </div>
            )}

            {/* Candidate Source Breakdown */}
            {sourceChartData.length > 0 ? (
              <div className="rounded-xl border border-slate-205 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Candidate Source Distribution</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Origin and routing of candidate applications</p>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sourceChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {sourceChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-205 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 h-56">
                <span>No source data available yet.</span>
              </div>
            )}

            {/* Hiring Trend Area Chart */}
            {trendChartData.length > 0 ? (
              <div className="rounded-xl border border-slate-205 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4 md:col-span-2">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hiring Trend</h3>
                  <p className="text-[10px] text-slate-505 dark:text-slate-400 font-semibold">Monthly candidate intake velocity</p>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendChartData}>
                      <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="candidates" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-205 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 h-56 md:col-span-2">
                <span>No hiring trends logged yet.</span>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: JOBS */}
        {activeTab === 'Jobs' && (
          <div className="overflow-hidden rounded-xl border border-slate-205 bg-white shadow-sm dark:border-slate-805 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                    <th className="px-6 py-3.5">Job Title</th>
                    <th className="px-6 py-3.5">Department</th>
                    <th className="px-6 py-3.5">Openings</th>
                    <th className="px-6 py-3.5">Location</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 text-xs font-semibold dark:divide-slate-800/40">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">Synchronizing job listings...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedJobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2 py-4">
                          <Briefcase className="h-8 w-8 text-slate-350 animate-pulse" />
                          <span className="font-bold text-xs text-slate-850 dark:text-slate-300">No job roles found</span>
                          <span className="text-[10px] text-slate-455 max-w-xs leading-normal">
                            Create a new role opening using the trigger button at the top.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="px-6 py-3.5 text-slate-900 dark:text-white font-extrabold">{job.job_title}</td>
                        <td className="px-6 py-3.5 text-slate-700 dark:text-slate-305">{job.department_name}</td>
                        <td className="px-6 py-3.5 text-slate-700 dark:text-slate-305">{job.vacancies}</td>
                        <td className="px-6 py-3.5 text-slate-700 dark:text-slate-305">{job.location}</td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                            job.status === 'Open'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-205 dark:border-emerald-900'
                              : job.status === 'Draft'
                              ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200'
                              : job.status === 'On Hold'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-955/40 dark:text-amber-300 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-205 dark:border-rose-900'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              setEditingJob(job);
                              setJobTitle(job.job_title);
                              setJobDeptId(String(job.department));
                              setJobDesignationId(String(job.designation));
                              setJobEmpType(job.employment_type || 'Full-Time');
                              setJobLoc(job.location || '');
                              setJobExpReq(job.experience_required || '');
                              setJobSalaryRange(job.salary_range || '');
                              setJobVacancies(job.vacancies || 1);
                              setJobSkills(job.required_skills || '');
                              setJobClosingDate(job.closing_date || '');
                              setJobHiringManager(job.hiring_manager || '');
                              setJobStatus(job.status || 'Open');
                              setJobDesc(job.description || '');
                              setShowJobModal(true);
                            }}
                            title="Edit Vacancy"
                            className="rounded p-1 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-750"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicateJob(job)}
                            title="Duplicate Vacancy"
                            className="rounded p-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-slate-800 dark:text-blue-300 border border-blue-200 dark:border-slate-750"
                          >
                            <ClipboardList className="h-3.5 w-3.5" />
                          </button>
                          {job.status !== 'Closed' && (
                            <button
                              onClick={() => handleCloseJob(job)}
                              title="Close Vacancy"
                              className="rounded p-1 bg-amber-50 hover:bg-amber-105 text-amber-700 dark:bg-slate-800 dark:text-amber-400 border border-amber-200 dark:border-slate-750"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            title="Delete Vacancy"
                            className="rounded p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-slate-800 dark:text-rose-400 border border-rose-100 dark:border-slate-750"
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
              <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Showing {startIndex + 1} - {Math.min(startIndex + pageSize, filteredJobs.length)} of {filteredJobs.length} openings
                </span>
                <div className="flex space-x-1">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-55 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={page * pageSize >= filteredJobs.length}
                    onClick={() => setPage(prev => prev + 1)}
                    className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-55 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
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
          <div className="space-y-4">
            
            {/* View Mode controls */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 p-3 rounded-xl shadow-xs">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Candidate Ledger Directory</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCandidateViewMode('list')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                    candidateViewMode === 'list' 
                      ? 'bg-blue-600 text-white border-blue-650' 
                      : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  List View
                </button>
                <button
                  onClick={() => setCandidateViewMode('pipeline')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                    candidateViewMode === 'pipeline' 
                      ? 'bg-blue-600 text-white border-blue-650' 
                      : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  Pipeline Board
                </button>
              </div>
            </div>

            {candidateViewMode === 'list' ? (
              <div className="overflow-hidden rounded-xl border border-slate-205 bg-white shadow-sm dark:border-slate-805 dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-505 dark:text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                        <th className="px-6 py-3.5">Candidate Name</th>
                        <th className="px-6 py-3.5">Applied Position</th>
                        <th className="px-6 py-3.5">Skills</th>
                        <th className="px-6 py-3.5">Experience</th>
                        <th className="px-6 py-3.5">Source</th>
                        <th className="px-6 py-3.5">Stage Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 text-xs font-semibold dark:divide-slate-800/40">
                      {isLoading ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                              <span className="text-[10px] uppercase font-bold tracking-wider">Synchronizing candidate rosters...</span>
                            </div>
                          </td>
                        </tr>
                      ) : paginatedCandidates.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                            <div className="flex flex-col items-center justify-center space-y-2 py-4">
                              <Users className="h-8 w-8 text-slate-350" />
                              <span className="font-bold text-xs text-slate-850 dark:text-slate-305 font-sans">No candidates registered</span>
                              <span className="text-[10px] text-slate-455 max-w-xs leading-normal">
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
                                <CandidateAvatar name={cand.name} />
                                <span className="font-extrabold text-slate-850 dark:text-slate-100">{cand.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5 text-slate-700 dark:text-slate-305">{cand.role}</td>
                            <td className="px-6 py-3.5 text-slate-505 dark:text-slate-400 max-w-xs truncate">{cand.tags?.join(', ') || 'React'}</td>
                            <td className="px-6 py-3.5 font-mono text-slate-700 dark:text-slate-300">{cand.experience}</td>
                            <td className="px-6 py-3.5 font-mono text-slate-700 dark:text-slate-305">{cand.source || 'Website'}</td>
                            <td className="px-6 py-3.5">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                                cand.status === 'Selected'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-205 dark:border-emerald-900'
                                  : cand.status === 'Rejected'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-205 dark:border-rose-900'
                                  : cand.status === 'Applied'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-205 dark:border-blue-900'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-205 dark:border-amber-900'
                              }`}>
                                {cand.status}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-right space-x-1.5">
                              <button
                                onClick={() => {
                                  setEditingCandidate(cand);
                                  setCandFirstName(cand.first_name || cand.name.split(' ')[0] || '');
                                  setCandLastName(cand.last_name || cand.name.split(' ').slice(1).join(' ') || '');
                                  setCandEmail(cand.email || '');
                                  setCandPhone(cand.phone || '');
                                  setCandAddress(cand.address || '');
                                  setCandEducation(cand.education || '');
                                  setCandExperience(cand.experience || '3+ Years');
                                  setCandSkills(cand.skills || cand.tags?.join(', ') || '');
                                  setCandJobId(cand.job_opening ? String(cand.job_opening) : '');
                                  setCandSource(cand.source || 'Website');
                                  setCandStage(cand.status || 'Applied');
                                  setShowCandidateModal(true);
                                }}
                                title="Edit Candidate"
                                className="rounded p-1 bg-slate-50 hover:bg-slate-105 text-slate-700 dark:bg-slate-800 dark:text-slate-305 border border-slate-200 dark:border-slate-750"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              
                              {cand.resume && (
                                <a
                                  href={cand.resume}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Download Resume"
                                  className="inline-flex rounded p-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-slate-800 dark:text-blue-400 border border-blue-100 dark:border-slate-750"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                </a>
                              )}

                              {cand.status === 'Selected' && (
                                <button
                                  onClick={() => {
                                    navigate(`/employees?convert_name=${encodeURIComponent(cand.name)}&convert_email=${encodeURIComponent(cand.email || '')}&convert_phone=${encodeURIComponent(cand.phone || '')}&convert_role=${encodeURIComponent(cand.role)}`);
                                  }}
                                  title="Convert Candidate to Employee"
                                  className="rounded p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteCandidate(cand.id)}
                                title="Delete Candidate"
                                className="rounded p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-slate-800 dark:text-rose-400 border border-rose-100 dark:border-slate-750"
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
            ) : (
              /* visual pipeline board view */
              <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                {stages.map(st => {
                  const stageCandidates = filteredCandidates.filter(c => c.stage === st);
                  return (
                    <div key={st} className="flex-shrink-0 w-72 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-805 p-3 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{st}</span>
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-slate-200 dark:bg-slate-850 text-slate-600 dark:text-slate-400">
                          {stageCandidates.length}
                        </span>
                      </div>
                      
                      <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                        {stageCandidates.map(cand => (
                          <div key={cand.id} className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-xs space-y-2 hover:shadow-md transition">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                <CandidateAvatar name={cand.name} />
                                <div>
                                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">{cand.name}</h4>
                                  <span className="text-[10px] text-slate-450 dark:text-slate-500 leading-none block mt-0.5">{cand.role}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-[10px] text-slate-600 dark:text-slate-450 font-medium grid grid-cols-2 gap-1 pt-1">
                              <div>Exp: <span className="font-bold">{cand.experience}</span></div>
                              <div>Src: <span className="font-bold">{cand.source || 'Website'}</span></div>
                            </div>

                            {cand.tags && cand.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {cand.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="px-1.5 py-0.5 text-[8px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">{tag}</span>
                                ))}
                              </div>
                            )}

                            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                              <div className="flex space-x-1.5">
                                <button
                                  onClick={() => {
                                    setEditingCandidate(cand);
                                    setCandFirstName(cand.first_name || cand.name.split(' ')[0] || '');
                                    setCandLastName(cand.last_name || cand.name.split(' ').slice(1).join(' ') || '');
                                    setCandEmail(cand.email || '');
                                    setCandPhone(cand.phone || '');
                                    setCandAddress(cand.address || '');
                                    setCandEducation(cand.education || '');
                                    setCandExperience(cand.experience || '3+ Years');
                                    setCandSkills(cand.skills || cand.tags?.join(', ') || '');
                                    setCandJobId(cand.job_opening ? String(cand.job_opening) : '');
                                    setCandSource(cand.source || 'Website');
                                    setCandStage(cand.status || 'Applied');
                                    setShowCandidateModal(true);
                                  }}
                                  title="Edit Candidate"
                                  className="p-1 rounded bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                >
                                  <Edit className="h-3 w-3" />
                                </button>
                                
                                {cand.resume && (
                                  <a
                                    href={cand.resume}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Download Resume"
                                    className="p-1 rounded bg-blue-50 hover:bg-blue-105 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900"
                                  >
                                    <FileText className="h-3 w-3" />
                                  </a>
                                )}
                              </div>

                              <div className="flex items-center space-x-1.5">
                                {(st === 'Screening' || st === 'Shortlisted' || st === 'Applied') && (
                                  <button
                                    onClick={() => {
                                      setEditingInterview(null);
                                      setIntCandId(cand.id);
                                      setIntJobId(cand.job_opening ? String(cand.job_opening) : '');
                                      if (hrStaff.length > 0) {
                                        setIntInterviewerId(String(hrStaff[0].id));
                                      }
                                      setIntDate('');
                                      setIntFeedback('');
                                      setIntStatus('Scheduled');
                                      setIntRound(st === 'Shortlisted' ? 'Technical Round' : 'HR Screening');
                                      setShowInterviewModal(true);
                                    }}
                                    className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded"
                                  >
                                    Schedule
                                  </button>
                                )}

                                {st === 'Selected' && (
                                  <button
                                    onClick={() => {
                                      navigate(`/employees?convert_name=${encodeURIComponent(cand.name)}&convert_email=${encodeURIComponent(cand.email || '')}&convert_phone=${encodeURIComponent(cand.phone || '')}&convert_role=${encodeURIComponent(cand.role)}`);
                                    }}
                                    className="inline-flex items-center space-x-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-white rounded hover:bg-emerald-600 shadow-xs"
                                  >
                                    <UserPlus className="h-2.5 w-2.5" />
                                    <span>Hire</span>
                                  </button>
                                )}

                                <select
                                  value={cand.stage}
                                  onChange={async (e) => {
                                    const nextStage = e.target.value as RecruitmentCandidate['stage'];
                                    await recruitmentService.updateCandidateStage(cand.id, nextStage);
                                    addNotification(`Moved candidate ${cand.name} to ${nextStage}`, 'success');
                                    loadData();
                                  }}
                                  className="text-[9px] font-bold bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-750 px-1 py-0.5 rounded border-0 text-slate-700 dark:text-slate-300 focus:outline-none"
                                >
                                  {stages.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                          </div>
                        ))}
                        {stageCandidates.length === 0 && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-600 text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                            Empty stage
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* TAB 4: INTERVIEWS */}
        {activeTab === 'Interviews' && (
          <div className="overflow-hidden rounded-xl border border-slate-205 bg-white shadow-sm dark:border-slate-805 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-205 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-550 dark:text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                    <th className="px-6 py-3.5">Candidate</th>
                    <th className="px-6 py-3.5">Round</th>
                    <th className="px-6 py-3.5">Interviewer</th>
                    <th className="px-6 py-3.5">Date &amp; Time</th>
                    <th className="px-6 py-3.5">Mode</th>
                    <th className="px-6 py-3.5">Feedback Notes</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 text-xs font-semibold dark:divide-slate-800/40">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">Synchronizing scheduled loops...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedInterviews.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
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
                        <td className="px-6 py-3.5 text-slate-700 dark:text-slate-305">{int.interview_round || 'HR Screening'}</td>
                        <td className="px-6 py-3.5 text-slate-700 dark:text-slate-350">{int.interviewer_name || 'HR Manager'}</td>
                        <td className="px-6 py-3.5 font-mono text-slate-700 dark:text-slate-300">{new Date(int.interview_date).toLocaleString()}</td>
                        <td className="px-6 py-3.5 text-slate-700 dark:text-slate-305">{int.interview_type || 'Online'}</td>
                        <td className="px-6 py-3.5 text-slate-505 dark:text-slate-400 max-w-xs truncate">{int.feedback || 'Pending feedback...'}</td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                            int.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-305 border border-emerald-205 dark:border-emerald-900'
                              : int.status === 'Cancelled'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-955/40 dark:text-rose-300 border border-rose-200'
                              : 'bg-blue-105 text-blue-800 dark:bg-blue-955/40 dark:text-blue-300 border border-blue-200'
                          }`}>
                            {int.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              setEditingInterview(int);
                              setIntCandId(String(int.candidate));
                              setIntJobId(String(int.job_opening));
                              setIntInterviewerId(String(int.interviewer));
                              setIntDate(new Date(int.interview_date).toISOString().substring(0, 16));
                              setIntMode(int.interview_type || 'Online');
                              setIntRound(int.interview_round || 'HR Screening');
                              setIntFeedback(int.feedback || '');
                              setIntRating(int.rating || 5);
                              setIntStatus(int.status || 'Scheduled');
                              setShowInterviewModal(true);
                            }}
                            title="Edit / Reschedule"
                            className="rounded p-1 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-305 border border-slate-200 dark:border-slate-750"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          {int.status === 'Scheduled' && (
                            <>
                              <button
                                onClick={() => handleUpdateInterviewStatus(int, 'Completed')}
                                title="Mark Completed"
                                className="rounded p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleUpdateInterviewStatus(int, 'Cancelled')}
                                title="Cancel Interview"
                                className="rounded p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleCancelInterview(int.id)}
                            title="Delete Record"
                            className="rounded p-1 bg-rose-50 hover:bg-rose-100 text-rose-750 border border-rose-200"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-300 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                {editingJob ? 'Update Vacancy Details' : 'Create Vacancy'}
              </h3>
              <button onClick={() => setShowJobModal(false)} className="rounded p-1 hover:bg-slate-105 dark:hover:bg-slate-800">
                <X className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleJobSubmit} className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1 grid grid-cols-2 gap-4">
              
              <div className="col-span-2">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Position Job Title *</label>
                <input
                  required
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Department *</label>
                <select
                  required
                  value={jobDeptId}
                  onChange={(e) => setJobDeptId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Select Department</option>
                  {dbDepartments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400">Designation *</label>
                <select
                  required
                  value={jobDesignationId}
                  onChange={(e) => setJobDesignationId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Select Designation</option>
                  {dbDesignations
                    .filter(d => String(d.department) === String(jobDeptId))
                    .map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Employment Type</label>
                <select
                  value={jobEmpType}
                  onChange={(e) => setJobEmpType(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="Full-Time">Full-Time</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-550 dark:text-slate-400">Location</label>
                <input
                  type="text"
                  value={jobLoc}
                  onChange={(e) => setJobLoc(e.target.value)}
                  placeholder="e.g. New York Office / Remote"
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Experience Required</label>
                <input
                  type="text"
                  value={jobExpReq}
                  onChange={(e) => setJobExpReq(e.target.value)}
                  placeholder="e.g. 3+ Years"
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Salary Range</label>
                <input
                  type="text"
                  value={jobSalaryRange}
                  onChange={(e) => setJobSalaryRange(e.target.value)}
                  placeholder="e.g. ₹6,00,000 - ₹10,00,000"
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Number of Openings</label>
                <input
                  type="number"
                  value={jobVacancies}
                  onChange={(e) => setJobVacancies(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Closing Date</label>
                <input
                  type="date"
                  value={jobClosingDate}
                  onChange={(e) => setJobClosingDate(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hiring Manager</label>
                <input
                  type="text"
                  value={jobHiringManager}
                  onChange={(e) => setJobHiringManager(e.target.value)}
                  placeholder="Hiring Manager Name"
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-550 dark:text-slate-400">Vacancy Status</label>
                <select
                  value={jobStatus}
                  onChange={(e) => setJobStatus(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="Draft">Draft</option>
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Required Skills Keywords</label>
                <input
                  type="text"
                  value={jobSkills}
                  onChange={(e) => setJobSkills(e.target.value)}
                  placeholder="e.g. Django, React, AWS, Python"
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Job Description</label>
                <textarea
                  rows={3}
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  placeholder="Responsibilities and structural specifications..."
                  className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="col-span-2 pt-2 flex space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
                  className="flex-1 border border-slate-300 rounded-lg py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-blue-700 active:scale-[0.98] transition-all"
                >
                  Save Vacancy
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: Register Candidate */}
      {showCandidateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-300 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-205 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                {editingCandidate ? 'Update Profile Details' : 'Register Candidate'}
              </h3>
              <button onClick={() => setShowCandidateModal(false)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCandidateSubmit} className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1 grid grid-cols-2 gap-4">
              
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">First Name *</label>
                <input
                  required
                  type="text"
                  value={candFirstName}
                  onChange={(e) => setCandFirstName(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400">Last Name *</label>
                <input
                  required
                  type="text"
                  value={candLastName}
                  onChange={(e) => setCandLastName(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400">Email Address *</label>
                <input
                  required
                  type="email"
                  value={candEmail}
                  onChange={(e) => setCandEmail(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400">Phone Number *</label>
                <input
                  required
                  type="text"
                  value={candPhone}
                  onChange={(e) => setCandPhone(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400">Home Address</label>
                <input
                  type="text"
                  value={candAddress}
                  onChange={(e) => setCandAddress(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400">Education Details</label>
                <input
                  type="text"
                  value={candEducation}
                  onChange={(e) => setCandEducation(e.target.value)}
                  placeholder="e.g. B.Tech in Computer Science"
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400">Experience Required</label>
                <input
                  type="text"
                  value={candExperience}
                  onChange={(e) => setCandExperience(e.target.value)}
                  placeholder="e.g. 3+ Years"
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400">Applied Vacancy Opening *</label>
                <select
                  required
                  value={candJobId}
                  onChange={(e) => setCandJobId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Select vacancy opening...</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.job_title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400">Source Channel</label>
                <select
                  value={candSource}
                  onChange={(e) => setCandSource(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="Website">Website</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Referral">Referral</option>
                  <option value="Walk-In">Walk-In</option>
                  <option value="Job Portal">Job Portal</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400">Current Pipeline Stage</label>
                <select
                  value={candStage}
                  onChange={(e) => setCandStage(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {stages.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400">Skills Keywords</label>
                <input
                  type="text"
                  value={candSkills}
                  onChange={(e) => setCandSkills(e.target.value)}
                  placeholder="e.g. Django, React, Python"
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400">Attach Resume PDF *</label>
                <div className="mt-1 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-md p-4 bg-slate-50 hover:bg-slate-100 cursor-pointer dark:border-slate-800 dark:bg-slate-800 dark:hover:bg-slate-750">
                  <label className="flex flex-col items-center space-y-1.5 cursor-pointer">
                    <Upload className="h-6 w-6 text-slate-400" />
                    <span className="text-xs text-slate-605 dark:text-slate-300 font-bold">
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

              <div className="col-span-2 pt-2 flex space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowCandidateModal(false)}
                  className="flex-1 border border-slate-300 rounded-lg py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-blue-700 active:scale-[0.98] transition-all"
                >
                  Register Profile
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: Schedule/Reschedule Interview */}
      {showInterviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-300 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                {editingInterview ? 'Update Session Parameters' : 'Schedule Interview Round'}
              </h3>
              <button onClick={() => setShowInterviewModal(false)} className="rounded p-1 hover:bg-slate-105 dark:hover:bg-slate-800">
                <X className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleInterviewSubmit} className="mt-4 space-y-4">
              
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400 font-sans">Select Candidate *</label>
                <select
                  required
                  disabled={!!editingInterview}
                  value={intCandId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setIntCandId(cid);
                    const matched = candidates.find(c => String(c.id) === String(cid));
                    if (matched) {
                      setIntJobId(String(matched.job_opening || ''));
                    }
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Select candidate...</option>
                  {candidates.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400 font-sans">Job Vacancy Opening *</label>
                <select
                  required
                  disabled={true} // bound directly to selected candidate
                  value={intJobId}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-100 px-2 text-xs text-slate-600 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400"
                >
                  <option value="">Vacancies list...</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.job_title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400">Interview Mode</label>
                  <select
                    value={intMode}
                    onChange={(e) => setIntMode(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Phone">Phone</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400">Interview Round</label>
                  <select
                    value={intRound}
                    onChange={(e) => setIntRound(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs text-slate-855 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="HR Screening">HR Screening</option>
                    <option value="Technical Round">Technical Round</option>
                    <option value="Manager Round">Manager Round</option>
                    <option value="Final Round">Final Round</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Interviewer Officer *</label>
                <select
                  required
                  value={intInterviewerId}
                  onChange={(e) => setIntInterviewerId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Select Interviewer...</option>
                  {hrStaff.map(hr => (
                    <option key={hr.id} value={hr.id}>{hr.full_name} (@{hr.username})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400">Scheduled Date &amp; Time *</label>
                <input
                  required
                  type="datetime-local"
                  value={intDate}
                  onChange={(e) => setIntDate(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {editingInterview && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Feedback Rating (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={intRating}
                        onChange={(e) => setIntRating(Number(e.target.value))}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Interview Status</label>
                      <select
                        value={intStatus}
                        onChange={(e) => setIntStatus(e.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-505 dark:text-slate-400">Feedback Reviews</label>
                    <textarea
                      rows={3}
                      value={intFeedback}
                      onChange={(e) => setIntFeedback(e.target.value)}
                      placeholder="Write evaluation ratings or feedback details..."
                      className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 p-2 text-xs text-slate-850 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowInterviewModal(false)}
                  className="flex-1 border border-slate-300 rounded-lg py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-305 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-blue-700 active:scale-[0.98] transition-all"
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
