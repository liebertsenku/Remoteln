import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, MapPin } from 'lucide-react';
import { getJobs, getSavedJobs, saveJob, unsaveJob } from '../lib/api';
import type { JobResponse, UserResponse, SavedJobResponse } from '../types/api';
import Swal from 'sweetalert2';

type Category = { label: string; emoji: string; keywords: string[] };
const CATEGORIES: Category[] = [
  { label: 'Engineering', emoji: '💻', keywords: ['engineer', 'developer', 'backend', 'frontend', 'fullstack', 'full-stack', 'software', 'programming', 'web', 'react', 'node', 'python', 'java', 'golang', 'ruby', 'php', 'typescript'] },
  { label: 'Mobile', emoji: '📱', keywords: ['mobile', 'android', 'ios', 'flutter', 'react native', 'swift', 'kotlin'] },
  { label: 'Data & AI', emoji: '📊', keywords: ['data', 'machine learning', 'ml', 'ai', 'artificial intelligence', 'analyst', 'analytics', 'scientist', 'bi', 'business intelligence', 'sql', 'tableau', 'etl', 'llm'] },
  { label: 'DevOps & Cloud', emoji: '☁️', keywords: ['devops', 'cloud', 'aws', 'gcp', 'azure', 'infrastructure', 'kubernetes', 'docker', 'sre', 'platform', 'ci/cd', 'terraform', 'linux', 'sysadmin'] },
  { label: 'Design', emoji: '🎨', keywords: ['design', 'ui', 'ux', 'figma', 'product design', 'graphic', 'visual', 'creative', 'branding', 'illustrat'] },
  { label: 'Marketing', emoji: '📣', keywords: ['marketing', 'seo', 'growth', 'social media', 'content', 'copywriter', 'digital marketing', 'performance', 'ads', 'pr ', 'brand'] },
  { label: 'Sales', emoji: '🤝', keywords: ['sales', 'account executive', 'business development', 'account manager', 'revenue', 'crm', 'bdr', 'sdr'] },
  { label: 'Customer Support', emoji: '🎧', keywords: ['customer support', 'customer success', 'customer service', 'support engineer', 'helpdesk', 'technical support', 'cx '] },
  { label: 'Product', emoji: '🗂️', keywords: ['product manager', 'product owner', 'pm ', 'scrum', 'agile', 'roadmap'] },
  { label: 'Finance', emoji: '💼', keywords: ['finance', 'accounting', 'bookkeep', 'controller', 'cfo', 'payroll', 'tax', 'audit', 'financial'] },
  { label: 'Cybersecurity', emoji: '🔒', keywords: ['security', 'cybersecurity', 'pentest', 'infosec', 'soc ', 'firewall', 'compliance', 'appsec'] },
  { label: 'Writing', emoji: '✍️', keywords: ['writer', 'editor', 'content writer', 'technical writer', 'journalist', 'blogger', 'documentation'] },
];

function jobMatchesCategory(job: JobResponse, cat: Category): boolean {
  const haystack = [
    job.title,
    job.company,
    job.description,
  ].join(' ').toLowerCase();
  return cat.keywords.some(kw => haystack.includes(kw.toLowerCase()));
}

function formatSalary(job: JobResponse) {
  if (job.salary_min === null && job.salary_max === null) {
    return 'Negotiable';
  }
  if (job.salary_min !== null && job.salary_max !== null) {
    return `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`;
  }
  return `$${(job.salary_min ?? job.salary_max ?? 0).toLocaleString()}`;
}

type Props = {
  user?: UserResponse | null;
  token?: string | null;
};

