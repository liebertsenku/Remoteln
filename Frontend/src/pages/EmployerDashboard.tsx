import { useEffect, useMemo, useState, useRef } from 'react';
import type { FormEvent } from 'react';
import { Briefcase, PlusCircle, LogOut, Bell, Settings, MapPin, Edit2, Trash2, Users, Rocket } from 'lucide-react';
import { createJob, deleteJob, getJobs, updateJob, getJobApplications, updateApplicationStatus } from '../lib/api';
import type { JobCreatePayload, JobResponse, UserResponse, ApplicationResponse } from '../types/api';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import confetti from 'canvas-confetti';

type EmployerDashboardProps = {
  user: UserResponse | null;
  token: string | null;
  onLogout?: () => void;
};

type JobFormState = {
  title: string;
  description: string;
  company: string;
  location: string;
  salaryMin: string;
  salaryMax: string;
};

const EMPTY_FORM: JobFormState = {
  title: '',
  description: '',
  company: '',
  location: '',
  salaryMin: '',
  salaryMax: '',
};

function toJobPayload(form: JobFormState): JobCreatePayload {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    company: form.company.trim(),
    location: form.location.trim() || 'Remote',
    salary_min: form.salaryMin ? Number(form.salaryMin) : null,
    salary_max: form.salaryMax ? Number(form.salaryMax) : null,
  };
}

type TabType = 'jobs' | 'post' | 'settings';

