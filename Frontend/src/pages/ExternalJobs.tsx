import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, X, Briefcase, MapPin, Tag } from 'lucide-react';
import { getExternalJobs, getSavedJobs, saveJob, unsaveJob } from '../lib/api';
import type { AggregatedJobList, ExternalJob, UserResponse, SavedJobResponse } from '../types/api';

const SOURCE_BADGE: Record<string, { bg: string; text: string }> = {
  remotive:  { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  arbeitnow: { bg: 'bg-blue-50',    text: 'text-blue-600'    },
  jobicy:    { bg: 'bg-purple-50',  text: 'text-purple-600'  },
};



const SOURCES = ['remotive', 'arbeitnow', 'jobicy'];

type Category = { label: string; emoji: string; keywords: string[] };
const CATEGORIES: Category[] = [
  { label: 'Engineering',    emoji: '💻', keywords: ['engineer', 'developer', 'backend', 'frontend', 'fullstack', 'full-stack', 'software', 'programming', 'web', 'react', 'node', 'python', 'java', 'golang', 'ruby', 'php', 'typescript'] },
  { label: 'Mobile',         emoji: '📱', keywords: ['mobile', 'android', 'ios', 'flutter', 'react native', 'swift', 'kotlin'] },
  { label: 'Data & AI',      emoji: '📊', keywords: ['data', 'machine learning', 'ml', 'ai', 'artificial intelligence', 'analyst', 'analytics', 'scientist', 'bi', 'business intelligence', 'sql', 'tableau', 'etl', 'llm'] },
  { label: 'DevOps & Cloud', emoji: '☁️', keywords: ['devops', 'cloud', 'aws', 'gcp', 'azure', 'infrastructure', 'kubernetes', 'docker', 'sre', 'platform', 'ci/cd', 'terraform', 'linux', 'sysadmin'] },
  { label: 'Design',         emoji: '🎨', keywords: ['design', 'ui', 'ux', 'figma', 'product design', 'graphic', 'visual', 'creative', 'branding', 'illustrat'] },
  { label: 'Marketing',      emoji: '📣', keywords: ['marketing', 'seo', 'growth', 'social media', 'content', 'copywriter', 'digital marketing', 'performance', 'ads', 'pr ', 'brand'] },
  { label: 'Sales',          emoji: '🤝', keywords: ['sales', 'account executive', 'business development', 'account manager', 'revenue', 'crm', 'bdr', 'sdr'] },
  { label: 'Customer Support',emoji: '🎧', keywords: ['customer support', 'customer success', 'customer service', 'support engineer', 'helpdesk', 'technical support', 'cx '] },
  { label: 'Product',        emoji: '🗂️', keywords: ['product manager', 'product owner', 'pm ', 'scrum', 'agile', 'roadmap'] },
  { label: 'Finance',        emoji: '💼', keywords: ['finance', 'accounting', 'bookkeep', 'controller', 'cfo', 'payroll', 'tax', 'audit', 'financial'] },
  { label: 'Cybersecurity',  emoji: '🔒', keywords: ['security', 'cybersecurity', 'pentest', 'infosec', 'soc ', 'firewall', 'compliance', 'appsec'] },
  { label: 'Writing',        emoji: '✍️', keywords: ['writer', 'editor', 'content writer', 'technical writer', 'journalist', 'blogger', 'documentation'] },
];

function jobMatchesCategory(job: ExternalJob, cat: Category): boolean {
  const haystack = [
    job.title,
    job.company,
    ...job.tags,
  ].join(' ').toLowerCase();
  return cat.keywords.some(kw => haystack.includes(kw.toLowerCase()));
}

type Props = {
  user?: UserResponse | null;
  token?: string | null;
};

export default function ExternalJobs({ user, token }: Props) {
  const [data, setData] = useState<AggregatedJobList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [keyword, setKeyword] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hasSalary, setHasSalary] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [savedJobs, setSavedJobs] = useState<SavedJobResponse[]>([]);
  const [savingAction, setSavingAction] = useState<string | null>(null);

  // Pagination state
  const pageSize = 12;
  const [currentPage, setCurrentPage] = useState(1);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getExternalJobs({ limit: 1000 });
      setData(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal mengambil external jobs.');
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

  const handleToggleSave = async (e: React.MouseEvent, job: ExternalJob) => {
    e.preventDefault();
    if (!user || user.role !== 'jobseeker' || !token) {
      alert("Silakan login sebagai Jobseeker untuk menyimpan lowongan.");
      return;
    }

    const saved = savedJobs.find(sj => sj.external_job_id === job.id);
    setSavingAction(job.id);
    try {
      if (saved) {
        await unsaveJob(token, saved.id);
        setSavedJobs(prev => prev.filter(sj => sj.id !== saved.id));
      } else {
        const newSaved = await saveJob(token, { external_job_id: job.id });
        setSavedJobs(prev => [...prev, newSaved]);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan job');
    } finally {
      setSavingAction(null);
    }
  };



  const filteredJobs = useMemo((): ExternalJob[] => {
    if (!data) return [];
    let jobs = [...data.jobs];

    const kw = keyword.trim().toLowerCase();
    if (kw) {
      jobs = jobs.filter(j =>
        j.title.toLowerCase().includes(kw) ||
        j.company.toLowerCase().includes(kw) ||
        j.tags.some(t => t.toLowerCase().includes(kw))
      );
    }

    const loc = locationQuery.trim().toLowerCase();
    if (loc) {
      jobs = jobs.filter(j => j.location.toLowerCase().includes(loc));
    }

    if (selectedSources.size > 0) {
      jobs = jobs.filter(j => selectedSources.has(j.source));
    }

    if (selectedCategory) {
      const cat = CATEGORIES.find(c => c.label === selectedCategory);
      if (cat) jobs = jobs.filter(j => jobMatchesCategory(j, cat));
    }

    if (hasSalary) {
      jobs = jobs.filter(j => !!j.salary);
    }

    // Always sort by date for consistency with design (we don't show the sort dropdown anymore)
    jobs.sort((a, b) => {
      const da = a.published_at ? new Date(a.published_at).getTime() : 0;
      const db = b.published_at ? new Date(b.published_at).getTime() : 0;
      return db - da;
    });

    return jobs;
  }, [data, keyword, locationQuery, selectedSources, selectedCategory, hasSalary]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, locationQuery, selectedSources, selectedCategory, hasSalary]);

  const paginatedJobs = useMemo(() => {
    return filteredJobs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredJobs, currentPage]);

  const totalPages = Math.ceil(filteredJobs.length / pageSize);

  const categoryCount = useMemo(() => {
    if (!data) return {};
    return Object.fromEntries(
      CATEGORIES.map(cat => [cat.label, data.jobs.filter(j => jobMatchesCategory(j, cat)).length])
    );
  }, [data]);

  const POPULAR_SEARCHES = ['Front-end', 'Back-end', 'Development', 'PHP', 'Laravel', 'Bootstrap', 'Developer', 'Team Lead', 'Product Testing', 'Javascript'];

  const clearFilters = () => {
    setSelectedSources(new Set());
    setSelectedCategory(null);
    setHasSalary(false);
  };

  const toggleSource = (src: string) => {
    setSelectedSources(prev => {
      const next = new Set(prev);
      next.has(src) ? next.delete(src) : next.add(src);
      return next;
    });
  };



  return (
    <div className="space-y-8">
      {/* Search and Filter Section */}
      <div className="space-y-4">
        {/* Search Bar Card */}
        <div className="flex flex-col md:flex-row items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          {/* Keyword Input */}
          <label className="relative flex-1 w-full md:w-auto flex items-center border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
            <Search className="h-5 w-5 text-slate-400 absolute left-3" />
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              type="text"
              placeholder="Search by: Job title, Position, Keyword..."
              className="w-full bg-transparent py-2 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
          </label>

          {/* Location Input */}
          <label className="relative flex-1 w-full md:w-auto flex items-center border-b md:border-b-0 border-slate-200 pb-3 md:pb-0">
            <MapPin className="h-5 w-5 text-slate-400 absolute left-3" />
            <input
              value={locationQuery}
              onChange={e => setLocationQuery(e.target.value)}
              type="text"
              placeholder="City, state or zip code"
              className="w-full bg-transparent py-2 pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            <svg className="h-5 w-5 text-slate-400 absolute right-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </label>

          {/* Actions */}
          <div className="flex w-full md:w-auto items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFilters(v => !v)}
              className={`flex flex-1 md:flex-none items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${showFilters ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
            <button
              type="button"
              className="flex flex-1 md:flex-none items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              Find Job
            </button>
          </div>
        </div>

        {/* Popular Searches */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500 mr-1">Popular searches:</span>
          {POPULAR_SEARCHES.map(term => {
            const isActive = keyword.toLowerCase() === term.toLowerCase();
            return (
              <button
                key={term}
                onClick={() => setKeyword(isActive ? '' : term)}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                {term}
              </button>
            );
          })}
        </div>
        
        {/* Expanded Filters */}
        {showFilters && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            {/* Category chips */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Tag className="h-3.5 w-3.5" /> Kategori Pekerjaan
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => {
                  const active = selectedCategory === cat.label;
                  const count = (categoryCount as Record<string, number>)[cat.label] ?? 0;
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setSelectedCategory(active ? null : cat.label)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                        active
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      {cat.label}
                      {count > 0 && (
                        <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          active ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              {/* Source chips */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Briefcase className="h-3.5 w-3.5" /> Source
                </p>
                <div className="flex flex-wrap gap-2">
                  {SOURCES.map(src => {
                    const active = selectedSources.has(src);
                    return (
                      <button
                        key={src}
                        type="button"
                        onClick={() => toggleSource(src)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-all ${
                          active
                            ? `border-blue-300 bg-blue-50 text-blue-700`
                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {src}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Salary Toggle */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Gaji
                </p>
                <button
                  type="button"
                  onClick={() => setHasSalary(v => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    hasSalary
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  💰 Ada Salary
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Reset Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

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
                  {paginatedJobs.map(job => {
                    const badge = SOURCE_BADGE[job.source] ?? { bg: 'bg-slate-50', text: 'text-slate-600' };
                    return (
                      <article
                        key={job.id}
                        className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 hover:shadow-md transition-all duration-200"
                      >
                        <div>
                          {/* Top: Title */}
                          <Link to={`/remote-jobs/${job.id}`} className="block mb-3 pr-8">
                            <h2 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                              {job.title}
                            </h2>
                          </Link>

                          {/* Middle: Pill & Salary */}
                          <div className="flex flex-wrap items-center gap-3 mb-8">
                            <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}>
                              {job.source}
                            </span>
                            <span className="text-xs font-medium text-slate-500">
                              Salary: {job.salary || 'Not specified'}
                            </span>
                          </div>
                        </div>

                        {/* Bottom: Logo, Company, Location, Bookmark */}
                        <div className="flex items-center gap-4 mt-auto">
                          {/* Logo */}
                          {job.company_logo ? (
                            <img src={job.company_logo} alt={job.company} className="h-10 w-10 shrink-0 rounded-lg border border-slate-100 object-cover bg-white" />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-sm font-bold uppercase text-slate-400">
                              {job.company.substring(0, 2)}
                            </div>
                          )}
                          
                          {/* Company Info */}
                          <div className="flex flex-col overflow-hidden">
                            <p className="text-sm font-bold text-slate-800 truncate">{job.company}</p>
                            <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{job.location}</span>
                            </p>
                          </div>

                          {/* Bookmark Button */}
                          <div className="ml-auto">
                            <button
                              onClick={(e) => handleToggleSave(e, job)}
                              disabled={savingAction === job.id}
                              className="p-1.5 text-slate-300 hover:text-blue-600 transition-colors disabled:opacity-50"
                              title={savedJobs.some(sj => sj.external_job_id === job.id) ? "Hapus dari tersimpan" : "Simpan Job"}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={savedJobs.some(sj => sj.external_job_id === job.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={savedJobs.some(sj => sj.external_job_id === job.id) ? "text-blue-600" : ""}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-10 mb-4 flex justify-center items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-blue-500 hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
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
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                        >
                          {pageNum.toString().padStart(2, '0')}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
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
