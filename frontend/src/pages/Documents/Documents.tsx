import React, { useState, useEffect, useRef } from 'react';
import { useHR } from '../../context/HRContext';
import { documentService } from '../../services/documentService';
import { 
  FileText, 
  Download, 
  Upload, 
  Trash2, 
  Search, 
  Filter, 
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
  Shield,
  FileMinus,
  Edit2,
  Eye,
  HardDrive,
  Files,
  Check,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet
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
  const { employees, user } = useHR();
  
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
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [uploadDateFilter, setUploadDateFilter] = useState<string>('');
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'vault' | 'logs'>('vault');

  // Modal / Form states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState<any | null>(null);
  const [previewDocument, setPreviewDocument] = useState<any | null>(null);
  
  // Upload form input states
  const [docTitle, setDocTitle] = useState('');
  const [docCategoryId, setDocCategoryId] = useState<number>(0);
  const [docEmployeeId, setDocEmployeeId] = useState<string>('');
  const [docDescription, setDocDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  
  // Upload status states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Drag & drop state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const pendingDocsCount = documents.filter(d => d.status === 'Pending Verification').length;
  const employeeDocsCount = documents.filter(d => d.employeeId || d.ownerName !== 'Admin' && d.ownerName !== 'System').length;
  
  // Recent uploads in last 7 days
  const recentDocsCount = documents.filter(d => {
    try {
      const uploadDate = new Date(d.uploadDate);
      const diffTime = Math.abs(new Date().getTime() - uploadDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    } catch {
      return false;
    }
  }).length;

  // Total Storage Size in MB
  const totalStorageBytes = documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);
  const totalStorageMB = (totalStorageBytes / (1024 * 1024)).toFixed(2);

  // Format Helper for File Size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Filter logic
  const filteredDocs = documents.filter(doc => {
    const titleMatch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const categoryMatch = selectedCategory === 'All' || doc.category.toLowerCase() === selectedCategory.toLowerCase();
    const statusMatch = selectedStatus === 'All' || doc.status === selectedStatus;
    
    let employeeMatch = true;
    if (isHR && selectedEmployeeId !== 'All') {
      const emp = employees.find(e => e.id === selectedEmployeeId);
      if (emp) {
        employeeMatch = doc.ownerName.toLowerCase().includes(emp.name.toLowerCase());
      } else {
        employeeMatch = false;
      }
    }

    let dateMatch = true;
    if (uploadDateFilter) {
      const formattedFilterDate = new Date(uploadDateFilter).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      dateMatch = doc.uploadDate.includes(formattedFilterDate) || doc.uploadDate.includes(uploadDateFilter);
    }

    return titleMatch && categoryMatch && employeeMatch && dateMatch && statusMatch;
  });

  // Paginated docs
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDocs = filteredDocs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setUploadStatus({ type: null, message: '' });

    // Validate type (PDF, DOC, DOCX, JPG, PNG)
    const allowedExtensions = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExtensions.includes(fileExtension)) {
      setUploadStatus({ 
        type: 'error', 
        message: 'Unsupported file format. Please upload PDF, DOC, DOCX, JPG, or PNG files only.' 
      });
      return;
    }

    // Validate size (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setUploadStatus({ 
        type: 'error', 
        message: 'File is too large. Maximum allowed size is 10MB.' 
      });
      return;
    }

    setSelectedFile(file);
    setDocTitle(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);

    // Create preview URL if it is an image
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreviewUrl(null);
    }
  };

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
        setUploadStatus({ type: 'success', message: 'Document uploaded successfully and queued for verification!' });
        setDocTitle('');
        setDocDescription('');
        setSelectedFile(null);
        setFilePreviewUrl(null);
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

  const handleReplaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReplaceModal || !selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const replaced = await documentService.replaceDocument(
        showReplaceModal.id,
        selectedFile,
        showReplaceModal.name,
        showReplaceModal.category_id || categories[0]?.id,
        showReplaceModal.description || '',
        (progress) => {
          setUploadProgress(progress);
        }
      );

      if (replaced) {
        setUploadStatus({ type: 'success', message: 'Document replaced successfully!' });
        setSelectedFile(null);
        setTimeout(() => {
          setShowReplaceModal(null);
          setUploadStatus({ type: null, message: '' });
          loadDocumentsData();
        }, 1200);
      }
    } catch (err: any) {
      setUploadStatus({ type: 'error', message: 'Replacement failed.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;

    try {
      const matchedCat = categories.find(c => c.name === showEditModal.category) || categories[0];
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

  const handleApprove = async (id: string) => {
    try {
      const res = await documentService.approveDocument(id);
      if (res) {
        loadDocumentsData();
      }
    } catch (err) {
      console.error('Failed to approve document:', err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await documentService.rejectDocument(id);
      if (res) {
        loadDocumentsData();
      }
    } catch (err) {
      console.error('Failed to reject document:', err);
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
      <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
            <Shield className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            <span>Enterprise Documents Vault</span>
          </h1>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-350 mt-1">
            {isHR 
              ? 'Oversee employee certifications, verify uploads, and audit repository activities.' 
              : 'Securely manage, verify, and replace your official employment files.'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isHR && (
            <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveTab('vault')}
                className={`rounded-md px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
                  activeTab === 'vault'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Vault
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`rounded-md px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
                  activeTab === 'logs'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Activity Audit Trail
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setUploadStatus({ type: null, message: '' });
              setSelectedFile(null);
              setFilePreviewUrl(null);
              setShowUploadModal(true);
            }}
            className="inline-flex h-10 items-center space-x-2 rounded-lg bg-indigo-600 px-5 text-sm font-extrabold text-white hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm font-bold text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/60 dark:text-rose-300">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {activeTab === 'vault' ? (
        <>
          {/* Dashboard Statistics Grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between hover:shadow-md transition">
              <div>
                <span className="text-xs font-extrabold text-slate-500 dark:text-slate-350 uppercase tracking-wider block">Total Vault Files</span>
                <span className="text-3xl font-black text-slate-900 dark:text-white mt-2 block">
                  {loading ? '...' : totalDocs}
                </span>
              </div>
              <div className="flex items-center mt-3 text-xs text-slate-450 dark:text-slate-400">
                <Files className="h-4.5 w-4.5 text-indigo-500 mr-1.5" />
                <span>Overall storage assets</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between hover:shadow-md transition">
              <div>
                <span className="text-xs font-extrabold text-slate-500 dark:text-slate-350 uppercase tracking-wider block">Employee Dossiers</span>
                <span className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2 block">
                  {loading ? '...' : employeeDocsCount}
                </span>
              </div>
              <div className="flex items-center mt-3 text-xs text-slate-450 dark:text-slate-400">
                <User className="h-4.5 w-4.5 text-blue-500 mr-1.5" />
                <span>Linked to profiles</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between hover:shadow-md transition">
              <div>
                <span className="text-xs font-extrabold text-slate-500 dark:text-slate-350 uppercase tracking-wider block">Pending Verification</span>
                <span className="text-3xl font-black text-amber-605 dark:text-amber-400 mt-2 block">
                  {loading ? '...' : pendingDocsCount}
                </span>
              </div>
              <div className="flex items-center mt-3 text-xs text-slate-450 dark:text-slate-400">
                <Clock className="h-4.5 w-4.5 text-amber-500 mr-1.5" />
                <span>Requires HR review</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between hover:shadow-md transition">
              <div>
                <span className="text-xs font-extrabold text-slate-500 dark:text-slate-350 uppercase tracking-wider block">Recent Uploads (7d)</span>
                <span className="text-3xl font-black text-emerald-650 dark:text-emerald-400 mt-2 block">
                  {loading ? '...' : recentDocsCount}
                </span>
              </div>
              <div className="flex items-center mt-3 text-xs text-slate-450 dark:text-slate-400">
                <Activity className="h-4.5 w-4.5 text-emerald-500 mr-1.5" />
                <span>New files uploaded</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between hover:shadow-md transition">
              <div>
                <span className="text-xs font-extrabold text-slate-500 dark:text-slate-350 uppercase tracking-wider block">Storage Utilization</span>
                <span className="text-3xl font-black text-purple-600 dark:text-purple-400 mt-2 block">
                  {loading ? '...' : `${totalStorageMB} MB`}
                </span>
              </div>
              <div className="flex items-center mt-3 text-xs text-slate-450 dark:text-slate-400">
                <HardDrive className="h-4.5 w-4.5 text-purple-500 mr-1.5" />
                <span>Disk space consumed</span>
              </div>
            </div>

          </div>

          {/* Search, Status, and Category Filters */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
            <div className="grid gap-4 md:grid-cols-5">
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-550 dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="Search file name..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-extrabold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-950 transition-colors"
                />
              </div>

              {/* Category selector */}
              <div className="relative">
                <Layers className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-550 dark:text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-extrabold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-950 transition-colors"
                >
                  <option value="All" className="dark:bg-slate-900 font-extrabold text-slate-900 dark:text-white">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name} className="dark:bg-slate-900 font-semibold text-slate-900 dark:text-white">{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Status selector */}
              <div className="relative">
                <Filter className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-550 dark:text-slate-400" />
                <select
                  value={selectedStatus}
                  onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-extrabold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-950 transition-colors"
                >
                  <option value="All" className="dark:bg-slate-900 font-extrabold text-slate-900 dark:text-white">All Statuses</option>
                  <option value="Active" className="dark:bg-slate-900 font-semibold text-slate-900 dark:text-white">Active</option>
                  <option value="Pending Verification" className="dark:bg-slate-900 font-semibold text-slate-900 dark:text-white">Pending Verification</option>
                  <option value="Approved" className="dark:bg-slate-900 font-semibold text-slate-900 dark:text-white">Approved</option>
                  <option value="Rejected" className="dark:bg-slate-900 font-semibold text-slate-900 dark:text-white">Rejected</option>
                  <option value="Expired" className="dark:bg-slate-900 font-semibold text-slate-900 dark:text-white">Archived</option>
                </select>
              </div>

              {/* Employee selector (HR only) */}
              <div className="relative">
                <User className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-550 dark:text-slate-400" />
                <select
                  disabled={!isHR}
                  value={selectedEmployeeId}
                  onChange={(e) => { setSelectedEmployeeId(e.target.value); setCurrentPage(1); }}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-extrabold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-950 transition-colors disabled:opacity-50"
                >
                  <option value="All" className="dark:bg-slate-900 font-extrabold text-slate-900 dark:text-white">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id} className="dark:bg-slate-900 font-semibold text-slate-900 dark:text-white">{emp.name}</option>
                  ))}
                </select>
              </div>

              {/* Upload date filter */}
              <div className="relative">
                <Calendar className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-550 dark:text-slate-400" />
                <input
                  type="date"
                  value={uploadDateFilter}
                  onChange={(e) => { setUploadDateFilter(e.target.value); setCurrentPage(1); }}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-extrabold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-950 transition-colors"
                />
              </div>

            </div>
          </div>

          {/* Main Table Layout */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all duration-200">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200">
                    <th className="px-6 py-4.5">Document Title / Info</th>
                    <th className="px-6 py-4.5">Category</th>
                    <th className="px-6 py-4.5">Uploaded By / Employee</th>
                    <th className="px-6 py-4.5">File Details</th>
                    <th className="px-6 py-4.5">Status</th>
                    <th className="px-6 py-4.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-extrabold text-slate-800 dark:divide-slate-800/60 dark:text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-slate-500 font-bold dark:text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-3">
                           <Activity className="h-7 w-7 animate-spin text-indigo-600" />
                          <span className="text-slate-900 dark:text-white">Retrieving secure documents vault database...</span>
                        </div>
                      </td>
                    </tr>
                  ) : currentDocs.length > 0 ? (
                    currentDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-all duration-150">
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3.5">
                            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/60 p-2.5 flex-shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                              <FileText className="h-5.5 w-5.5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                              <span className="text-slate-950 dark:text-white font-bold text-sm tracking-tight hover:text-indigo-650 cursor-pointer" onClick={() => setPreviewDocument(doc)}>{doc.name}</span>
                              {doc.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5 max-w-sm line-clamp-1">{doc.description}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {doc.category}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900/70 flex items-center justify-center text-xs font-black text-indigo-750 dark:text-indigo-305 uppercase border border-indigo-200 dark:border-indigo-805">
                              {doc.ownerName ? doc.ownerName[0] : 'U'}
                            </div>
                            <span className="font-extrabold text-slate-900 dark:text-slate-200">{doc.ownerName}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-slate-600 dark:text-slate-350">
                          <div className="font-semibold space-y-0.5">
                            <div className="font-mono text-xs">{doc.uploadDate}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center">
                              <span>{formatFileSize(doc.fileSize)}</span>
                              {doc.fileType && (
                                <span className="uppercase ml-2 bg-slate-205 dark:bg-slate-800 px-1 rounded text-[9px] border border-slate-300 dark:border-slate-700">{doc.fileType}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-extrabold tracking-wide border ${
                            doc.status === 'Active' || doc.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-950 border-emerald-305 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-900/60'
                              : doc.status === 'Pending Verification'
                              ? 'bg-amber-100 text-amber-950 border-amber-305 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-900/60'
                              : doc.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-950 border-rose-305 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-900/60'
                              : 'bg-slate-100 text-slate-950 border-slate-300 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700'
                          }`}>
                            {doc.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right space-x-1.5">
                          <button
                            onClick={() => setPreviewDocument(doc)}
                            className="p-2 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-650 dark:bg-slate-800 dark:hover:bg-indigo-950/40 dark:border-slate-700 dark:hover:border-indigo-900 transition-colors"
                            title="Preview Document"
                          >
                            <Eye className="h-4.5 w-4.5" />
                          </button>

                          <button
                            onClick={() => handleDownload(doc.id, doc.name)}
                            className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-650 dark:bg-slate-800 dark:hover:bg-blue-950/40 dark:border-slate-700 dark:hover:border-blue-900 transition-colors"
                            title="Download Document"
                          >
                            <Download className="h-4.5 w-4.5" />
                          </button>
                          
                          {/* HR Verification Controls */}
                          {isHR && doc.status === 'Pending Verification' && (
                            <>
                              <button
                                onClick={() => handleApprove(doc.id)}
                                className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 hover:border-emerald-400 text-emerald-800 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/80 dark:border-emerald-900 dark:hover:border-emerald-800 transition-colors"
                                title="Approve Document"
                              >
                                <Check className="h-4.5 w-4.5" />
                              </button>
                              <button
                                onClick={() => handleReject(doc.id)}
                                className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-250 hover:border-rose-400 text-rose-800 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 dark:border-rose-900 dark:hover:border-rose-800 transition-colors"
                                title="Reject Document"
                              >
                                <X className="h-4.5 w-4.5" />
                              </button>
                            </>
                          )}

                          {/* Employee Actions / HR Actions */}
                          {(!isHR || doc.ownerName === user?.username || doc.employeeId === user?.employee_profile?.id) && (
                            <button
                              onClick={() => {
                                setUploadStatus({ type: null, message: '' });
                                setSelectedFile(null);
                                setShowReplaceModal(doc);
                              }}
                              className="p-2 rounded-lg bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-600 hover:text-amber-650 dark:bg-slate-800 dark:hover:bg-amber-950/40 dark:border-slate-700 dark:hover:border-amber-900 transition-colors"
                              title="Replace File"
                            >
                              <RefreshCw className="h-4.5 w-4.5" />
                            </button>
                          )}

                          {isHR ? (
                            <>
                              <button
                                onClick={() => setShowEditModal(doc)}
                                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-705 transition-colors"
                                title="Edit Info"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>

                              {doc.status !== 'Expired' ? (
                                <button
                                  onClick={() => handleArchive(doc.id)}
                                  className="p-2 rounded-lg bg-slate-50 hover:bg-amber-55 border border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 hover:text-amber-600 transition-colors"
                                  title="Archive File"
                                >
                                  <Archive className="h-4.5 w-4.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRestore(doc.id)}
                                  className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-55 border border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 hover:text-emerald-600 transition-colors"
                                  title="Restore File"
                                >
                                  <RotateCcw className="h-4.5 w-4.5" />
                                </button>
                              )}
                              
                              <button
                                onClick={() => handleDelete(doc.id)}
                                className="p-2 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-305 text-rose-500 hover:text-rose-700 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:border-slate-700 dark:hover:border-rose-900 transition-colors"
                                title="Delete File"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            </>
                          ) : (
                            // Employee delete action for their own files
                            (doc.ownerName === user?.username || doc.employeeId === user?.employee_profile?.id) && (
                              <button
                                onClick={() => handleDelete(doc.id)}
                                className="p-2 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-305 text-rose-500 hover:text-rose-700 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:border-slate-700 dark:hover:border-rose-900 transition-colors"
                                title="Delete Document"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            )
                          )}
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-slate-500 dark:text-slate-400 font-bold">
                        <div className="flex flex-col items-center justify-center space-y-3">
                           <FileMinus className="h-12 w-12 text-slate-300 dark:text-slate-705" />
                          <span className="text-slate-900 dark:text-white text-sm">No vault documents found matching the active query criteria.</span>
                          <p className="text-xs text-slate-450 dark:text-slate-400 font-semibold">Try modifying filters or upload a new file.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-4.5 bg-slate-50/50 dark:bg-slate-800/10">
                <div className="text-xs font-semibold text-slate-550 dark:text-slate-400">
                  Showing <span className="font-extrabold text-slate-850 dark:text-slate-200">{indexOfFirstItem + 1}</span> to <span className="font-extrabold text-slate-850 dark:text-slate-200">{Math.min(indexOfLastItem, filteredDocs.length)}</span> of <span className="font-extrabold text-slate-850 dark:text-slate-200">{filteredDocs.length}</span> vault records
                </div>
                <div className="flex space-x-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-250 bg-white text-xs font-extrabold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => handlePageChange(index + 1)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                        currentPage === index + 1
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'border border-slate-250 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-250 bg-white text-xs font-extrabold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Activity Logs View */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all duration-200">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-805/30">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-900 dark:text-white flex items-center space-x-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              <span>HR Audit Activity Trail Ledger</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold font-sans">Full cryptographic details of all document uploads, audit approvals, downloads, replacements, and deletes.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200">
                  <th className="px-6 py-4">Security User</th>
                  <th className="px-6 py-4">Transaction Code</th>
                  <th className="px-6 py-4">Document Title</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs font-extrabold text-slate-800 dark:divide-slate-800/60 dark:text-slate-300">
                {activityLogs.length > 0 ? (
                  activityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-150">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="h-6 w-6 rounded-full bg-slate-105 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {log.username ? log.username[0] : 'U'}
                          </div>
                          <span className="font-extrabold text-slate-950 dark:text-white">{log.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wide border ${
                          log.action === 'Download' 
                            ? 'bg-sky-100 text-sky-950 border-sky-305 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60'
                            : log.action === 'Upload'
                            ? 'bg-emerald-100 text-emerald-950 border-emerald-305 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
                            : 'bg-amber-100 text-amber-950 border-amber-305 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-900 dark:text-slate-200 font-extrabold">{log.document_title}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono font-semibold">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center text-slate-550 dark:text-slate-400 font-bold">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Activity className="h-8 w-8 text-slate-300" />
                        <span>No audit records exist in database.</span>
                      </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center">
                <Upload className="h-5 w-5 text-indigo-650 mr-2" />
                <span>Upload New Secure Dossier</span>
              </h3>
              <button 
                onClick={() => {
                  if (!isUploading) {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setFilePreviewUrl(null);
                  }
                }} 
                className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {uploadStatus.message && (
              <div className={`mt-4 rounded-xl p-4 text-xs font-bold border flex items-start space-x-2.5 ${
                uploadStatus.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-950 border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/60' 
                  : 'bg-rose-50 text-rose-955 border-rose-250 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/60'
              }`}>
                {uploadStatus.type === 'success' ? <CheckCircle className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0" /> : <AlertTriangle className="h-4.5 w-4.5 text-rose-605 flex-shrink-0" />}
                <span>{uploadStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
              
              {/* Drag & Drop Area */}
              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
                  dragActive 
                    ? 'border-indigo-600 bg-indigo-50/30 dark:border-indigo-500 dark:bg-indigo-950/20' 
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-slate-650'
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                
                {selectedFile ? (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-center space-x-3.5 text-slate-850 dark:text-slate-205">
                      <FileSpreadsheet className="h-9 w-9 text-emerald-600" />
                      <div className="text-left">
                        <p className="text-xs font-black max-w-[250px] truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-500 font-semibold">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                    {filePreviewUrl && (
                      <div className="relative mx-auto max-w-[120px] max-h-[120px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-950 p-1">
                        <img src={filePreviewUrl} alt="Preview" className="w-full h-full object-cover rounded" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setFilePreviewUrl(null);
                          }}
                          className="absolute -top-1 -right-1 p-1 bg-rose-600 rounded-full text-white hover:bg-rose-700 transition"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="mx-auto h-11 w-11 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-650 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">Drag & drop your file here, or <span className="text-indigo-600 dark:text-indigo-400 underline cursor-pointer">browse</span></p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-450 font-semibold">Supports PDF, DOC, DOCX, JPG, PNG (Max 10MB)</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Document Title *</label>
                <input
                  required
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Identity Card Passport"
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-950 transition-colors"
                />
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Category *</label>
                  <select
                    value={docCategoryId}
                    onChange={(e) => setDocCategoryId(Number(e.target.value))}
                    className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs text-slate-950 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-950 transition-colors"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id} className="dark:bg-slate-900">{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Link to Employee</label>
                  <select
                    disabled={!isHR}
                    value={docEmployeeId}
                    onChange={(e) => setDocEmployeeId(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs text-slate-950 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-950 transition-colors disabled:opacity-50"
                  >
                    {isHR ? (
                      <>
                        <option value="" className="dark:bg-slate-900">General Company File</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id} className="dark:bg-slate-900">{emp.name}</option>
                        ))}
                      </>
                    ) : (
                      <option value={user?.employee_profile?.id || ""} className="dark:bg-slate-900">{user?.username || 'Myself'}</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Description</label>
                <textarea
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Summarize document purpose for compliance auditing..."
                  rows={2}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-950 transition-colors resize-none"
                />
              </div>

              {isUploading && (
                <div className="space-y-2 pt-2 animate-pulse">
                  <div className="flex justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <span>Uploading cryptographic asset packet...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-105 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 flex space-x-3.5">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setFilePreviewUrl(null);
                  }}
                  className="flex-1 border border-slate-300 rounded-xl py-3 text-xs font-black text-slate-750 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-xs font-black hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all disabled:opacity-40 flex items-center justify-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>{isUploading ? 'Uploading...' : 'Verify & Upload'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* REPLACE DOCUMENT MODAL */}
      {showReplaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-950 dark:text-white uppercase tracking-wider">Replace Document File</h3>
              <button onClick={() => setShowReplaceModal(null)} className="rounded-lg p-1.5 hover:bg-slate-105 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReplaceSubmit} className="mt-4 space-y-4">
              <div 
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                  dragActive ? 'border-indigo-600 bg-indigo-50/20' : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40'
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileSpreadsheet className="h-8 w-8 text-emerald-600 mx-auto" />
                    <p className="text-xs font-black truncate">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">{formatFileSize(selectedFile.size)}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-5 w-5 mx-auto text-indigo-500" />
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">Click or drag new version to replace</p>
                  </div>
                )}
              </div>

              {isUploading && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-bold text-indigo-600">
                    <span>Replacing file...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-105 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setShowReplaceModal(null)}
                  className="flex-1 border border-slate-300 rounded-xl py-3 text-xs font-black text-slate-750 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="flex-1 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl py-3 text-xs font-black disabled:opacity-40"
                >
                  Save New Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DOCUMENT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-950 dark:text-white uppercase tracking-wider">Update Document Metadata</h3>
              <button onClick={() => setShowEditModal(null)} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Document Title *</label>
                <input
                  required
                  type="text"
                  value={showEditModal.name}
                  onChange={(e) => setShowEditModal({ ...showEditModal, name: e.target.value })}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-805 dark:text-white focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Description</label>
                <textarea
                  value={showEditModal.description || ''}
                  onChange={(e) => setShowEditModal({ ...showEditModal, description: e.target.value })}
                  rows={2}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-805 dark:text-white focus:outline-none focus:border-indigo-600 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="flex-1 border border-slate-300 rounded-xl py-3 text-xs font-black text-slate-750 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-xs font-black hover:bg-indigo-750 shadow-md"
                >
                  Save Title & Info
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6 text-indigo-650 dark:text-indigo-400" />
                <div>
                  <h3 className="text-base font-black text-slate-955 dark:text-white tracking-tight">{previewDocument.name}</h3>
                  <p className="text-[10px] uppercase font-black tracking-wider text-slate-500 mt-0.5">{previewDocument.category} | Version 1.0</p>
                </div>
              </div>
              <button onClick={() => setPreviewDocument(null)} className="rounded-lg p-1.5 hover:bg-slate-200 dark:hover:bg-slate-850">
                <X className="h-5.5 w-5.5 text-slate-500" />
              </button>
            </div>

            {/* Preview Body */}
            <div className="p-6 bg-slate-55 dark:bg-slate-950 flex flex-col items-center justify-center min-h-[350px] max-h-[60vh] overflow-y-auto">
              
              {/* If image */}
              {previewDocument.fileUrl && (previewDocument.fileUrl.endsWith('.png') || previewDocument.fileUrl.endsWith('.jpg') || previewDocument.fileUrl.endsWith('.jpeg') || previewDocument.fileType?.includes('png') || previewDocument.fileType?.includes('jpg')) ? (
                <img 
                  src={previewDocument.fileUrl} 
                  alt={previewDocument.name} 
                  className="max-w-full max-h-[50vh] object-contain rounded-lg shadow border border-slate-200 dark:border-slate-800" 
                />
              ) : previewDocument.fileUrl && previewDocument.fileUrl.endsWith('.pdf') ? (
                // PDF Viewer
                <iframe 
                  src={previewDocument.fileUrl} 
                  title={previewDocument.name} 
                  className="w-full h-[50vh] border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm"
                />
              ) : (
                // Fallback for non-image/non-pdf or mock files
                <div className="text-center space-y-4 max-w-sm">
                  <div className="mx-auto h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-650 dark:text-indigo-400">
                    <FileText className="h-9 w-9" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">Document Preview Unavailable</p>
                    <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 font-semibold">Pre-visualization is restricted to PDF and image extensions (PNG, JPG). Please download the dossier locally to inspect.</p>
                  </div>
                  <div className="pt-2 flex justify-center space-x-3">
                    <button
                      onClick={() => handleDownload(previewDocument.id, previewDocument.name)}
                      className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-xs font-black shadow-sm"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download File</span>
                    </button>
                    <button
                      onClick={() => setPreviewDocument(null)}
                      className="border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-55 dark:border-slate-700 dark:text-slate-300"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Footer */}
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-550 dark:text-slate-400">
                Uploaded by <span className="font-extrabold text-slate-800 dark:text-white">{previewDocument.ownerName}</span> on {previewDocument.uploadDate}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleDownload(previewDocument.id, previewDocument.name)}
                  className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-xs font-black shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
                {isHR && previewDocument.status === 'Pending Verification' && (
                  <>
                    <button
                      onClick={() => {
                        handleApprove(previewDocument.id);
                        setPreviewDocument(null);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2.5 text-xs font-black shadow-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        handleReject(previewDocument.id);
                        setPreviewDocument(null);
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-4 py-2.5 text-xs font-black shadow-sm"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
