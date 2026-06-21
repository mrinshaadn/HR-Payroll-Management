import { api } from './api';
import { RecruitmentCandidate } from '../types';

export const mapBackendCandidateToFrontend = (data: any): RecruitmentCandidate => {
  return {
    id: String(data.id),
    name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Candidate',
    avatar: data.profile_picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    role: data.job_title || 'Software Developer',
    tags: data.skills ? data.skills.split(',').map((s: string) => s.trim()) : ['Design Systems', 'React'],
    experience: data.experience || '3+ Years',
    score: '85%',
    stage: (data.status || 'Applied') as RecruitmentCandidate['stage'],
    status: data.status || 'Applied',
    appliedDate: data.application_date || 'Just Now',
    first_name: data.first_name || '',
    last_name: data.last_name || '',
    email: data.email || '',
    phone: data.phone || '',
    address: data.address || '',
    skills: data.skills || '',
    education: data.education || '',
    source: data.source || '',
    job_opening: data.job_opening || 1,
    resume: data.resume || '',
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
          job_opening: data.job_opening || 1,
          experience: data.experience || '3+ Years',
          status: data.status || 'Applied',
          skills: data.skills || '',
          education: data.education || '',
          address: data.address || '',
          source: data.source || 'Website'
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
  scheduleInterview: async (candidateId: number, jobOpeningId: number, dateStr: string, interviewerId: number, mode: string, round: string): Promise<any> => {
    try {
      const response = await api.post('/recruitment/interviews/schedule/', {
        candidate_id: candidateId,
        job_opening_id: jobOpeningId,
        interview_date: dateStr,
        interviewer_id: interviewerId,
        interview_type: mode,
        interview_round: round,
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
      const response = await api.patch(`/recruitment/candidates/${id}/`, {
        status: stage,
      });
      return mapBackendCandidateToFrontend(response.data);
    } catch (error) {
      return null;
    }
  }
};