export default function EmployerDashboard({ user, token, onLogout }: EmployerDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('jobs');
  
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [form, setForm] = useState<JobFormState>(EMPTY_FORM);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Pagination for Jobs
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 4;

  // Applicants Modal State
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('');
  const [applicants, setApplicants] = useState<ApplicationResponse[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const loadJobs = async () => {
    try {
      const result = await getJobs();
      setJobs(result);
    } catch {
      Swal.fire('Error', 'Gagal memuat jobs employer.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  const myJobs = useMemo(() => jobs.filter((job) => job.posted_by === user?.id).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [jobs, user?.id]);

  const currentJobs = useMemo(() => {
    const start = (currentPage - 1) * jobsPerPage;
    return myJobs.slice(start, start + jobsPerPage);
  }, [myJobs, currentPage]);

  const totalPages = Math.ceil(myJobs.length / jobsPerPage);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingJobId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim()) {
      Swal.fire('Error', 'Please enter a job title.', 'error');
      return;
    }
    if (!form.company.trim()) {
      Swal.fire('Error', 'Please enter a company name.', 'error');
      return;
    }
    if (!form.description.trim()) {
      Swal.fire('Error', 'Please enter a job description.', 'error');
      return;
    }

    if (!token) {
      Swal.fire('Error', 'Token tidak ditemukan. Silakan login ulang.', 'error');
      return;
    }

    const payload = toJobPayload(form);
    const salaryMin = payload.salary_min ?? null;
    const salaryMax = payload.salary_max ?? null;
    if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
      Swal.fire('Error', 'Min salary cannot be greater than Max salary.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      if (editingJobId) {
        await updateJob(token, editingJobId, payload);
        Swal.fire('Success', 'Job listing updated successfully.', 'success');
      } else {
        await createJob(token, payload);
        Swal.fire('Success', 'Job published successfully.', 'success');
      }

      resetForm();
      await loadJobs();
      setActiveTab('jobs');
      
    } catch (submitError) {
      const msg = submitError instanceof Error ? submitError.message : 'Action failed.';
      Swal.fire('Error', msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (jobId: number) => {
    if (!token) return;

    const { isConfirmed } = await Swal.fire({
      title: 'Delete this job?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!isConfirmed) return;

    try {
      await deleteJob(token, jobId);
      Swal.fire('Deleted!', 'Job has been deleted.', 'success');
      await loadJobs();
      if (editingJobId === jobId) resetForm();
    } catch {
      Swal.fire('Error', 'Failed to delete job.', 'error');
    }
  };

  const startEdit = (job: JobResponse) => {
    setEditingJobId(job.id);
    setForm({
      title: job.title,
      description: job.description,
      company: job.company,
      location: job.location,
      salaryMin: job.salary_min?.toString() ?? '',
      salaryMax: job.salary_max?.toString() ?? '',
    });
    setActiveTab('post');
  };

  const openApplicantsModal = async (job: JobResponse) => {
    if (!token) return;
    setSelectedJobTitle(job.title);
    setShowModal(true);
    setLoadingApplicants(true);
    try {
      const result = await getJobApplications(token, job.id);
      setApplicants(result);
    } catch {
      Swal.fire('Error', 'Failed to load applicants.', 'error');
    } finally {
      setLoadingApplicants(false);
    }
  };

  const handleStatusChange = async (appId: number, status: 'pending' | 'reviewed' | 'accepted' | 'rejected') => {
    if (!token) return;

    let confirmText = `Apakah Anda yakin ingin mengubah status menjadi ${status}?`;
    let confirmBtn = 'Ya, Ubah';
    let btnColor = '#6344F5';

    if (status === 'accepted') {
      confirmText = 'Apakah Anda yakin ingin Menerima kandidat ini?';
      confirmBtn = 'Ya, Terima';
      btnColor = '#10b981';
    } else if (status === 'rejected') {
      confirmText = 'Apakah Anda yakin ingin Menolak kandidat ini?';
      confirmBtn = 'Ya, Tolak';
      btnColor = '#ef4444';
    }

    const { isConfirmed } = await Swal.fire({
      title: 'Konfirmasi',
      text: confirmText,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: btnColor,
      cancelButtonColor: '#64748b',
      confirmButtonText: confirmBtn,
      cancelButtonText: 'Batal'
    });

    if (!isConfirmed) return;

    try {
      const updatedApp = await updateApplicationStatus(token, appId, { status });
      setApplicants((prev) => prev.map((app) => (app.id === appId ? updatedApp : app)));

      if (status === 'accepted') {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
        Swal.fire('Berhasil!', 'Kandidat berhasil Diterima.', 'success');
      } else {
        Swal.fire('Berhasil', `Status berhasil diubah menjadi ${status}.`, 'success');
      }
    } catch {
      Swal.fire('Error', 'Gagal memperbarui status.', 'error');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8f9fc]">
      
      {/* Sidebar */}
      <aside className="w-[280px] bg-white border-r border-slate-200 shrink-0 flex flex-col fixed inset-y-0 z-10 shadow-sm">
        <div className="px-8 py-8">
          <Link to="/" className="text-2xl font-extrabold tracking-tight text-[#6344F5]">
            RemoteIn
          </Link>
        </div>

        {/* Profile Card */}
        {user && (
          <div className="px-6 mb-8">
            <div className="bg-gradient-to-br from-[#6344F5] to-[#8a38f5] rounded-2xl p-6 text-center text-white relative shadow-lg shadow-indigo-500/20">
              <div className="relative inline-block mb-3">
                <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold backdrop-blur-sm border-2 border-white/30 mx-auto overflow-hidden">
                  {user.name.charAt(0)}
                </div>
                <div className="absolute bottom-0 right-0 h-4 w-4 bg-emerald-400 border-2 border-[#6344F5] rounded-full"></div>
              </div>
              <h3 className="text-[17px] font-bold tracking-tight mb-0.5">{user.name}</h3>
              <p className="text-[12px] text-white/80 font-medium mb-3 truncate px-2">{user.email}</p>
              <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm border border-white/20">
                Employer
              </span>
            </div>
          </div>
        )}

        <nav className="flex-1 px-4 space-y-2">
          <button
            type="button"
            onClick={() => setActiveTab('jobs')}
            className={`w-full flex items-center gap-3 px-6 py-3.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'jobs' ? 'bg-[#f0f3ff] text-[#6344F5] shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {activeTab === 'jobs' && <div className="absolute left-0 w-1 h-8 bg-[#6344F5] rounded-r-md"></div>}
            <Briefcase className={`h-5 w-5 ${activeTab === 'jobs' ? 'text-[#6344F5]' : 'text-slate-400'}`} />
            My Jobs
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setActiveTab('post');
            }}
            className={`w-full flex items-center gap-3 px-6 py-3.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'post' ? 'bg-[#f0f3ff] text-[#6344F5] shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {activeTab === 'post' && <div className="absolute left-0 w-1 h-8 bg-[#6344F5] rounded-r-md"></div>}
            <PlusCircle className={`h-5 w-5 ${activeTab === 'post' ? 'text-[#6344F5]' : 'text-slate-400'}`} />
            Post a Job
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-6 py-3.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'settings' ? 'bg-[#f0f3ff] text-[#6344F5] shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {activeTab === 'settings' && <div className="absolute left-0 w-1 h-8 bg-[#6344F5] rounded-r-md"></div>}
            <Settings className={`h-5 w-5 ${activeTab === 'settings' ? 'text-[#6344F5]' : 'text-slate-400'}`} />
            Settings
          </button>
        </nav>

        <div className="p-6 border-t border-slate-200/60 mt-auto">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-[280px] p-8 md:p-12 w-full max-w-7xl mx-auto">
        
        {/* Top Header */}
        <div className="flex justify-end items-center gap-6 mb-12">
          <button 
            onClick={() => Swal.fire({ title: 'Notifications', text: 'You have no new notifications.', icon: 'info', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 })}
            className="text-slate-400 hover:text-slate-600 transition-colors relative"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-rose-500 border border-white"></span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Settings className="h-5 w-5" />
          </button>
          
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-slate-200 hover:ring-2 hover:ring-indigo-500/20 transition-all focus:outline-none"
            >
              {user?.name.charAt(0)}
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-48 origin-top-right rounded-2xl border border-slate-200/60 bg-white p-2 shadow-2xl ring-1 ring-black/5 focus:outline-none animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
                </div>
                <button
                  onClick={() => { setDropdownOpen(false); setActiveTab('settings'); }}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all"
                >
                  <Settings className="h-4 w-4" /> Account Settings
                </button>
                <div className="my-1 border-b border-slate-100"></div>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {activeTab === 'jobs' && (
          <div className="animate-in fade-in duration-500">
            {loading ? (
              <div className="flex justify-center items-center h-40"><div className="animate-spin h-8 w-8 border-4 border-[#6344F5] border-t-transparent rounded-full"></div></div>
            ) : myJobs.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-slate-300 rounded-2xl bg-white">
                <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900">No jobs posted yet</h3>
                <p className="text-slate-500 mt-2">Start finding talent by posting your first job.</p>
                <button type="button" onClick={() => { resetForm(); setActiveTab('post'); }} className="mt-6 px-6 py-2.5 bg-[#6344F5] text-white rounded-xl font-bold shadow-sm">
                  Post a Job
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {currentJobs.map((job) => {
                  return (
                    <div key={job.id} className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-[1.25rem] shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all hover:shadow-md hover:border-indigo-200 group">
                      <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-xl bg-[#f8f9fc] border border-slate-100 flex items-center justify-center text-xl font-bold text-[#6344F5]">
                          {job.company.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-[17px] font-bold text-[#111827] mb-1">{job.title}</h3>
                          <div className="flex items-center gap-4 text-[13px] font-medium text-slate-500">
                            <span className="flex items-center gap-1.5"><BuildingIcon /> {job.company}</span>
                            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {job.location}</span>
                            {job.salary_min && job.salary_max && (
                              <span className="flex items-center gap-1.5 font-bold text-[#6344F5]">
                                <MoneyIcon /> ${Math.floor(job.salary_min / 1000)}k - ${Math.floor(job.salary_max / 1000)}k
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openApplicantsModal(job)}
                          className="flex flex-col items-center justify-center px-4 py-1.5 bg-[#f0f3ff] rounded-xl border border-indigo-50 hover:bg-[#e0e7ff] transition-colors min-w-[110px]"
                        >
                          <Users className="h-4 w-4 text-[#6344F5] mb-0.5" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6344F5]">
                            Applicants
                          </span>
                        </button>
                        <button onClick={() => startEdit(job)} className="p-2.5 rounded-xl bg-[#f8f9fc] border border-slate-100 text-slate-500 hover:text-[#6344F5] hover:bg-[#f0f3ff] hover:border-indigo-100 transition-all">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(job.id)} className="p-2.5 rounded-xl bg-[#f8f9fc] border border-slate-100 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition-all">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-8 pt-4">
                    <p className="text-sm font-medium text-slate-500">
                      Showing {(currentPage - 1) * jobsPerPage + 1} to {Math.min(currentPage * jobsPerPage, myJobs.length)} of {myJobs.length} jobs
                    </p>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors ${
                            currentPage === i + 1 ? 'bg-[#6344F5] text-white shadow-sm' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'post' && (
          <div className="animate-in fade-in duration-500 max-w-3xl">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight">{editingJobId ? 'Edit Job Listing' : 'Post a New Job'}</h1>
              <p className="text-slate-500 mt-2 text-[15px]">Reach the world's most elite remote talent pool in minutes.</p>
            </div>

            <div className="bg-white rounded-[1.5rem] border border-slate-200 p-8 sm:p-10 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-slate-900">Job Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Senior Product Designer"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-[#6344F5] focus:outline-none focus:ring-1 focus:ring-[#6344F5] transition-all bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-slate-900">Company Name</label>
                  <input
                    value={form.company}
                    onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
                    placeholder="e.g. Acme Tech Corp"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-[#6344F5] focus:outline-none focus:ring-1 focus:ring-[#6344F5] transition-all bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-slate-900">Location</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <MapPin className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      value={form.location}
                      onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g. Remote (Global), London, San Francisco"
                      className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-[#6344F5] focus:outline-none focus:ring-1 focus:ring-[#6344F5] transition-all bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-slate-900">Min Salary ($)</label>
                    <input
                      value={form.salaryMin}
                      onChange={(e) => setForm((prev) => ({ ...prev, salaryMin: e.target.value }))}
                      type="number"
                      placeholder="80,000"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-[#6344F5] focus:outline-none focus:ring-1 focus:ring-[#6344F5] transition-all bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-slate-900">Max Salary ($)</label>
                    <input
                      value={form.salaryMax}
                      onChange={(e) => setForm((prev) => ({ ...prev, salaryMax: e.target.value }))}
                      type="number"
                      placeholder="120,000"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-[#6344F5] focus:outline-none focus:ring-1 focus:ring-[#6344F5] transition-all bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-slate-900">Job Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={8}
                    placeholder="Tell us about the role, responsibilities, and ideal candidate..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-4 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-[#6344F5] focus:outline-none focus:ring-1 focus:ring-[#6344F5] transition-all bg-white resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 bg-[#6344F5] hover:bg-[#5a3ae4] text-white font-bold text-[15px] py-4 rounded-xl transition-colors shadow-sm disabled:opacity-70"
                  >
                    {submitting ? 'Processing...' : editingJobId ? 'Save Changes' : 'Post a Job'} <Rocket className="h-5 w-5" />
                  </button>
                  <p className="text-center text-[11px] font-semibold text-slate-500 mt-4">
                    By clicking publish, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-in fade-in duration-500 max-w-3xl">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight">Account Settings</h1>
              <p className="text-slate-500 mt-2 text-[15px]">Manage your employer profile and account preferences.</p>
            </div>

            <div className="bg-white rounded-[1.5rem] border border-slate-200 p-8 sm:p-10 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-[#f0f3ff] blur-3xl opacity-50 pointer-events-none" />
              
              <div className="relative z-10 space-y-8">
                <div className="flex items-center gap-6">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#6344F5] to-[#8a38f5] flex items-center justify-center text-3xl font-bold text-white shadow-md">
                    {user?.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{user?.name}</h3>
                    <p className="text-slate-500">{user?.email}</p>
                    <span className="mt-2 inline-block bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-100">
                      Employer Account
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-8 space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-slate-900">Company / Full Name</label>
                    <input
                      type="text"
                      readOnly
                      value={user?.name}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[14px] text-slate-600 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-slate-900">Email Address</label>
                    <input
                      type="email"
                      readOnly
                      value={user?.email}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[14px] text-slate-600 cursor-not-allowed"
                    />
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 text-amber-800">
                    <svg className="h-5 w-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div className="text-[13px] font-medium leading-relaxed">
                      To update your employer details or company information, please contact our support team at <strong className="font-bold">support@remotein.com</strong>.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Applicants Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Applicants</h3>
                <p className="text-[14px] font-medium text-[#6344F5] mt-0.5">{selectedJobTitle} <span className="text-slate-400">&bull; {applicants.length} candidates found</span></p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-700 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-[#f8f9fc]">
              {loadingApplicants ? (
                <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-4 border-[#6344F5] border-t-transparent rounded-full"></div></div>
              ) : applicants.length === 0 ? (
                <div className="text-center py-20">
                  <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-[15px] font-bold text-slate-900">No applicants yet</p>
                  <p className="mt-1 text-sm text-slate-500">Wait for candidates to start applying.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applicants.map((app) => (
                    <div key={app.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row gap-6">
                      
                      {/* Left: Applicant Info */}
                      <div className="w-full md:w-1/4 shrink-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold overflow-hidden border border-slate-200">
                            {app.applicant?.name?.charAt(0) || '?'}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[14px] font-bold text-slate-900 truncate">{app.applicant?.name || 'Unknown User'}</h4>
                            <p className="text-[12px] font-medium text-slate-500 flex items-center gap-1.5 truncate">
                              <MailIcon /> {app.applicant?.email}
                            </p>
                          </div>
                        </div>
                        {app.applicant?.profile?.resume_url && (
                          <a href={app.applicant.profile.resume_url.startsWith('http') ? app.applicant.profile.resume_url : `https://${app.applicant.profile.resume_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#6344F5] hover:underline">
                            <FileIcon /> View Resume
                          </a>
                        )}
                      </div>

                      {/* Middle: Bio & Cover Letter */}
                      <div className="flex-1 border-l border-slate-100 pl-6">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Bio & Cover Letter</p>
                        <p className="text-[13px] text-slate-700 leading-relaxed mb-4 line-clamp-3">
                          "{app.cover_letter || app.applicant?.profile?.bio || 'No cover letter or bio provided.'}"
                        </p>
                        {app.applicant?.profile?.skills && (
                          <div className="flex flex-wrap gap-2">
                            {app.applicant.profile.skills.split(',').map((skill, idx) => (
                              <span key={idx} className="inline-flex items-center rounded-full bg-[#f0f3ff] px-3 py-1 text-[11px] font-bold text-[#6344F5]">
                                {skill.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Status */}
                      <div className="w-full md:w-48 shrink-0 flex flex-col items-end border-l border-slate-100 pl-6">
                        <span className={`inline-block mb-3 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          app.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          app.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                          app.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {app.status === 'pending' ? 'Pending Review' : app.status}
                        </span>
                        
                        <div className="relative w-full">
                          <select
                            value={app.status}
                            onChange={(e) => void handleStatusChange(app.id, e.target.value as 'pending' | 'reviewed' | 'accepted' | 'rejected')}
                            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-[13px] font-bold text-slate-700 focus:border-[#6344F5] focus:outline-none focus:ring-1 focus:ring-[#6344F5] transition-colors cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="accepted">Accepted</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-white text-right">
              <button onClick={() => setShowModal(false)} className="px-8 py-2.5 bg-[#6344F5] text-white rounded-xl font-bold hover:bg-[#5a3ae4] transition-colors shadow-sm">
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Icon Components
function BuildingIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>;
}
function MoneyIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>;
}
function MailIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
}
function FileIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>;
}
