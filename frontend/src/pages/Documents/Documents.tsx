import React, { useState, useEffect } from 'react';
import { useHR } from '../../context/HRContext';
import { documentService } from '../../services/documentService';
import { 
  FileText, 
  Download, 
  Upload, 
  Trash2, 
  Search, 
  Filter, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plus, 
  X,
  Archive,
  RotateCcw,
  User,
  Calendar,
  Layers,
  Activity,
  ChevronRight,
  Shield,
  FileMinus,
  Edit2
} from 'lucide-react';

interface Category {
  id: number;
  name: string;
  description: string;
}

interface ActivityLog {
  id: number;
  document: number;
  document_title: string;
  user: number;
  username: string;
  action: string;
  timestamp: string;
}

export default function Documents() {
  const { employees, refreshData, user } = useHR();
  
  // Checking permissions
  const isHR = user?.role === 'HR' || user?.role === 'ADMIN';

  // API State
  const [documents, setDocuments] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('All');
  const [uploadDateFilter, setUploadDateFilter] = useState<string>('');
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'vault' | 'logs'>('vault');

  // Modal / Form states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<any | null>(null);
  
  // Upload form input states
  const [docTitle, setDocTitle] = useState('');
  const [docCategoryId, setDocCategoryId] = useState<number>(0);
  const [docEmployeeId, setDocEmployeeId] = useState<string>('');
  const [docDescription, setDocDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Upload status states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Load backend data
  const loadDocumentsData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const docs = await documentService.getDocuments();
      setDocuments(docs);
      
      const cats = await documentService.getDocumentCategories();
      setCategories(cats);
      if (cats.length > 0) {
        setDocCategoryId(cats[0].id);
      }

      if (isHR) {
        const logs = await documentService.getDocumentLogs();
        setActivityLogs(logs);
      }
    } catch (err: any) {
      console.error('Failed to fetch documents:', err);
      setErrorMsg('Failed to load documents from server. Please check auth tokens or network.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocumentsData();
  }, [user, activeTab]);

  // Statistics calculation
  const totalDocs = documents.length;
  // Map backend status to counts
  const activeDocs = documents.filter(d => d.status === 'Active').length;
  const archivedDocs = documents.filter(d => d.status === 'Expired').length; // Maps Archived to expired UI count
  const deletedDocs = documents.filter(d => d.status === 'Missing').length; // Maps deleted to Missing UI count

  // Filter logic
  const filteredDocs = documents.filter(doc => {
    const titleMatch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // In our context: Category is string name. We filter by string matching.
    const categoryMatch = selectedCategory === 'All' || doc.category.toLowerCase() === selectedCategory.toLowerCase();
    
    // HR only employee filtering
    let employeeMatch = true;
    if (isHR && selectedEmployeeId !== 'All') {
      // Find employee's name to match ownerName since frontend mapping returns employee name / uploaded username
      const emp = employees.find(e => e.id === selectedEmployeeId);
      if (emp) {
        employeeMatch = doc.ownerName.toLowerCase().includes(emp.name.toLowerCase());
      } else {
        employeeMatch = false;
      }
    }

    // Upload date filter (format YYYY-MM-DD)
    let dateMatch = true;
    if (uploadDateFilter) {
      // Map frontend formatted date back or search upload date
      // doc.uploadDate is formatted as "Month Year" or iso string.
      // We check if it is part of it or parse. If format is short, we match year/month.
      // For precision, we'll try to check string matching or simple inclusion.
      const formattedFilterDate = new Date(uploadDateFilter).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      dateMatch = doc.uploadDate.includes(formattedFilterDate) || doc.uploadDate.includes(uploadDateFilter);
    }

    return titleMatch && categoryMatch && employeeMatch && dateMatch;
  });

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadStatus({ type: null, message: '' });

    if (!docTitle.trim()) {
      setUploadStatus({ type: 'error', message: 'Please enter a document title.' });
      return;
    }
    if (!selectedFile) {
      setUploadStatus({ type: 'error', message: 'Please select a file to upload.' });
      return;
    }

    // Validate type (PDF, DOC, DOCX, JPG, PNG)
    const allowedExtensions = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExtensions.includes(fileExtension)) {
      setUploadStatus({ 
        type: 'error', 
        message: 'Unsupported file format. Please upload PDF, DOC, DOCX, JPG, or PNG files only.' 
      });
      return;
    }

    // Validate size (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxSize) {
      setUploadStatus({ 
        type: 'error', 
        message: 'File is too large. Maximum allowed size is 10MB.' 
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploaded = await documentService.uploadDocument(
        docTitle,
        docCategoryId,
        selectedFile,
        docEmployeeId ? docEmployeeId : undefined,
        docDescription,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      if (uploaded) {
        setUploadStatus({ type: 'success', message: 'Document uploaded successfully!' });
        setDocTitle('');
        setDocDescription('');
        setSelectedFile(null);
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadStatus({ type: null, message: '' });
          loadDocumentsData();
        }, 1200);
      } else {
        setUploadStatus({ type: 'error', message: 'Upload failed. Check backend credentials or logs.' });
      }
    } catch (err: any) {
      setUploadStatus({ type: 'error', message: err.response?.data?.detail || 'An error occurred during file upload.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;

    try {
      // Find category ID by name or match
      const matchedCat = categories.find(c => c.id === Number(showEditModal.category_id)) || categories[0];
      const updated = await documentService.updateDocument(
        showEditModal.id,
        showEditModal.name,
        matchedCat ? matchedCat.id : 1,
        showEditModal.description
      );

      if (updated) {
        setShowEditModal(null);
        loadDocumentsData();
      }
    } catch (err) {
      console.error('Failed to update document', err);
    }
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      await documentService.downloadDocument(id, name);
    } catch (err) {
      console.error('Failed to download document:', err);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const res = await documentService.archiveDocument(id);
      if (res) {
        loadDocumentsData();
      }
    } catch (err) {
      console.error('Failed to archive document:', err);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await documentService.restoreDocument(id);
      if (res) {
        loadDocumentsData();
      }
    } catch (err) {
      console.error('Failed to restore document:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this document? This cannot be undone.')) {
      try {
        const success = await documentService.deleteDocument(id);
        if (success) {
          loadDocumentsData();
        }
      } catch (err) {
        console.error('Failed to delete document:', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="flex flex-col justify-between space-y-3 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-2xl flex items-center space-x-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <span>Secure Document Vault</span>
          </h1>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            {isHR 
              ? 'Store, manage, and audit employee credentials and company agreements' 
              : 'Access, download, and review your personal employment documents'}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {isHR && (
            <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveTab('vault')}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === 'vault'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Vault
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === 'logs'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Activity Logs
              </button>
            </div>
          )}

          {isHR && (
            <button
              onClick={() => {
                setUploadStatus({ type: null, message: '' });
                setShowUploadModal(true);
              }}
              className="inline-flex h-9 items-center space-x-1.5 rounded-lg bg-blue-600 px-4 text-xs font-extrabold text-white hover:bg-blue-700 shadow-sm transition"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Document</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-700 dark:bg-rose-950/20 dark:border-rose-900">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {activeTab === 'vault' ? (
        <>
          {/* Vault Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Vault Packages</span>
              <span className="text-2xl font-black text-slate-950 dark:text-white mt-1 block">
                {loading ? '...' : totalDocs}
              </span>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Packages</span>
                <span className="text-2xl font-black text-emerald-500 mt-1 block">
                  {loading ? '...' : activeDocs}
                </span>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Archived / Expired</span>
                <span className="text-2xl font-black text-amber-500 mt-1 block">
                  {loading ? '...' : archivedDocs}
                </span>
              </div>
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Deleted / Missing</span>
                <span className="text-2xl font-black text-rose-500 mt-1 block">
                  {loading ? '...' : deletedDocs}
                </span>
              </div>
              <div className="rounded-lg bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/40" style={{ color: '#ef4444' }}>
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>

          </div>

          {/* Search & Filtering Controls */}
          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <div className="grid gap-3 md:grid-cols-4">
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-250 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Category selector */}
              <div className="relative">
                <Layers className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-250 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="All">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Employee selector (HR only) */}
              <div className="relative">
                <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  disabled={!isHR}
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-250 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"
                >
                  <option value="All">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              {/* Upload date filter */}
              <div className="relative">
                <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={uploadDateFilter}
                  onChange={(e) => setUploadDateFilter(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-250 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

            </div>
          </div>

          {/* Main Table Ledger */}
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                    <th className="px-6 py-4">Document Title</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Uploaded By / Employee</th>
                    <th className="px-6 py-4">Upload Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700 dark:divide-slate-800/40 dark:text-slate-350">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-semibold">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Activity className="h-6 w-6 animate-spin text-blue-600" />
                          <span>Loading vault database...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredDocs.length > 0 ? (
                    filteredDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                            <div>
                              <span className="text-slate-900 dark:text-white font-extrabold tracking-tight">{doc.name}</span>
                              {doc.description && (
                                <p className="text-[10px] text-slate-400 font-medium font-semibold">{doc.description}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {doc.category}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">
                              {doc.ownerName ? doc.ownerName[0] : 'U'}
                            </div>
                            <span className="font-semibold text-slate-650 dark:text-slate-350">{doc.ownerName}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-slate-400 font-mono font-semibold">{doc.uploadDate}</td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            doc.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                              : doc.status === 'Expired'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450'
                          }`}>
                            {doc.status === 'Expired' ? 'Archived' : doc.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right space-x-1">
                          <button
                            onClick={() => handleDownload(doc.id, doc.name)}
                            className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 dark:hover:bg-blue-950/30 transition"
                            title="Download Document"
                          >
                            <Download className="h-4.5 w-4.5" />
                          </button>
                          
                          {isHR && (
                            <>
                              <button
                                onClick={() => setShowEditModal(doc)}
                                className="p-1.5 rounded hover:bg-slate-50 text-slate-400 hover:text-slate-600 dark:hover:bg-slate-800 transition"
                                title="Edit Document"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>

                              {doc.status === 'Active' ? (
                                <button
                                  onClick={() => handleArchive(doc.id)}
                                  className="p-1.5 rounded hover:bg-amber-50 text-slate-400 hover:text-amber-600 dark:hover:bg-amber-950/30 transition"
                                  title="Archive Document"
                                >
                                  <Archive className="h-4.5 w-4.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRestore(doc.id)}
                                  className="p-1.5 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 dark:hover:bg-emerald-950/30 transition"
                                  title="Restore Document"
                                >
                                  <RotateCcw className="h-4.5 w-4.5" />
                                </button>
                              )}
                              
                              <button
                                onClick={() => handleDelete(doc.id)}
                                className="p-1.5 rounded hover:bg-rose-50 text-slate-405 hover:text-rose-600 dark:hover:bg-rose-950/30 transition"
                                title="Delete Document"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            </>
                          )}
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-450 font-semibold">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <FileMinus className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                          <span>No documents match the current search filters.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Activity Logs View */
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
              <Activity className="h-4 w-4 text-blue-600" />
              <span>HR Audit Activity Trail</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Logs of all uploads, updates, archives, restores, and downloads</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Document Title</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700 dark:divide-slate-800/40 dark:text-slate-350">
                {activityLogs.length > 0 ? (
                  activityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-900 dark:text-white">{log.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          log.action === 'Download' 
                            ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400'
                            : log.action === 'Upload'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-semibold">{log.document_title}</td>
                      <td className="px-6 py-4 text-slate-400 font-mono font-semibold">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-405 font-semibold">
                      No actions logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-105 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-widest">Upload Document Dossier</h3>
              <button 
                onClick={() => {
                  if (!isUploading) setShowUploadModal(false);
                }} 
                className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {uploadStatus.message && (
              <div className={`mt-3 rounded p-3 text-xs font-bold ${
                uploadStatus.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' 
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400'
              }`}>
                {uploadStatus.message}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Document Title *</label>
                <input
                  required
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Non-Disclosure Agreement"
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Category *</label>
                  <select
                    value={docCategoryId}
                    onChange={(e) => setDocCategoryId(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Link to Employee</label>
                  <select
                    value={docEmployeeId}
                    onChange={(e) => setDocEmployeeId(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="">General Company Document</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Description</label>
                <textarea
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Provide document overview..."
                  rows={2}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">File Attachment *</label>
                <input
                  required
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-800 dark:file:text-slate-200"
                />
                <p className="text-[9px] text-slate-400 mt-1 font-semibold">Supported formats: PDF, DOC, DOCX, JPG, PNG (Max size: 10MB)</p>
              </div>

              {isUploading && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-450">
                    <span>Uploading file...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex space-x-2.5">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 border border-slate-200 rounded-lg py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-750 dark:text-slate-350 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center space-x-1"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* EDIT DOCUMENT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-105 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-widest">Edit Document Title</h3>
              <button onClick={() => setShowEditModal(null)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Document Title *</label>
                <input
                  required
                  type="text"
                  value={showEditModal.name}
                  onChange={(e) => setShowEditModal({ ...showEditModal, name: e.target.value })}
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Description</label>
                <textarea
                  value={showEditModal.description || ''}
                  onChange={(e) => setShowEditModal({ ...showEditModal, description: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="flex-1 border border-slate-200 rounded-lg py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-750 dark:text-slate-350 dark:hover:bg-slate-800"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-xs font-extrabold hover:bg-blue-700 transition"
                >
                  Save Title
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
