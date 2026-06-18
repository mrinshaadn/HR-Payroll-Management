import { api } from './api';
import { RecruitmentCandidate } from '../types';

export const mapBackendCandidateToFrontend = (data: any): RecruitmentCandidate => {
  const getStage = (stage: string): RecruitmentCandidate['stage'] => {
    switch (stage) {
      case 'APPLIED': return 'Applied';
      case 'SCREENING': return 'Screening';
      case 'INTERVIEW': return 'Interviews';
      case 'SHORTLISTED': return 'Interviews';
      case 'OFFERED': return 'Offer';
      case 'HIRED': return 'Offer';
      default: return 'Applied';
    }
  };

  return {
    id: String(data.id),
    name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Candidate',
    avatar: data.profile_picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    role: data.job_title || 'Software Developer',
    tags: data.skills ? data.skills.split(',').map((s: string) => s.trim()) : ['Design Systems', 'React'],
    experience: data.experience_years ? `${data.experience_years}+ Years` : '3+ Years',
    score: data.test_score ? `${data.test_score}%` : '85%',
    stage: getStage(data.stage),
    status: data.stage || 'APPLIED',
    appliedDate: data.applied_date || 'Just Now',
  };
};

export const recruitmentService = {
  // Required: getJobs()
  getJobs: async (): Promise<any[]> => {
    try {
      const response = await api.get('/recruitment/jobs/');
      return response.data.results || response.data;
    } catch (error) {
      console.error('Error fetching jobs:', error);
      return [];
    }
  },

  // Required: createJob()
  createJob: async (data: any): Promise<any | null> => {
    try {
      const response = await api.post('/recruitment/jobs/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating job:', error);
      return null;
    }
  },

  // Required: updateJob()
  updateJob: async (id: number, data: any): Promise<any | null> => {
    try {
      const response = await api.put(`/recruitment/jobs/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating job ${id}:`, error);
      return null;
    }
  },

  // Required: deleteJob()
  deleteJob: async (id: number): Promise<boolean> => {
    try {
      await api.delete(`/recruitment/jobs/${id}/`);
      return true;
    } catch (error) {
      console.error(`Error deleting job ${id}:`, error);
      return false;
    }
  },

  // Required: getCandidates()
  getCandidates: async (): Promise<RecruitmentCandidate[]> => {
    try {
      const response = await api.get('/recruitment/candidates/');
      const results = response.data.results || response.data;
      return results.map(mapBackendCandidateToFrontend);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      return [];
    }
  },

  // Required: createCandidate()
  createCandidate: async (data: any): Promise<RecruitmentCandidate | null> => {
    try {
      // Support raw object or FormData for resume uploads
      let payload = data;
      let headers = {};
      if (data instanceof FormData) {
        payload = data;
        headers = { 'Content-Type': 'multipart/form-data' };
      } else {
        const names = (data.name || '').split(' ');
        const firstName = names[0] || '';
        const lastName = names.slice(1).join(' ') || 'Candidate';
        payload = {
          first_name: firstName,
          last_name: lastName,
          email: data.email || `${(firstName + lastName).toLowerCase()}@test.com`,
          phone: data.phone || '1234567890',
          job: data.job || 1,
          experience_years: data.experience_years || 3,
          stage: data.status || 'APPLIED'
        };
      }

      const response = await api.post('/recruitment/candidates/', payload, { headers });
      return mapBackendCandidateToFrontend(response.data);
    } catch (error) {
      console.error('Error creating candidate:', error);
      return null;
    }
  },

  // Required: updateCandidate()
  updateCandidate: async (id: number, data: any): Promise<RecruitmentCandidate | null> => {
    try {
      let payload = data;
      let headers = {};
      if (data instanceof FormData) {
        payload = data;
        headers = { 'Content-Type': 'multipart/form-data' };
      }
      const response = await api.put(`/recruitment/candidates/${id}/`, payload, { headers });
      return mapBackendCandidateToFrontend(response.data);
    } catch (error) {
      console.error(`Error updating candidate ${id}:`, error);
      return null;
    }
  },

  // Required: deleteCandidate()
  deleteCandidate: async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/recruitment/candidates/${id}/`);
      return true;
    } catch (error) {
      console.error('Error deleting candidate:', error);
      return false;
    }
  },

  // Required: getInterviews()
  getInterviews: async (): Promise<any[]> => {
    try {
      const response = await api.get('/recruitment/interviews/');
      return response.data.results || response.data;
    } catch (error) {
      console.error('Error fetching interviews:', error);
      return [];
    }
  },

  // Required: scheduleInterview()
  scheduleInterview: async (candidateId: number, dateStr: string, interviewerId: number): Promise<any> => {
    try {
      const response = await api.post('/recruitment/interviews/schedule/', {
        candidate_id: candidateId,
        interview_date: dateStr,
        interviewer: interviewerId,
      });
      return response.data;
    } catch (error) {
      console.error('Error scheduling interview:', error);
      return null;
    }
  },

  // Required: updateInterview()
  updateInterview: async (id: number, data: any): Promise<any | null> => {
    try {
      const response = await api.put(`/recruitment/interviews/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating interview ${id}:`, error);
      return null;
    }
  },

  // Required: deleteInterview()
  deleteInterview: async (id: number): Promise<boolean> => {
    try {
      await api.delete(`/recruitment/interviews/${id}/`);
      return true;
    } catch (error) {
      console.error(`Error deleting interview ${id}:`, error);
      return false;
    }
  },

  // Required: getRecruitmentReports()
  getRecruitmentReports: async (): Promise<any> => {
    try {
      const response = await api.get('/recruitment/reports/');
      return response.data;
    } catch (error) {
      console.error('Error fetching recruitment reports:', error);
      return null;
    }
  },

  // Required: getRecruitmentAnalytics()
  getRecruitmentAnalytics: async (): Promise<any> => {
    try {
      const response = await api.get('/recruitment/analytics/');
      return response.data;
    } catch (error) {
      console.error('Error fetching recruitment analytics:', error);
      return null;
    }
  },

  // Aliases for compatibility
  shortlistCandidate: async (candidateId: number): Promise<any> => {
    try {
      const response = await api.post('/recruitment/candidates/shortlist/', {
        candidate_id: candidateId,
      });
      return response.data;
    } catch (error) {
      return null;
    }
  },

  updateCandidateStage: async (id: string, stage: RecruitmentCandidate['stage']): Promise<RecruitmentCandidate | null> => {
    try {
      const mapFrontendStageToBackend = (st: string) => {
        switch (st) {
          case 'Applied': return 'APPLIED';
          case 'Screening': return 'SCREENING';
          case 'Interviews': return 'INTERVIEW';
          case 'Final Stage': return 'SHORTLISTED';
          case 'Offer': return 'OFFERED';
          default: return 'APPLIED';
        }
      };

      const response = await api.patch(`/recruitment/candidates/${id}/`, {
        stage: mapFrontendStageToBackend(stage),
      });
      return mapBackendCandidateToFrontend(response.data);
    } catch (error) {
      return null;
    }
  }
};