export default function Jobs({ user, token }: Props) {
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [keyword, setKeyword] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hasSalary, setHasSalary] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [savedJobs, setSavedJobs] = useState<SavedJobResponse[]>([]);
  const [savingAction, setSavingAction] = useState<number | null>(null);

  // Pagination state
  const pageSize = 12;
  const [currentPage, setCurrentPage] = useState(1);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getJobs();
      setJobs(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal mengambil internal jobs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadJobs(); }, [loadJobs]);

  useEffect(() => {
    if (user?.role === 'jobseeker' && token) {
      getSavedJobs(token).then(setSavedJobs).catch(console.error);
    }
  }, [user, token]);

  const handleToggleSave = async (e: React.MouseEvent, job: JobResponse) => {
    e.preventDefault();
    if (!user || user.role !== 'jobseeker' || !token) {
      Swal.fire({
        icon: 'warning',
        title: 'Perhatian',
        text: 'Silakan login sebagai Jobseeker untuk menyimpan lowongan.'
      });
      return;
    }

    const saved = savedJobs.find(sj => sj.job_id === job.id);
    setSavingAction(job.id);
    try {
      if (saved) {
        await unsaveJob(token, saved.id);
        setSavedJobs(prev => prev.filter(sj => sj.id !== saved.id));
      } else {
        const newSaved = await saveJob(token, { job_id: job.id });
        setSavedJobs(prev => [...prev, newSaved]);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: err.message || 'Gagal menyimpan job'
      });
    } finally {
      setSavingAction(null);
    }
  };

  const filteredJobs = useMemo((): JobResponse[] => {
    let result = [...jobs];

    const kw = keyword.trim().toLowerCase();
    if (kw) {
      result = result.filter(j =>
        j.title.toLowerCase().includes(kw) ||
        j.company.toLowerCase().includes(kw) ||
        j.description.toLowerCase().includes(kw)
      );
    }

    const loc = locationQuery.trim().toLowerCase();
    if (loc) {
      result = result.filter(j => j.location.toLowerCase().includes(loc));
    }

    if (selectedCategory) {
      const cat = CATEGORIES.find(c => c.label === selectedCategory);
      if (cat) result = result.filter(j => jobMatchesCategory(j, cat));
    }

    if (hasSalary) {
      result = result.filter(j => j.salary_min !== null || j.salary_max !== null);
    }

    // Sort by created_at desc
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return result;
  }, [jobs, keyword, locationQuery, selectedCategory, hasSalary]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, locationQuery, selectedCategory, hasSalary]);

  const paginatedJobs = useMemo(() => {
    return filteredJobs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredJobs, currentPage]);

  const totalPages = Math.ceil(filteredJobs.length / pageSize);

  const clearFilters = () => {
    setSelectedCategory(null);
    setHasSalary(false);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-3">Find your next great opportunity</h1>
        <p className="text-slate-500 text-lg">Discover remote roles at top-tier companies tailored to your expertise.</p>
      </div>

      {/* Search and Filter Section */}
      <div className="space-y-4">
        {/* Search Bar Card */}
        <div className="flex flex-col md:flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          {/* Keyword Input */}
          <label className="relative flex-1 w-full md:w-auto flex items-center border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-3">
            <Search className="h-5 w-5 text-slate-400 absolute left-3" />
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              type="text"
              placeholder="Job title, keywords, or company"
              className="w-full bg-slate-50/50 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-slate-50"
            />
          </label>

          {/* Location Input */}
          <label className="relative flex-1 w-full md:w-auto flex items-center border-b md:border-b-0 border-slate-200 pb-3 md:pb-0 md:pr-3">
            <MapPin className="h-5 w-5 text-slate-400 absolute left-3" />
            <input
              value={locationQuery}
              onChange={e => setLocationQuery(e.target.value)}
              type="text"
              placeholder="City, country, or remote"
              className="w-full bg-slate-50/50 rounded-xl py-3 pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-slate-50"
            />
          </label>

          {/* Actions */}
          <div className="flex w-full md:w-auto items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFilters(v => !v)}
              className={`flex flex-1 md:flex-none items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${showFilters ? 'bg-primary-50 text-primary border border-primary-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent'}`}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
            <button
              type="button"
              className="flex flex-1 md:flex-none items-center justify-center rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
            >
              Find Job
            </button>
          </div>
        </div>

        {/* Popular Searches */}
        <div className="flex flex-wrap items-center gap-3 text-sm px-2">
          <span className="text-slate-500">Popular searches:</span>
          {['Front-end', 'Developer', 'Laravel', 'Product Manager'].map(term => {
            const isActive = keyword.toLowerCase() === term.toLowerCase();
            return (
              <button
                key={term}
                onClick={() => setKeyword(isActive ? '' : term)}
                className={`rounded-full px-4 py-1.5 font-medium transition-colors border ${isActive
                  ? 'bg-primary-50 text-primary border-primary-200'
                  : 'text-primary bg-primary-50/50 border-transparent hover:bg-primary-50'
                  }`}
              >
                {term}
              </button>
            );
          })}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">Advanced Filters</h3>
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
              >
                Reset Filter
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Category chips */}
              <div>
                <p className="mb-3 text-sm font-semibold text-slate-700">Category</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.slice(0, 5).map(cat => {
                    const active = selectedCategory === cat.label;
                    return (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => setSelectedCategory(active ? null : cat.label)}
                        className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${active
                          ? 'border-primary-200 bg-primary-50 text-primary'
                          : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-primary-200 hover:bg-slate-50'
                          }`}
                      >
                        <span>{cat.emoji}</span>
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Salary Toggle */}
              <div>
                <p className="mb-3 text-sm font-semibold text-slate-700">Salary Preference</p>
                <button
                  type="button"
                  onClick={() => setHasSalary(v => !v)}
                  className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${hasSalary
                    ? 'border-primary-200 bg-primary-50 text-primary'
                    : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span>💰</span> Ada Salary (Transparent)
                  </div>
                  <div className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${hasSalary ? 'bg-primary' : 'bg-slate-300'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${hasSalary ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Results Header */}
      <div className="flex justify-between items-center mt-4">
        <h2 className="text-2xl font-bold text-slate-900">{filteredJobs.length} Jobs Found</h2>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Sort by:</span>
          <select className="font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer">
            <option>Most Relevant</option>
            <option>Newest</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <section>
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="h-5 w-3/4 rounded bg-slate-200" />
                <div className="flex gap-2">
                  <div className="h-4 w-16 rounded bg-slate-200" />
                  <div className="h-4 w-24 rounded bg-slate-200" />
                </div>
                <div className="flex gap-3 pt-4">
                  <div className="h-10 w-10 rounded-lg bg-slate-200 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/2 rounded bg-slate-200" />
                    <div className="h-3 w-1/3 rounded bg-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {filteredJobs.length > 0 ? (
              <>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {paginatedJobs.map(job => (
                    <article
                      key={job.id}
                      className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-lg hover:border-primary-200 transition-all duration-300 relative"
                    >
                      <div className="absolute top-6 right-6">
                        <button
                          onClick={(e) => handleToggleSave(e, job)}
                          disabled={savingAction === job.id}
                          className="text-slate-400 hover:text-primary transition-colors disabled:opacity-50"
                          title={savedJobs.some(sj => sj.job_id === job.id) ? "Hapus dari tersimpan" : "Simpan Job"}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={savedJobs.some(sj => sj.job_id === job.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={savedJobs.some(sj => sj.job_id === job.id) ? "text-primary" : ""}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" /></svg>
                        </button>
                      </div>
                      
                      <div>
                        {/* Top: Pill */}
                        <div className="mb-4">
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-primary-50 text-primary">
                            Internal
                          </span>
                        </div>
                        
                        {/* Title & Salary */}
                        <Link to={`/jobs/${job.id}`} className="block mb-6 pr-8">
                          <h2 className="text-xl font-bold text-slate-900 leading-snug mb-1 group-hover:text-primary transition-colors">
                            {job.title}
                          </h2>
                          <p className="text-sm font-medium text-slate-500">
                            {formatSalary(job)} / year
                          </p>
                        </Link>
                      </div>

                      {/* Bottom: Logo, Company, Location */}
                      <div className="flex items-center gap-3 mt-auto pt-6">
                        {/* Logo */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold uppercase text-white shadow-sm">
                          {job.company.substring(0, 2)}
                        </div>

                        {/* Company Info */}
                        <div className="flex flex-col overflow-hidden">
                          <p className="text-sm font-bold text-slate-900 truncate">{job.company}</p>
                          <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{job.location}</span>
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12 mb-4 flex justify-center items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                      let pageNum = currentPage;
                      if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;

                      if (pageNum < 1 || pageNum > totalPages) return null;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all ${currentPage === pageNum
                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <span className="flex h-10 w-10 items-center justify-center text-slate-400">...</span>
                    )}

                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all"
                      >
                        {totalPages}
                      </button>
                    )}

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
                <p className="text-slate-400 text-sm">Tidak ada job yang cocok dengan filter.</p>
                <button onClick={clearFilters} className="mt-3 text-sm text-blue-600 hover:underline">
                  Reset filter
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
