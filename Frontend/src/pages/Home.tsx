import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Briefcase, PenTool, Code, Megaphone, Bookmark, ArrowRight } from 'lucide-react';
import { getJobs } from '../lib/api';
import type { JobResponse, UserResponse } from '../types/api';

type HomeProps = {
  user: UserResponse | null;
};

function renderSalary(job: JobResponse) {
  if (job.salary_min === null && job.salary_max === null) {
    return 'Negotiable';
  }

  if (job.salary_min !== null && job.salary_max !== null) {
    return `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`;
  }

  return `$${(job.salary_min ?? job.salary_max ?? 0).toLocaleString()}`;
}

export default function Home(_props: HomeProps) {
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/remote-jobs?q=${encodeURIComponent(searchKeyword)}&loc=${encodeURIComponent(searchLocation)}`);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const internal = await getJobs();
        setJobs(internal);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Gagal memuat data dashboard.');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  return (
    <div className="relative overflow-hidden bg-white">
      {/* Background Radial Gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* Hero Section */}
      <section className="pt-28 pb-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-[3.5rem] md:text-[4.5rem] font-extrabold text-[#111827] mb-6 tracking-tight leading-[1.1]">
            Find Your Dream <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Remote Job</span> Today
          </h1>
          <p className="text-lg md:text-[1.15rem] text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            The #1 platform for premium remote-first career opportunities. Discover roles that offer flexibility, competitive compensation, and world-class culture.
          </p>

          {/* Search Bar Container */}
          <form onSubmit={handleSearch} className="bg-white p-2.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-2 relative z-10">
            <div className="flex-1 flex items-center gap-3 w-full px-5 py-2">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Job title, keyword, or company"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full focus:outline-none text-slate-800 placeholder-slate-400 bg-transparent text-base"
              />
            </div>
            <div className="w-[1px] h-8 bg-slate-200 hidden md:block"></div>
            <div className="flex-1 flex items-center gap-3 w-full px-5 py-2">
              <MapPin className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Anywhere"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="w-full focus:outline-none text-slate-800 placeholder-slate-400 bg-transparent text-base"
              />
            </div>
            <button type="submit" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white font-bold px-10 py-4 rounded-full w-full md:w-auto transition-opacity whitespace-nowrap text-base">
              Search Jobs
            </button>
          </form>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="bg-slate-50 py-12 border-y border-slate-100">
        <div className="max-w-screen-2xl mx-auto px-4 text-center">
          <p className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase mb-8">Trusted by top remote companies worldwide</p>
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-60 grayscale">
            <span className="text-2xl md:text-3xl font-extrabold text-slate-700">Google</span>
            <span className="text-2xl md:text-3xl font-extrabold text-slate-700">Microsoft</span>
            <span className="text-2xl md:text-3xl font-extrabold text-slate-700">Slack</span>
            <span className="text-2xl md:text-3xl font-extrabold text-slate-700">Zoom</span>
            <span className="text-2xl md:text-3xl font-extrabold text-slate-700">Meta</span>
          </div>
        </div>
      </section>

      {/* Explore By Category Section */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-bold text-[#111827] tracking-tight">Explore by Category</h2>
          <Link to="/jobs" className="text-indigo-600 font-bold flex items-center gap-1.5 hover:text-indigo-700 text-sm">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { name: 'Engineering', icon: Code, count: '1,210', color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { name: 'Design', icon: PenTool, count: '842', color: 'text-purple-600', bg: 'bg-purple-50' },
            { name: 'Marketing', icon: Megaphone, count: '650', color: 'text-orange-500', bg: 'bg-orange-50' },
            { name: 'Sales', icon: Briefcase, count: '420', color: 'text-emerald-500', bg: 'bg-emerald-50' },
          ].map((cat, i) => {
            const IconComponent = cat.icon;
            return (
              <Link 
                key={i} 
                to="/jobs" 
                className="group flex flex-col p-6 bg-white border border-slate-100 rounded-2xl hover:shadow-lg transition-shadow duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${cat.bg} ${cat.color} flex items-center justify-center mb-6`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[#111827] mb-1">{cat.name}</h3>
                <p className="text-sm text-slate-500">{cat.count} open roles</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Latest Opportunities Section */}
      <section className="bg-[#f8f9ff] py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-bold text-[#111827] tracking-tight">Latest Remote Opportunities</h2>
            <Link to="/jobs" className="hidden sm:flex items-center gap-1.5 text-indigo-600 font-bold hover:text-indigo-700 text-sm">
              Browse All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-[320px] rounded-2xl bg-white border border-slate-100 animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {jobs.slice(0, 3).map((job) => (
                <article
                  key={job.id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-extrabold text-lg uppercase">
                      {job.company.substring(0, 1)}
                    </div>
                    <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                      <Bookmark className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <h3 className="text-[1.15rem] font-bold text-[#111827] mb-1 leading-snug">
                    <Link to={`/jobs/${job.id}`} className="hover:text-indigo-600 transition-colors">{job.title}</Link>
                  </h3>
                  <p className="text-slate-500 text-sm mb-4">
                    {job.company} • {job.location}
                  </p>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center rounded bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">
                      Full Time
                    </span>
                    <span className="inline-flex items-center rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                      {renderSalary(job)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-500 mb-6 line-clamp-2 leading-relaxed">
                    {job.description || "We are looking for an experienced professional to join our team and lead development efforts."}
                  </p>

                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Posted 2 hours ago</span>
                    <Link to={`/jobs/${job.id}`} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
                      Apply Now
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-4 py-20 pb-28">
        <div className="bg-gradient-to-r from-[#5a3ae4] to-[#8d2de2] rounded-[1.5rem] p-10 md:p-14 relative overflow-hidden shadow-xl shadow-purple-500/10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="relative z-10 max-w-xl text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight leading-snug">Want to hire top remote talent?</h2>
            <p className="text-base md:text-lg text-white/90 font-medium leading-relaxed">
              Join hundreds of innovative companies building their distributed teams through RemoteIn's premium talent network.
            </p>
          </div>
          <div className="relative z-10 shrink-0">
            <Link to="/register" className="inline-flex items-center justify-center bg-white text-indigo-600 font-bold px-8 py-3.5 rounded-xl hover:bg-slate-50 transition-colors shadow-sm whitespace-nowrap">
              Post a Job Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
