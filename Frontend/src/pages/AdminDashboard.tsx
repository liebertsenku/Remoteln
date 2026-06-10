import { useState, useEffect, useRef } from 'react';
import { 
  RefreshCcw, Activity, LayoutDashboard, Users, Database, LogOut, 
  Bell, Settings, Briefcase, Download, Trash2, X 
} from 'lucide-react';
import { 
  createExternalRefreshRequest, getExternalRefreshStatus, 
  getAdminStats, getAdminRecentUsers, getJobs,
  deleteAdminUser, deleteAdminJob, updateAdminJobStatus, register
} from '../lib/api';
import type { SyncStatusResponse, AdminStatsResponse, UserResponse, JobResponse, RegisterPayload } from '../types/api';
import Swal from 'sweetalert2';

type TabType = 'overview' | 'users' | 'jobs' | 'sync';

export default function AdminDashboard({ token, onLogout }: { token: string | null, onLogout?: () => void }) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Data State
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Sync State
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [loadingSync, setLoadingSync] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [currentReqId, setCurrentReqId] = useState<number | null>(null);

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState<RegisterPayload>({ name: '', email: '', password: '', role: 'jobseeker' });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState('');

  // Dropdown State
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = async () => {
    if (!token) return;
    setLoadingData(true);
    try {
      const [statsData, usersData, jobsData] = await Promise.all([
        getAdminStats(token),
        getAdminRecentUsers(token, 50),
        getJobs()
      ]);
      setStats(statsData);
      setUsers(usersData);
      setJobs(jobsData);
    } catch (error) {
      console.error("Failed to load admin data", error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [token]);

  // Sync Logic
  const handleSync = async () => {
    if (!token) return;
    setLoadingSync(true);
    setSyncError('');
    try {
      const res = await createExternalRefreshRequest(token);
      setCurrentReqId(res.request_id);
    } catch (err: any) {
      setSyncError(err.message || 'Failed to trigger sync');
      setLoadingSync(false);
    }
  };

  useEffect(() => {
    if (!currentReqId || !token) return;
    const interval = setInterval(async () => {
      try {
        const status = await getExternalRefreshStatus(token, currentReqId);
        setSyncStatus(status);
        if (status.status === 'success' || status.status === 'failed') {
          clearInterval(interval);
          setLoadingSync(false);
        }
      } catch (err: any) {
        clearInterval(interval);
        setSyncError(err.message || 'Failed to get status');
        setLoadingSync(false);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [currentReqId, token]);

  // Handlers
  const handleDeleteUser = async (userId: number) => {
    if (!token || !window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteAdminUser(token, userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      alert('User deleted successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    if (!token || !window.confirm('Are you sure you want to delete this job?')) return;
    try {
      await deleteAdminJob(token, jobId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
      alert('Job deleted successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to delete job');
    }
  };

  const handleToggleJobStatus = async (jobId: number, currentStatus: boolean) => {
    if (!token) return;
    try {
      const updatedJob = await updateAdminJobStatus(token, jobId, { is_active: !currentStatus });
      setJobs(prev => prev.map(j => j.id === jobId ? updatedJob : j));
    } catch (err: any) {
      alert(err.message || 'Failed to update job status');
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError('');
    setIsAddingUser(true);
    try {
      await register(newUser);
      setIsAddUserOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'jobseeker' });
      await loadData();
      alert('User created successfully.');
    } catch (err: any) {
      setAddUserError(err.message || 'Failed to create user');
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleGenerateReport = () => {
    alert("Report generation is not implemented yet. (Coming soon)");
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'jobs', label: 'Job Management', icon: Briefcase },
    { id: 'sync', label: 'External API Sync', icon: RefreshCcw },
  ] as const;

  return (
    <div className="flex min-h-screen bg-[#f8f9fc] border-t border-slate-200/50">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex shrink-0">
        <div className="p-6 pb-8">
          <h1 className="text-2xl font-bold text-indigo-600 tracking-tight">RemoteIn</h1>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Enterprise Admin</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold transition-all ${
                  isActive 
                    ? 'bg-indigo-50/80 text-indigo-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 text-[14px] font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <LogOut className="h-5 w-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-20 bg-[#f8f9fc] flex items-center justify-end px-10 gap-6">
          <button 
            onClick={() => Swal.fire({ title: 'Notifications', text: 'You have no new notifications.', icon: 'info', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 })}
            className="text-slate-400 hover:text-slate-600 transition-colors relative"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
          </button>
          <button 
            onClick={() => Swal.fire({ title: 'Settings', text: 'Admin settings module coming soon.', icon: 'info', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 })}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Settings className="h-5 w-5" />
          </button>

          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-slate-200 hover:ring-2 hover:ring-indigo-500/20 transition-all focus:outline-none"
            >
              A
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-48 origin-top-right rounded-2xl border border-slate-200/60 bg-white p-2 shadow-2xl ring-1 ring-black/5 focus:outline-none animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-sm font-bold text-slate-900 truncate">Administrator</p>
                  <span className="inline-block mt-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-purple-100">
                    System Admin
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 px-10 pb-12 max-w-[1200px] w-full">
          
          {loadingData ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-200 border-t-indigo-600"></div>
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div>
                    <h2 className="text-3xl font-extrabold text-[#111827] tracking-tight">Dashboard Overview</h2>
                    <p className="text-slate-500 mt-2 text-[15px]">High-level metrics and system status.</p>
                  </div>

                  {/* Banner */}
                  <div className="rounded-[1.5rem] bg-gradient-to-r from-[#f0f3ff] to-[#e8ebff] p-10 border border-white shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-[#dbe0fe] blur-3xl opacity-50" />
                    <div className="relative z-10">
                      <h3 className="text-2xl font-bold text-[#111827] mb-2">Welcome to Admin Console</h3>
                      <p className="text-slate-600 mb-6 max-w-2xl text-[15px] leading-relaxed">
                        Monitor platform health, manage user accounts, and oversee job synchronization across external boards. Your system is running smoothly today.
                      </p>
                      <button 
                        onClick={handleGenerateReport}
                        className="inline-flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm"
                      >
                        Generate Report <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <p className="text-[13px] font-extrabold text-slate-600 uppercase tracking-widest">Total Users</p>
                        <div className="p-2 bg-slate-100 rounded-xl"><Users className="h-5 w-5 text-slate-700" /></div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-[3.5rem] font-black text-[#111827] leading-none tracking-tight">
                          {(stats?.users.total || 0) > 1000 ? `${((stats?.users.total || 0)/1000).toFixed(1)}k` : stats?.users.total || 0}
                        </p>
                        <span className="text-emerald-500 text-lg font-bold">↗</span>
                      </div>
                    </div>
                    
                    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <p className="text-[13px] font-extrabold text-slate-600 uppercase tracking-widest">Jobseekers</p>
                        <div className="p-2 bg-indigo-50 rounded-xl"><Users className="h-5 w-5 text-[#6344F5]" /></div>
                      </div>
                      <p className="text-[3.5rem] font-black text-[#6344F5] leading-none tracking-tight">
                        {(stats?.users.jobseekers || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <p className="text-[13px] font-extrabold text-slate-600 uppercase tracking-widest">Employers</p>
                        <div className="p-2 bg-rose-50 rounded-xl"><Briefcase className="h-5 w-5 text-rose-500" /></div>
                      </div>
                      <p className="text-[3.5rem] font-black text-rose-600 leading-none tracking-tight">
                        {(stats?.users.employers || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <p className="text-[13px] font-extrabold text-slate-600 uppercase tracking-widest">Total Jobs</p>
                        <div className="p-2 bg-purple-50 rounded-xl"><Briefcase className="h-5 w-5 text-purple-500" /></div>
                      </div>
                      <div>
                        <p className="text-[3.5rem] font-black text-[#111827] leading-none tracking-tight mb-2">
                          {(stats?.jobs.internal || 0) + (stats?.jobs.external || 0)}
                        </p>
                        <p className="text-[13px] text-slate-500 font-bold">
                          {stats?.jobs.internal || 0} Internal / {stats?.jobs.external || 0} External
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* USER MANAGEMENT TAB */}
              {activeTab === 'users' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-3xl font-extrabold text-[#111827] tracking-tight">Recent Users</h2>
                      <p className="text-slate-500 mt-2 text-[15px]">Manage and review recent platform registrations.</p>
                    </div>
                    <button 
                      onClick={() => setIsAddUserOpen(true)}
                      className="bg-[#4f46e5] hover:bg-[#4338ca] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm"
                    >
                      + Add User
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-[#f8f9fc] border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wide">User</th>
                          <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wide">Role</th>
                          <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wide">Joined At</th>
                          <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wide text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users.slice(0, 5).map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f0f3ff] text-indigo-600 font-bold text-[15px]">
                                  {u.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 text-[15px]">{u.name}</p>
                                  <p className="text-slate-500 text-[13px] mt-0.5">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                                u.role === 'admin' ? 'bg-purple-50 text-purple-700' :
                                u.role === 'employer' ? 'bg-rose-50 text-rose-700' :
                                'bg-indigo-50 text-indigo-700'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-slate-500 text-[14px] font-medium">
                              {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-5 text-right">
                              <button 
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No users found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* JOB MANAGEMENT TAB */}
              {activeTab === 'jobs' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div>
                    <h2 className="text-3xl font-extrabold text-[#111827] tracking-tight">Internal Job Management</h2>
                    <p className="text-slate-500 mt-2 text-[15px]">Monitor and moderate job postings created by employers.</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-[#f8f9fc] border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wide">Job Title & Company</th>
                          <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wide">Location & Salary</th>
                          <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wide">Posted By</th>
                          <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wide">Status</th>
                          <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wide text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {jobs.slice(0, 5).map((job) => (
                          <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-5">
                              <p className="font-bold text-slate-900 text-[14px]">{job.title}</p>
                              <p className="text-slate-500 text-[13px] mt-0.5">{job.company}</p>
                            </td>
                            <td className="px-6 py-5">
                              <p className="text-slate-900 text-[14px]">{job.location || 'Remote'}</p>
                              <p className="text-slate-500 text-[13px] mt-0.5">
                                {job.salary_min || job.salary_max ? `$${(job.salary_min || 0).toLocaleString()} - $${(job.salary_max || 0).toLocaleString()}` : 'Negotiable'}
                              </p>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-[10px] font-bold text-slate-600">
                                  {job.owner?.name?.charAt(0) || 'U'}
                                </div>
                                <span className="text-[14px] text-slate-700">{job.owner?.name || 'Unknown User'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                                job.is_active ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {job.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-3">
                                {/* Toggle switch */}
                                <button 
                                  onClick={() => handleToggleJobStatus(job.id, job.is_active)}
                                  className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${job.is_active ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'}`}
                                >
                                  <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                                </button>
                                <button 
                                  onClick={() => handleDeleteJob(job.id)}
                                  className="text-rose-500 hover:text-rose-600 transition-colors p-1"
                                >
                                  <Trash2 className="h-[18px] w-[18px]" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {jobs.length === 0 && (
                          <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No jobs found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* EXTERNAL API SYNC TAB */}
              {activeTab === 'sync' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div>
                    <h2 className="text-3xl font-extrabold text-[#111827] tracking-tight">External Job Synchronization</h2>
                    <p className="text-slate-500 mt-2 text-[15px] max-w-2xl">Manage connections and pull real-time job listings from external partner APIs and integrated applicant tracking systems.</p>
                  </div>

                  {/* Active Monitor */}
                  {(syncStatus?.status === 'running' || loadingSync) && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex justify-between items-end mb-4">
                        <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2">
                          <Database className="h-5 w-5 text-indigo-600" /> Active Monitor
                        </h3>
                        <span className="text-sm font-bold text-indigo-600">Syncing...</span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-2 relative">
                        <div className="absolute top-0 bottom-0 bg-indigo-600 w-1/2 rounded-full animate-[pulse_1s_ease-in-out_infinite] left-0"></div>
                      </div>
                      <p className="text-[13px] text-slate-500 font-medium">Please wait while data is being fetched.</p>
                    </div>
                  )}

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Manual Sync */}
                    <div className="rounded-[1.5rem] bg-[#f8f9fc] border border-slate-200 p-8 shadow-sm flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 right-0 -mr-10 -mt-10 h-32 w-32 bg-white blur-2xl rounded-full opacity-60"></div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 mb-6">
                        <Database className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-bold text-[#111827] mb-3">Manual Synchronization</h3>
                      <p className="text-slate-600 text-[15px] leading-relaxed mb-8 flex-1">
                        Force an immediate data fetch from all configured external providers. This process will identify new listings, update existing records, and archive closed positions across our partner network.
                      </p>
                      
                      <div className="bg-white/60 rounded-xl p-4 mb-6 border border-slate-200 text-[13px] text-slate-600 font-medium flex items-center gap-2">
                        <Activity className="h-4 w-4" /> Estimated sync time: ~2-4 minutes
                      </div>

                      {syncError && <div className="mb-4 bg-rose-50 text-rose-700 p-3 rounded-lg text-sm border border-rose-200 font-medium">{syncError}</div>}

                      <button
                        onClick={handleSync}
                        disabled={loadingSync}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#6344F5] hover:bg-[#5a3ae4] px-6 py-4 font-bold text-white transition-all shadow-sm disabled:opacity-50"
                      >
                        {loadingSync ? 'Sync in Progress...' : 'Trigger Full Sync Now'} 
                        <RefreshCcw className={`h-4 w-4 ml-1 ${loadingSync ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {/* Latest Sync Status */}
                    {syncStatus && (
                      <div className="rounded-[1.5rem] bg-white border border-slate-200 p-8 shadow-sm relative overflow-hidden">
                        <div className="absolute bottom-0 right-0 -mr-20 -mb-20 h-64 w-64 bg-fuchsia-50/50 blur-3xl rounded-full"></div>
                        <div className="flex justify-between items-start mb-10 relative z-10">
                          <h3 className="text-xl font-bold text-[#111827]">Latest Sync Status</h3>
                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                            syncStatus.status === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            syncStatus.status === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${syncStatus.status === 'success' ? 'bg-emerald-500' : syncStatus.status === 'failed' ? 'bg-rose-500' : 'bg-indigo-500'}`}></span>
                            {syncStatus.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 relative z-10">
                          <div className="bg-[#f8f9fc] border border-slate-100 rounded-2xl p-6">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Jobs Processed</p>
                            <p className="text-4xl font-extrabold text-[#6344F5]">{syncStatus.total_jobs_processed.toLocaleString()}</p>
                          </div>
                          <div className="bg-[#f8f9fc] border border-slate-100 rounded-2xl p-6">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Started At</p>
                            <p className="text-[1.35rem] font-extrabold text-[#111827] mb-1">
                              {syncStatus.started_at ? new Date(syncStatus.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </p>
                            <p className="text-[13px] text-slate-500 font-medium">
                              {syncStatus.started_at ? `Today, ${new Date(syncStatus.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Add New User</h3>
              <button 
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddUserSubmit} className="p-6 space-y-4">
              {addUserError && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-[13px] font-medium border border-rose-100">
                  {addUserError}
                </div>
              )}
              
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={newUser.name}
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm"
                  placeholder="john@example.com"
                />
              </div>
              
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Password</label>
                <input 
                  type="password" 
                  required
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
              
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Role</label>
                <select 
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm bg-white"
                >
                  <option value="jobseeker">Jobseeker</option>
                  <option value="employer">Employer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isAddingUser}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isAddingUser ? <RefreshCcw className="h-4 w-4 animate-spin" /> : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
