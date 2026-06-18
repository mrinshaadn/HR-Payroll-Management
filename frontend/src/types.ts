export type EmployeeStatus = 'ACTIVE' | 'ON LEAVE' | 'PROBATION' | 'SUSPENDED' | 'RESIGNED' | 'TERMINATED' | 'REMOTE';

export interface CareerMilestone {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'PROMOTION' | 'AWARD' | 'HIRED' | 'TRANSITION';
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: EmployeeStatus;
  department: string;
  role: string;
  manager: string;
  joinDate: string;
  location: string;
  avatar: string;
  salary: number;
  personalInfo: {
    fullName: string;
    emailAddress: string;
    phoneNumber: string;
    statusLabel: string;
    emergencyContact: string;
    healthBenefits: string;
    office: string;
    productStatus: string;
  };
  metrics: {
    attendanceRate: number; // e.g. 97.4
    leaveBalance: number; // e.g. 15
    hireDateTrend: string;
    attendanceTrend: number[];
  };
  journey: CareerMilestone[];
  is_deleted?: boolean;
  termination_date?: string | null;
  termination_reason?: string | null;
  termination_notes?: string | null;
}

export interface LeaveRequest {
  id: string;
  employeeName: string;
  employeeAvatar: string;
  leaveType: string;
  reason: string;
  dates: string;
  duration: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
}

export interface AttendanceRecord {
  id: string;
  avatar: string;
  name: string;
  employeeId: string;
  shiftType: 'Morning' | 'Evening' | 'Night' | 'Absent';
  clockIn: string;
  clockOut: string;
  workHours: string;
  overtime: string;
  status: 'Present' | 'Late' | 'WFH' | 'Absent' | 'Half Day' | 'Leave';
}

export interface LoanRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  loanType: 'Personal' | 'Salary Advance' | 'Emergency' | 'Education';
  requestedAmount: number;
  approvedAmount: number;
  emi: number;
  outstandingBalance: number;
  status: 'Approved' | 'Pending' | 'Rejected' | 'Closed';
  totalAmount?: number;
  remainingAmount?: number;
  monthsRemaining?: number;
}

export interface RecruitmentCandidate {
  id: string;
  name: string;
  avatar: string;
  role: string;
  tags: string[];
  experience: string;
  score: string;
  stage: 'Applied' | 'Screening' | 'Interviews' | 'Final Stage' | 'Offer';
  status?: string;
  appliedDate?: string;
}

export interface DocumentRecord {
  id: string;
  name: string;
  category: 'Offer Letters' | 'Contracts' | 'ID Proofs' | 'Certifications' | 'Tax Forms' | 'All Document';
  ownerName: string;
  ownerAvatar: string;
  uploadDate: string;
  expiryDate: string;
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Missing';
}

export interface GoalRecord {
  id: string;
  title: string;
  progress: number;
  dueDate: string;
  status: 'ON TRACK' | 'AT RISK' | 'COMPLETED' | 'DRAFT';
  manager: string;
}

export interface CompanySettings {
  legalEntityName: string;
  companyDomain: string;
  primaryIndustry: string;
  headquartersAddress: string;
  employeeCountRange: string;
  primaryColor: string;
  themeMode: 'dark' | 'light';
  companyName?: string;
  adminEmail?: string;
  payCycle?: 'Bi-weekly' | 'Semi-monthly' | 'Monthly';
  timezone?: string;
  requireTwoFactor?: boolean;
}

export interface HRState {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  attendanceRecords: AttendanceRecord[];
  loans: LoanRecord[];
  candidates: RecruitmentCandidate[];
  documents: DocumentRecord[];
  goals: GoalRecord[];
  settings: CompanySettings;
  sidebarCollapsed: boolean;
}
