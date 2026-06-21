import { api } from './api';
import { DocumentRecord } from '../types';

export const mapBackendDocumentToFrontend = (data: any): DocumentRecord => {
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoString || '';
    }
  };

  const getStatus = (status: string): DocumentRecord['status'] => {
    if (status === 'Active') return 'Active';
    if (status === 'Archived') return 'Expired';
    if (status === 'Deleted') return 'Missing';
    if (status === 'Pending Verification') return 'Pending Verification';
    if (status === 'Approved') return 'Approved';
    if (status === 'Rejected') return 'Rejected';
    return 'Active';
  };

  return {
    id: String(data.id),
    name: data.title || 'Document File',
    category: data.category_name || 'Other Documents',
    category_id: data.category,
    ownerName: data.employee_name || data.uploaded_by_username || 'Employee',
    ownerAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    uploadDate: formatDate(data.uploaded_at),
    expiryDate: 'N/A',
    status: getStatus(data.status),
    rawStatus: data.status,
    fileSize: data.file_size,
    fileType: data.file_type,
    description: data.description,
    fileUrl: data.file,
    employeeId: data.employee,
  };
};

export const documentService = {
  getDocumentCategories: async (): Promise<Array<{ id: number; name: string; description: string }>> => {
    const response = await api.get('/documents/categories/');
    return response.data.results || response.data;
  },

  getDocuments: async (): Promise<DocumentRecord[]> => {
    const response = await api.get('/documents/');
    const results = response.data.results || response.data;
    return results.map(mapBackendDocumentToFrontend);
  },

  uploadDocument: async (
    title: string,
    categoryId: number,
    file: File,
    employeeId?: string,
    description?: string,
    onProgress?: (percent: number) => void
  ): Promise<DocumentRecord | null> => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', String(categoryId));
    formData.append('file', file);
    if (employeeId) {
      formData.append('employee', employeeId);
    }
    if (description) {
      formData.append('description', description);
    }

    const response = await api.post('/documents/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
    return mapBackendDocumentToFrontend(response.data);
  },

  updateDocument: async (
    documentId: string,
    title: string,
    categoryId: number,
    description?: string
  ): Promise<DocumentRecord | null> => {
    const response = await api.patch(`/documents/${documentId}/`, {
      title,
      category: categoryId,
      description
    });
    return mapBackendDocumentToFrontend(response.data);
  },

  deleteDocument: async (documentId: string): Promise<boolean> => {
    await api.delete(`/documents/${documentId}/`);
    return true;
  },

  downloadDocument: async (documentId: string, title: string): Promise<void> => {
    const response = await api.get('/documents/download/', {
      params: { document_id: Number(documentId) },
      responseType: 'blob',
    });
    
    const blob = new Blob([response.data], { type: String(response.headers['content-type'] || 'application/octet-stream') });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = title || `document-${documentId}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  archiveDocument: async (documentId: string): Promise<DocumentRecord | null> => {
    const response = await api.post('/documents/archive/', {
      document_id: Number(documentId),
    });
    return mapBackendDocumentToFrontend(response.data);
  },

  restoreDocument: async (documentId: string): Promise<DocumentRecord | null> => {
    const response = await api.post('/documents/restore/', {
      document_id: Number(documentId),
    });
    return mapBackendDocumentToFrontend(response.data);
  },

  getEmployeeDocuments: async (employeeId: string): Promise<DocumentRecord[]> => {
    const response = await api.get(`/documents/employee/${employeeId}/`);
    const results = response.data.results || response.data;
    return results.map(mapBackendDocumentToFrontend);
  },

  getDocumentLogs: async (): Promise<any[]> => {
    const response = await api.get('/documents/logs/');
    return response.data;
  },

  approveDocument: async (documentId: string): Promise<DocumentRecord | null> => {
    const response = await api.post(`/documents/${documentId}/approve/`);
    return mapBackendDocumentToFrontend(response.data);
  },

  rejectDocument: async (documentId: string): Promise<DocumentRecord | null> => {
    const response = await api.post(`/documents/${documentId}/reject/`);
    return mapBackendDocumentToFrontend(response.data);
  },

  replaceDocument: async (
    documentId: string,
    file: File,
    title: string,
    categoryId: number,
    description?: string,
    onProgress?: (percent: number) => void
  ): Promise<DocumentRecord | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('category', String(categoryId));
    if (description) {
      formData.append('description', description);
    }

    const response = await api.put(`/documents/${documentId}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
    return mapBackendDocumentToFrontend(response.data);
  }
};
