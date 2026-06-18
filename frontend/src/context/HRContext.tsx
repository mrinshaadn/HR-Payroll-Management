import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Employee, 
  LeaveRequest, 
  AttendanceRecord, 
  LoanRecord, 
  RecruitmentCandidate, 
  DocumentRecord, 
  GoalRecord, 
  CompanySettings,
  HRState
} from '../types';
import { authService, UserSession } from '../services/authService';
import { employeeService } from '../services/employeeService';
import { leaveService } from '../services/leaveService';
import { attendanceService } from '../services/attendanceService';
import { documentService } from '../services/documentService';
import { recruitmentService } from '../services/recruitmentService';
import { payrollService } from '../services/payrollService';

interface HRContextProps extends HRState {
  leaveBalances: Array<{ id: number; leave_type_name: string; allocated_days: number; remaining_days: number }>;
  addEmployee: (employee: Omit<Employee, 'id' | 'avatar' | 'metrics' | 'journey'> & { password?: string; confirm_password?: string }, profileImageFile?: File | null) => Promise<void>;
  updateEmployee: (id: string, updated: Partial<Employee> & { password?: string; confirm_password?: string }, profileImageFile?: File | null) => Promise<void>;
  deleteEmployee: (id: string, permanent?: boolean) => Promise<void>;
  terminateEmployee: (id: string, terminationData: { termination_date: string; termination_reason: string; notes: string; status: string }) => Promise<void>;
  restoreEmployee: (id: string, updateData?: any) => Promise<void>;
  uploadEmployeePhoto: (id: string, file: File) => Promise<void>;
  addLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'status'>) => Promise<void>;
  updateLeaveRequestStatus: (id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) => Promise<void>;
  addLoan: (loan: Omit<LoanRecord, 'id' | 'status' | 'outstandingBalance'> & { totalAmount?: number; remainingAmount?: number; monthsRemaining?: number }) => void;
  updateLoanStatus: (id: string, status: LoanRecord['status']) => void;
  addDocument: (doc: Omit<DocumentRecord, 'id' | 'uploadDate'> & { file?: File }) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  addCandidate: (candidate: Omit<RecruitmentCandidate, 'id' | 'avatar' | 'tags' | 'experience' | 'score'> & { status?: string; appliedDate?: string }) => Promise<void>;
  deleteCandidate: (id: string) => Promise<void>;
  updateCandidateStage: (id: string, stage: RecruitmentCandidate['stage']) => Promise<void>;
  updateSettings: (settings: Partial<CompanySettings>) => void;
  clockInActive: boolean;
  todayRecord: AttendanceRecord | null;
  clockIn: () => Promise<void>;
  clockOut: () => Promise<void>;
  toggleClockIn: () => Promise<void>;
  isAuthenticated: boolean;
  user: UserSession | null;
  loginUser: (email: string, pass: string) => Promise<boolean>;
  logoutUser: () => void;
  addNotification: (message: string, type: 'info' | 'success' | 'warning') => void;
  notifications: Array<{ id: string; text: string; time: string; read: boolean; type: string }>;
  clearNotifications: () => void;
  currentPayCycleProgress: number; // 0-100
  payCycleStep: number; // 1-6
  advancePayCycleStep: () => void;
  resetPayCycle: () => void;
  config: CompanySettings;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

const HRContext = createContext<HRContextProps | undefined>(undefined);

const defaultSettings: CompanySettings = {
  legalEntityName: 'Global Innovations Tech Group',
  companyDomain: 'global-tech-inc.com',
  primaryIndustry: 'Technology & Software',
  headquartersAddress: '450 Tech Plaza, Floor 12, San Francisco, CA 94105, USA',
  employeeCountRange: '1,001 - 5,000',
  primaryColor: '#004ac6',
  themeMode: 'dark',
  companyName: 'Global Innovations Tech Group',
  adminEmail: 'admin@enterprise.co',
  payCycle: 'Semi-monthly',
  timezone: 'EST - Eastern Standard Time',
  requireTwoFactor: false
};

