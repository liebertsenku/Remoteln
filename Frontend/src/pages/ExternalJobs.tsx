import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, X, Briefcase, MapPin, Tag, Bookmark } from 'lucide-react';
import { getExternalJobs, getSavedJobs, saveJob, unsaveJob } from '../lib/api';
import type { AggregatedJobList, ExternalJob, UserResponse, SavedJobResponse } from '../types/api';
import Swal from 'sweetalert2';

const SOURCE_BADGE: Record<string, { bg: string; text: string }> = {
 remotive: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
 arbeitnow: { bg: 'bg-blue-50', text: 'text-blue-600' },
 jobicy: { bg: 'bg-purple-50', text: 'text-purple-600' },
};



const SOURCES = ['remotive', 'arbeitnow', 'jobicy'];

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
 Swal.fire({
 icon: 'warning',
 title: 'Perhatian',
 text: 'Silakan login sebagai Jobseeker untuk menyimpan lowongan.'
 });
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
 Swal.fire({
 icon: 'error',
 title: 'Oops...',
 text: err.message || 'Gagal menyimpan job'
 });
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
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-[2.5rem] md:text-[3rem] font-extrabold text-[#111827] tracking-tight mb-3">Explore the World's Best Remote Roles</h1>
        <p className="text-slate-500 text-lg max-w-2xl">Discover aggregated opportunities from top global platforms, curated for high-caliber professionals.</p>
      </div>

      {/* Search and Filter Section */}
      <div className="space-y-5">
        {/* Search Bar Card */}
        <div className="flex flex-col md:flex-row items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {/* Keyword Input */}
          <label className="relative flex-1 w-full md:w-auto flex items-center border-b md:border-b-0 md:border-r border-slate-100 pb-2 md:pb-0">
            <Search className="h-5 w-5 text-slate-400 absolute left-4" />
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              type="text"
              placeholder="Job title, keywords, or company"
              className="w-full bg-transparent py-2.5 pl-12 pr-4 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
          </label>

          {/* Location Input */}
          <label className="relative flex-1 w-full md:w-auto flex items-center pb-2 md:pb-0">
            <MapPin className="h-5 w-5 text-slate-400 absolute left-4" />
            <input
              value={locationQuery}
              onChange={e => setLocationQuery(e.target.value)}
              type="text"
              placeholder="City, state, or 'Remote'"
              className="w-full bg-transparent py-2.5 pl-12 pr-4 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
          </label>

          {/* Actions */}
          <div className="flex w-full md:w-auto items-center gap-2 pl-2 md:border-l border-slate-100 md:pl-4 pr-1">
            <button
              type="button"
              onClick={() => setShowFilters(v => !v)}
              className={`flex flex-1 md:flex-none items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-semibold transition-colors ${showFilters ? 'bg-indigo-50 text-indigo-700' : 'bg-transparent text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
            <button
              type="button"
              className="flex flex-1 md:flex-none items-center justify-center rounded-xl bg-indigo-600 px-8 py-3 text-[15px] font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Find Job
            </button>
          </div>
        </div>

        {/* Popular Searches */}
        <div className="flex flex-wrap items-center gap-3 text-sm px-1">
          <span className="text-slate-700 font-bold text-[13px]">Popular:</span>
          {['Front-end', 'Developer', 'Product Manager'].map(term => {
            const isActive = keyword.toLowerCase() === term.toLowerCase();
            return (
              <button
                key={term}
                onClick={() => setKeyword(isActive ? '' : term)}
                className={`rounded-full px-4 py-1.5 font-medium transition-colors border ${isActive
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                  : 'text-indigo-600 bg-indigo-50/50 border-transparent hover:bg-indigo-50'
                  }`}
              >
                {term}
              </button>
            );
          })}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row gap-8 relative">
            {/* Category chips */}
            <div className="flex-1">
              <p className="mb-4 flex items-center gap-2 text-[13px] font-bold text-slate-700">
                <Tag className="h-4 w-4" /> Kategori Pekerjaan
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => {
                  const active = selectedCategory === cat.label;
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setSelectedCategory(active ? null : cat.label)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-all ${active
                        ? 'border-indigo-600 bg-white text-indigo-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                        }`}
                    >
                      <span>{cat.emoji}</span>
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Source chips */}
            <div className="flex-1">
              <p className="mb-4 flex items-center gap-2 text-[13px] font-bold text-slate-700">
                <Briefcase className="h-4 w-4" /> Source
              </p>
              <div className="flex flex-wrap gap-2">
                {SOURCES.map(src => {
                  const active = selectedSources.has(src);
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => toggleSource(src)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-1.5 text-[13px] font-medium transition-all ${active
                        ? `border-indigo-600 bg-indigo-600 text-white`
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                    >
                      {src}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Salary Toggle */}
            <div className="flex-1">
              <p className="mb-4 flex items-center gap-2 text-[13px] font-bold text-slate-700">
                💵 Gaji
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setHasSalary(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hasSalary ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hasSalary ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-[13px] font-medium text-slate-600">💰 Ada Salary</span>
              </div>
            </div>

            <div className="absolute bottom-6 right-6">
              <button
                type="button"
                onClick={clearFilters}
                className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Reset Filter
              </button>
            </div>
          </div>
        )}
 </div>

 {/* Error */}
 {error && (
 <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
 )}

  {/* Results Header */}
  <div className="flex justify-between items-center mt-4 mb-6">
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
 {paginatedJobs.map(job => {
 const badge = SOURCE_BADGE[job.source] ?? { bg: 'bg-slate-50', text: 'text-slate-600' };
 return (
                <article
                  key={job.id}
                  className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 hover:shadow-lg transition-all duration-300 relative"
                >
                  <div className="absolute top-6 right-6">
                    <button
                      onClick={(e) => handleToggleSave(e, job)}
                      disabled={savingAction === job.id}
                      className="text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                      title={savedJobs.some(sj => sj.external_job_id === job.id) ? "Hapus dari tersimpan" : "Simpan Job"}
                    >
                      <Bookmark className={`w-5 h-5 ${savedJobs.some(sj => sj.external_job_id === job.id) ? "text-indigo-600 fill-indigo-600" : ""}`} />
                    </button>
                  </div>
                  
                  <div>
                    {/* Title */}
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="block mb-4 pr-8">
                      <h2 className="text-[1.15rem] font-bold text-[#111827] leading-snug mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2">
                        {job.title}
                      </h2>
                    </a>

                    {/* Pills: Source & Salary */}
                    <div className="flex items-center gap-2 mb-6">
                      <span className="inline-flex items-center rounded bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        {job.source}
                      </span>
                      <span className="inline-flex items-center text-xs font-medium text-slate-400">
                        💵 {job.salary || 'Undisclosed'}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-px bg-slate-100 mb-5"></div>

                  {/* Bottom: Logo, Company, Location */}
                  <div className="flex items-center gap-3">
                    {/* Logo */}
                    {job.company_logo ? (
                      <img src={job.company_logo} alt={job.company} className="h-10 w-10 shrink-0 rounded-xl border border-slate-100 object-cover bg-white shadow-sm" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-base font-bold uppercase text-indigo-500 shadow-sm">
                        {job.company.substring(0, 1)}
                      </div>
                    )}

                    {/* Company Info */}
                    <div className="flex flex-col overflow-hidden">
                      <p className="text-[13px] font-bold text-slate-800 truncate">{job.company}</p>
                      <p className="flex items-center gap-1 text-[11px] font-medium text-slate-400 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{job.location}</span>
                      </p>
                    </div>
                  </div>
                </article>
 );
 })}
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
 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
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
