import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Briefcase, PlusCircle, ChevronRight, Search, LayoutDashboard, Users } from 'lucide-react';
import { createJob, deleteJob, getJobs, updateJob, getJobApplications, updateApplicationStatus } from '../lib/api';
import type { JobCreatePayload, JobResponse, UserResponse, ApplicationResponse } from '../types/api';

type EmployerDashboardProps = {
  user: UserResponse | null;
  token: string | null;
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
  location: 'Remote',
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

type TabType = 'jobs' | 'post';

export default function EmployerDashboard({ user, token }: EmployerDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('jobs');
  
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [form, setForm] = useState<JobFormState>(EMPTY_FORM);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Applicants Modal State
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('');
  const [applicants, setApplicants] = useState<ApplicationResponse[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const loadJobs = async () => {
    try {
      const result = await getJobs();
      setJobs(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat jobs employer.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  const myJobs = useMemo(() => jobs.filter((job) => job.posted_by === user?.id), [jobs, user?.id]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingJobId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      setError('Token tidak ditemukan. Silakan login ulang.');
      return;
    }

    const payload = toJobPayload(form);
    const salaryMin = payload.salary_min ?? null;
    const salaryMax = payload.salary_max ?? null;
    if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
      setError('salary_min tidak boleh lebih besar dari salary_max.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingJobId) {
        await updateJob(token, editingJobId, payload);
        setSuccess('Job berhasil diupdate.');
      } else {
        await createJob(token, payload);
        setSuccess('Job berhasil dibuat.');
      }

      resetForm();
      await loadJobs();
      setActiveTab('jobs'); // Redirect back to jobs list
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Aksi gagal diproses.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (jobId: number) => {
    if (!token) {
      setError('Token tidak ditemukan. Silakan login ulang.');
      return;
    }

    const confirmed = window.confirm('Hapus job ini?');
    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await deleteJob(token, jobId);
      setSuccess('Job berhasil dihapus.');
      await loadJobs();
      if (editingJobId === jobId) {
        resetForm();
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Gagal menghapus job.');
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
    setError(null);
    setSuccess(null);
    setActiveTab('post'); // Switch to the form tab
  };

  const openApplicantsModal = async (job: JobResponse) => {
    if (!token) return;
    setSelectedJobId(job.id);
    setSelectedJobTitle(job.title);
    setShowModal(true);
    setLoadingApplicants(true);
    try {
      const result = await getJobApplications(token, job.id);
      setApplicants(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applicants.');
    } finally {
      setLoadingApplicants(false);
    }
  };

  const handleStatusChange = async (appId: number, status: 'pending' | 'reviewed' | 'accepted' | 'rejected') => {
    if (!token) return;
    try {
      const updatedApp = await updateApplicationStatus(token, appId, { status });
      setApplicants((prev) => prev.map((app) => (app.id === appId ? updatedApp : app)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-7xl mx-auto min-h-[70vh] animate-in fade-in duration-500 pb-12">
      
      {/* Sidebar */}
      <aside className="w-full md:w-72 shrink-0">
        <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm sticky top-24 overflow-hidden">
          
          {/* Profile Header in Sidebar */}
          {user && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 border-b border-slate-100">
               <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-lg font-black uppercase text-white shadow-md shadow-indigo-500/20">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 leading-tight">{user.name}</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">{user.email}</p>
                  <span className="mt-2 inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                    Employer
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="p-4">
            <p className="px-4 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Dashboard Menu</p>
            <nav className="space-y-1.5">
              <button
                onClick={() => setActiveTab('jobs')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'jobs' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Briefcase className={`h-5 w-5 ${activeTab === 'jobs' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  My Jobs
                </div>
                {activeTab === 'jobs' && <ChevronRight className="h-4 w-4 text-indigo-400" />}
              </button>

              <button
                onClick={() => {
                  resetForm();
                  setActiveTab('post');
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'post' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <PlusCircle className={`h-5 w-5 ${activeTab === 'post' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {editingJobId ? 'Edit Job' : 'Post a Job'}
                </div>
                {activeTab === 'post' && <ChevronRight className="h-4 w-4 text-indigo-400" />}
              </button>
            </nav>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full min-w-0">
        
        {/* Global Notifications */}
        {error && <div className="mb-6 rounded-2xl border border-rose-200/50 bg-rose-50/50 p-4 text-sm font-medium text-rose-700 animate-in fade-in">{error}</div>}
        {success && <div className="mb-6 rounded-2xl border border-emerald-200/50 bg-emerald-50/50 p-4 text-sm font-medium text-emerald-700 animate-in fade-in">{success}</div>}

        {activeTab === 'jobs' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-900">My Job Listings</h1>
                <p className="mt-1 text-sm font-medium text-slate-500">Manage jobs you have posted and review applicants.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 shadow-sm border border-slate-200">
                {myJobs.length} Jobs Active
              </span>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 w-full animate-pulse rounded-2xl bg-slate-50 border border-slate-100" />
                  ))}
                </div>
              ) : myJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 mb-4 shadow-inner">
                    <Briefcase className="h-8 w-8" />
                  </div>
                  <p className="text-lg font-bold text-slate-900">No jobs posted yet</p>
                  <p className="mt-1.5 max-w-sm text-sm font-medium text-slate-500">You haven't created any job listings. Post your first job to start finding great talent!</p>
                  <button 
                    onClick={() => setActiveTab('post')}
                    className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    Post a Job Now
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myJobs.map((job) => (
                    <div key={job.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-indigo-300 hover:shadow-md">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{job.title}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500">
                          <span className="flex items-center gap-1.5"><LayoutDashboard className="h-4 w-4" />{job.company}</span>
                          <span className="flex items-center gap-1.5"><Search className="h-4 w-4" />{job.location}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openApplicantsModal(job)}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition-all hover:bg-white hover:border-indigo-300 hover:text-indigo-600 active:scale-95 shadow-sm"
                        >
                          <Users className="h-4 w-4" />
                          Applicants
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(job)}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition-all hover:bg-white hover:border-indigo-300 hover:text-indigo-600 active:scale-95 shadow-sm"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(job.id)}
                          className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-400 transition-all hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 active:scale-95 shadow-sm"
                          title="Delete Job"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'post' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div>
              <h1 className="text-2xl font-black text-slate-900">{editingJobId ? 'Edit Job Listing' : 'Post a New Job'}</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {editingJobId ? 'Update the details of your job listing.' : 'Fill out the form below to publish a new open position.'}
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-10 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 -mr-24 -mt-24 h-64 w-64 rounded-full bg-slate-50 blur-3xl pointer-events-none" />
              
              <form onSubmit={handleSubmit} className="space-y-6 relative">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="title" className="mb-1.5 block text-sm font-bold text-slate-700">Job Title</label>
                    <input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                      required
                      placeholder="e.g. Senior Frontend Engineer"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="company" className="mb-1.5 block text-sm font-bold text-slate-700">Company Name</label>
                    <input
                      id="company"
                      value={form.company}
                      onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
                      required
                      placeholder="e.g. Acme Corp"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="location" className="mb-1.5 block text-sm font-bold text-slate-700">Location</label>
                    <input
                      id="location"
                      value={form.location}
                      onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g. Remote, New York"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="salaryMin" className="mb-1.5 block text-sm font-bold text-slate-700">Min Salary ($)</label>
                    <input
                      id="salaryMin"
                      value={form.salaryMin}
                      onChange={(e) => setForm((prev) => ({ ...prev, salaryMin: e.target.value }))}
                      type="number"
                      min={0}
                      placeholder="e.g. 50000"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="salaryMax" className="mb-1.5 block text-sm font-bold text-slate-700">Max Salary ($)</label>
                    <input
                      id="salaryMax"
                      value={form.salaryMax}
                      onChange={(e) => setForm((prev) => ({ ...prev, salaryMax: e.target.value }))}
                      type="number"
                      min={0}
                      placeholder="e.g. 80000"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="description" className="mb-1.5 block text-sm font-bold text-slate-700">Job Description</label>
                    <textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                      required
                      rows={6}
                      placeholder="Describe the role, responsibilities, and requirements..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70"
                  >
                    {submitting ? 'Processing...' : editingJobId ? 'Save Changes' : 'Publish Job Listing'}
                  </button>
                  {editingJobId && (
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setActiveTab('jobs');
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] shadow-sm"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* Applicants Modal (Unchanged structurally, just ensuring it renders on top) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-[2rem] bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 p-6 sm:px-8">
              <div>
                <h3 className="text-xl font-black text-slate-900">Applicants</h3>
                <p className="mt-1 text-sm font-medium text-slate-500">{selectedJobTitle}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/50">
              {loadingApplicants ? (
                <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div></div>
              ) : applicants.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm font-bold text-slate-900">No applicants yet</p>
                  <p className="mt-1 text-xs text-slate-500">When someone applies, they will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applicants.map((app) => (
                    <div key={app.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 sm:gap-8">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600">
                              {app.applicant?.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{app.applicant?.name || 'Unknown User'}</p>
                              <p className="text-xs font-medium text-slate-500">{app.applicant?.email}</p>
                            </div>
                          </div>
                          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                            <p className="font-semibold mb-1 text-slate-900">Cover Letter:</p>
                            {app.cover_letter ? <p className="whitespace-pre-wrap">{app.cover_letter}</p> : <p className="italic text-slate-400">No cover letter provided.</p>}
                            
                            {app.applicant?.profile && (
                              <div className="mt-4 space-y-3 border-t border-slate-200/60 pt-4">
                                <div>
                                  <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1.5">Bio & Portfolio</p>
                                  {app.applicant.profile.bio ? <p className="leading-relaxed">{app.applicant.profile.bio}</p> : <p className="italic text-slate-400">No bio provided.</p>}
                                </div>
                                {app.applicant.profile.skills && (
                                  <div>
                                    <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1.5">Skills</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {app.applicant.profile.skills.split(',').map((skill, idx) => (
                                        <span key={idx} className="inline-flex items-center rounded-md bg-indigo-100/50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200/50">
                                          {skill.trim()}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {app.applicant.profile.resume_url && (
                                  <div>
                                    <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1.5">Link / Resume</p>
                                    <a href={app.applicant.profile.resume_url.startsWith('http') ? app.applicant.profile.resume_url : `https://${app.applicant.profile.resume_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-500 hover:underline">
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                      View External Document
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col sm:items-end gap-3 sm:min-w-[180px]">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                            app.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            app.status === 'reviewed' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            app.status === 'accepted' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {app.status}
                          </span>
                          <select
                            value={app.status}
                            onChange={(e) => void handleStatusChange(app.id, e.target.value as any)}
                            className="mt-1 block w-full rounded-xl border-slate-300 bg-white py-2.5 pl-4 pr-10 text-sm font-bold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all hover:border-indigo-300 cursor-pointer"
                          >
                            <option value="pending">Mark Pending</option>
                            <option value="reviewed">Mark Reviewed</option>
                            <option value="accepted">Accept Applicant</option>
                            <option value="rejected">Reject Applicant</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