const initialGoals: GoalRecord[] = [
  { id: 'g1', title: 'Cloud Infrastructure Migration', progress: 65, dueDate: 'Dec 15, 2025', status: 'ON TRACK', manager: 'Marcus Sterling' },
  { id: 'g2', title: 'Q4 Sales Target - EMEA', progress: 32, dueDate: 'Dec 31, 2024', status: 'AT RISK', manager: 'Amy Laurent' },
  { id: 'g3', title: 'Team Leadership Training', progress: 90, dueDate: 'Nov 20, 2024', status: 'ON TRACK', manager: 'Brian Waters' }
];

export const HRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [candidates, setCandidates] = useState<RecruitmentCandidate[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [goals, setGoals] = useState<GoalRecord[]>(initialGoals);
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [clockInActive, setClockInActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(authService.isAuthenticated());
  const [user, setUser] = useState<UserSession | null>(() => {
    const cached = localStorage.getItem('hr_session_user');
    return cached ? JSON.parse(cached) : null;
  });

  // Payroll Progress Cycle
  const [payCycleStep, setPayCycleStep] = useState<number>(3);
  const [currentPayCycleProgress, setCurrentPayCycleProgress] = useState<number>(75);

  // Notifications State
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; time: string; read: boolean; type: string }>>([
    { id: 'n1', text: 'Payroll finalized for cycle Nov 1-15', time: '3m ago', read: false, type: 'success' },
    { id: 'n2', text: 'Robert Fox submitted sick leave request', time: '1h ago', read: false, type: 'info' }
  ]);

  const addNotification = (text: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const newNotif = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      time: 'Just now',
      read: false,
      type
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const [leaveBalances, setLeaveBalances] = useState<Array<{ id: number; leave_type_name: string; allocated_days: number; remaining_days: number }>>([]);

  const refreshData = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      // Fetch data concurrently from API
      const [empList, leaveList, attList, candList, docList, balanceList] = await Promise.all([
        employeeService.getEmployees(),
        leaveService.getHistory(),
        attendanceService.getHistory(),
        recruitmentService.getCandidates(),
        documentService.getDocuments(),
        leaveService.getBalances()
      ]);

      setEmployees(empList);
      setLeaveRequests(leaveList);
      setAttendanceRecords(attList);
      setCandidates(candList);
      setDocuments(docList);
      setLeaveBalances(balanceList);

      // Check if employee has clocked in today
      const todayStatus = await attendanceService.getTodayStatus();
      setTodayRecord(todayStatus);
      setClockInActive(!!todayStatus && (!todayStatus.clockOut || todayStatus.clockOut === '-'));
    } catch (error) {
      console.error('Error refreshing backend data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync state on login
  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    }
  }, [isAuthenticated]);

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (authService.isAuthenticated()) {
        const u = await authService.getCurrentUser();
        if (u) {
          setUser(u);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    // Always apply dark theme class for consistent enterprise UI theme
    document.documentElement.classList.add('dark');
  }, [settings.themeMode]);

  // Actions
  const addEmployee = async (newEmp: Omit<Employee, 'id' | 'avatar' | 'metrics' | 'journey'> & { password?: string; confirm_password?: string }, profileImageFile?: File | null) => {
    setIsLoading(true);
    try {
      const added = await employeeService.createEmployee(newEmp, profileImageFile);
      if (added) {
        setEmployees(prev => [added, ...prev]);
        addNotification(`Added new employee: ${newEmp.name}`, 'success');
        refreshData();
      } else {
        addNotification(`Failed to add employee: ${newEmp.name}`, 'warning');
      }
    } catch (err) {
      addNotification(`Failed to add employee: ${newEmp.name}`, 'warning');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateEmployee = async (id: string, updated: Partial<Employee> & { password?: string; confirm_password?: string }, profileImageFile?: File | null) => {
    setIsLoading(true);
    const updatedEmp = await employeeService.updateEmployee(id, updated, profileImageFile);
    setIsLoading(false);
    if (updatedEmp) {
      setEmployees(prev => prev.map(emp => emp.id === id ? updatedEmp : emp));
      addNotification(`Updated profile for employee: ID ${id}`, 'info');
      refreshData();
    } else {
      addNotification(`Failed to update employee ID ${id}`, 'warning');
    }
  };

  const deleteEmployee = async (id: string, permanent: boolean = false) => {
    setIsLoading(true);
    const success = await employeeService.deleteEmployee(id, permanent);
    setIsLoading(false);
    if (success) {
      setEmployees(prev => prev.filter(emp => emp.id !== id));
      addNotification(
        permanent
          ? `Permanently removed employee record for ID ${id}`
          : `Soft-deleted employee record for ID ${id}`,
        'warning'
      );
      refreshData();
    } else {
      addNotification(`Failed to delete employee ID ${id}`, 'warning');
    }
  };

  const terminateEmployee = async (id: string, terminationData: { termination_date: string; termination_reason: string; notes: string; status: string }) => {
    setIsLoading(true);
    const updated = await employeeService.terminateEmployee(id, terminationData);
    setIsLoading(false);
    if (updated) {
      setEmployees(prev => prev.map(emp => emp.id === id ? updated : emp));
      addNotification(`Employee ID ${id} status updated to ${terminationData.status}`, 'info');
      refreshData();
    } else {
      addNotification(`Failed to terminate employee ID ${id}`, 'warning');
    }
  };

  const restoreEmployee = async (id: string, updateData?: any) => {
    setIsLoading(true);
    const restored = await employeeService.restoreEmployee(id, updateData);
    setIsLoading(false);
    if (restored) {
      setEmployees(prev => {
        const exists = prev.some(emp => emp.id === id);
        if (exists) {
          return prev.map(emp => emp.id === id ? restored : emp);
        } else {
          return [restored, ...prev];
        }
      });
      addNotification(`Employee ID ${id} restored to Active status`, 'success');
      refreshData();
    } else {
      addNotification(`Failed to restore employee ID ${id}`, 'warning');
    }
  };

  const uploadEmployeePhoto = async (id: string, file: File) => {
    setIsLoading(true);
    const url = await employeeService.uploadPhoto(id, file);
    setIsLoading(false);
    if (url) {
      setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, avatar: url } : emp));
      addNotification(`Profile picture updated successfully.`, 'success');
      refreshData();
    } else {
      addNotification(`Failed to upload profile picture.`, 'warning');
    }
  };

  const addLeaveRequest = async (req: Omit<LeaveRequest, 'id' | 'status'>) => {
    setIsLoading(true);
    // Parse duration string to determine start/end dates if not format YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];
    const durationNum = parseInt(req.duration) || 1;
    const endDateObj = new Date();
    endDateObj.setDate(endDateObj.getDate() + durationNum - 1);
    const endDateStr = endDateObj.toISOString().split('T')[0];

    const added = await leaveService.applyLeave({
      leaveType: req.leaveType,
      startDate: todayStr,
      endDate: endDateStr,
      reason: req.reason,
    });
    setIsLoading(false);
    if (added) {
      setLeaveRequests(prev => [added, ...prev]);
      addNotification(`New leave request applied (${req.leaveType})`, 'info');
      refreshData();
    } else {
      addNotification(`Failed to apply leave request`, 'warning');
    }
  };

  const updateLeaveRequestStatus = async (id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) => {
    setIsLoading(true);
    let updated: LeaveRequest | null = null;
    if (status === 'APPROVED') {
      updated = await leaveService.approveLeave(id);
    } else {
      updated = await leaveService.rejectLeave(id, rejectionReason || 'Rejected via HR Manager dashboard');
    }
    setIsLoading(false);
    if (updated) {
      setLeaveRequests(prev => prev.map(req => req.id === id ? updated! : req));
      addNotification(`Leave request ${status.toLowerCase()} successfully`, status === 'APPROVED' ? 'success' : 'warning');
      refreshData();
    } else {
      addNotification(`Failed to update leave request status`, 'warning');
    }
  };

  const addLoan = (loan: Omit<LoanRecord, 'id' | 'status' | 'outstandingBalance'> & { totalAmount?: number; remainingAmount?: number; monthsRemaining?: number }) => {
    // Keep local loans mapping
    const totalAmount = loan.totalAmount ?? loan.approvedAmount ?? 0;
    const newLoan: LoanRecord = {
      ...loan,
      employeeId: 'EMP-001',
      loanType: 'Personal',
      requestedAmount: totalAmount,
      approvedAmount: totalAmount,
      emi: Math.ceil(totalAmount / 12),
      outstandingBalance: totalAmount,
      id: `LOAN-${Math.floor(100 + Math.random() * 900)}`,
      status: 'Pending'
    };
    setLoans(prev => [newLoan, ...prev]);
    addNotification(`Loan request registered for ${loan.employeeName}`, 'info');
  };

  const updateLoanStatus = (id: string, status: LoanRecord['status']) => {
    setLoans(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    addNotification(`Loan ${id} marked as ${status}`, 'info');
  };

  const addDocument = async (doc: Omit<DocumentRecord, 'id' | 'uploadDate'> & { file?: File }) => {
    if (!doc.file) {
      addNotification(`Please attach a valid file to upload.`, 'warning');
      return;
    }
    setIsLoading(true);
    
    // Resolve category ID by name
    const categories = await documentService.getDocumentCategories();
    let matchedCat = categories.find(c => c.name.toLowerCase() === doc.category.toLowerCase());
    if (!matchedCat) {
      matchedCat = categories.find(c => c.name.toLowerCase().includes(doc.category.toLowerCase())) || categories[0];
    }

    // Attempt to map employee name to ID
    const matchedEmp = employees.find(e => e.name.toLowerCase() === doc.ownerName.toLowerCase());

    const uploaded = await documentService.uploadDocument(
      doc.name,
      matchedCat ? matchedCat.id : 1,
      doc.file,
      matchedEmp ? matchedEmp.id : undefined,
      'Uploaded via documents upload panel'
    );
    setIsLoading(false);
    if (uploaded) {
      setDocuments(prev => [uploaded, ...prev]);
      addNotification(`Uploaded document: ${doc.name}`, 'success');
      refreshData();
    } else {
      addNotification(`Failed to upload document: ${doc.name}`, 'warning');
    }
  };

  const deleteDocument = async (id: string) => {
    setIsLoading(true);
    const success = await documentService.deleteDocument(id);
    setIsLoading(false);
    if (success) {
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      addNotification(`Document deleted permanently`, 'success');
      refreshData();
    } else {
      addNotification(`Failed to delete document`, 'warning');
    }
  };

  const addCandidate = async (cand: Omit<RecruitmentCandidate, 'id' | 'avatar' | 'tags' | 'experience' | 'score'> & { status?: string; appliedDate?: string }) => {
    setIsLoading(true);
    const added = await recruitmentService.createCandidate(cand);
    setIsLoading(false);
    if (added) {
      setCandidates(prev => [added, ...prev]);
      addNotification(`Registered candidate: ${cand.name}`, 'success');
      refreshData();
    } else {
      addNotification(`Failed to add candidate`, 'warning');
    }
  };

  const deleteCandidate = async (id: string) => {
    setIsLoading(true);
    const success = await recruitmentService.deleteCandidate(id);
    setIsLoading(false);
    if (success) {
      setCandidates(prev => prev.filter(c => c.id !== id));
      addNotification(`Rejected/Removed candidate profile`, 'warning');
      refreshData();
    } else {
      addNotification(`Failed to delete candidate`, 'warning');
    }
  };

  const updateCandidateStage = async (id: string, stage: RecruitmentCandidate['stage']) => {
    setIsLoading(true);
    const updated = await recruitmentService.updateCandidateStage(id, stage);
    setIsLoading(false);
    if (updated) {
      setCandidates(prev => prev.map(cand => cand.id === id ? updated : cand));
      addNotification(`Candidate stage updated to ${stage}`, 'info');
      refreshData();
    } else {
      addNotification(`Failed to update stage`, 'warning');
    }
  };

  const updateSettings = (updated: Partial<CompanySettings>) => {
    setSettings(prev => ({ ...prev, ...updated }));
    addNotification('Company administration settings saved', 'success');
  };

  const clockIn = async () => {
    setIsLoading(true);
    try {
      const record = await attendanceService.clockIn();
      if (record) {
        setClockInActive(true);
        setTodayRecord(record);
        addNotification('Clocked in successfully. Session started.', 'success');
        refreshData();
      } else {
        addNotification('Clock in failed.', 'warning');
      }
    } catch (err) {
      console.error(err);
      addNotification('Clock in failed.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const clockOut = async () => {
    setIsLoading(true);
    try {
      const record = await attendanceService.clockOut();
      if (record) {
        setClockInActive(false);
        setTodayRecord(record);
        addNotification('Clocked out successfully. Session closed.', 'info');
        refreshData();
      } else {
        addNotification('Clock out failed.', 'warning');
      }
    } catch (err) {
      console.error(err);
      addNotification('Clock out failed.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleClockIn = async () => {
    if (clockInActive) {
      await clockOut();
    } else {
      await clockIn();
    }
  };

  const loginUser = async (email: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    const userSession = await authService.login(email, pass);
    setIsLoading(false);
    if (userSession) {
      setIsAuthenticated(true);
      setUser(userSession);
      addNotification(`Welcome back, ${userSession.name}!`, 'success');
      return true;
    }
    return false;
  };

  const logoutUser = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setEmployees([]);
    setLeaveRequests([]);
    setAttendanceRecords([]);
    setCandidates([]);
    setDocuments([]);
  };

  const advancePayCycleStep = async () => {
    setIsLoading(true);
    const result = await payrollService.processPayroll();
    setIsLoading(false);
    if (result) {
      setPayCycleStep(prev => {
        const next = prev < 6 ? prev + 1 : 1;
        const progressMap = [15, 30, 50, 75, 90, 100];
        setCurrentPayCycleProgress(progressMap[next - 1]);
        
        const stepNames = [
          'Attendance Locked',
          'Deductions Verified',
          'Tax Calculation Completed',
          'Final Review Complete',
          'Bank Transfer Completed',
          'Payslips Generated'
        ];
        addNotification(`Payroll step advanced: ${stepNames[next - 1]}`, 'success');
        return next;
      });
    } else {
      addNotification('Payroll run sequence failed to trigger.', 'warning');
    }
  };

  const resetPayCycle = () => {
    setPayCycleStep(1);
    setCurrentPayCycleProgress(15);
    addNotification('Payroll cycle restarted', 'info');
  };

  return (
    <HRContext.Provider value={{
      employees,
      leaveRequests,
      leaveBalances,
      attendanceRecords,
      loans,
      candidates,
      documents,
      goals,
      settings,
      config: settings,
      sidebarCollapsed: false,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      terminateEmployee,
      restoreEmployee,
      uploadEmployeePhoto,
      addLeaveRequest,
      updateLeaveRequestStatus,
      addLoan,
      updateLoanStatus,
      addDocument,
      deleteDocument,
      addCandidate,
      deleteCandidate,
      updateCandidateStage,
      updateSettings,
      todayRecord,
      clockInActive,
      clockIn,
      clockOut,
      toggleClockIn,
      isAuthenticated,
      user,
      loginUser,
      logoutUser,
      notifications,
      addNotification,
      clearNotifications,
      currentPayCycleProgress,
      payCycleStep,
      advancePayCycleStep,
      resetPayCycle,
      isLoading,
      refreshData
    }}>
      {children}
    </HRContext.Provider>
  );
};

export const useHR = () => {
  const context = useContext(HRContext);
  if (context === undefined) {
    throw new Error('useHR must be used within an HRProvider');
  }
  return context;
};
