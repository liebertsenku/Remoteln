import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, MapPin, Building, Trash2, ArrowRight } from 'lucide-react';
import { getSavedJobs, getJob, getExternalJob, unsaveJob } from '../lib/api';
import type { UserResponse, SavedJobResponse } from '../types/api';
import Swal from 'sweetalert2';

type SavedJobWithDetails = SavedJobResponse & {
  title?: string;
  company?: string;
  location?: string;
  isExternal?: boolean;
  externalLink?: string;
  externalIdStr?: string;
};

export default function SavedJobs({ token }: { user: UserResponse; token: string | null }) {
  const [savedJobs, setSavedJobs] = useState<SavedJobWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSavedJobs = async () => {
    if (!token) return;
    try {
      const data = await getSavedJobs(token);

      const enrichedData = await Promise.all(
        data.map(async (save) => {
          try {
            if (save.job_id) {
              const jobData = await getJob(save.job_id);
              return {
                ...save,
                title: jobData.title,
                company: jobData.company,
                location: jobData.location,
                isExternal: false
              };
            } else if (save.external_job_id) {
              const extData = await getExternalJob(String(save.external_job_id));
              return {
                ...save,
                title: extData.title,
                company: extData.company,
                location: extData.location,
                isExternal: true,
                externalLink: extData.url,
                externalIdStr: extData.id
              };
            }
            return save;
          } catch {
            return { ...save, title: 'Unknown Job', company: 'Unknown Company', location: 'Unknown' };
          }
        })
      );

      setSavedJobs(enrichedData.sort((a, b) => new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime()));
    } catch (err: any) {
      setError(err.message || 'Failed to load saved jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedJobs();
  }, [token]);

  const handleUnsave = async (id: number) => {
    if (!token) return;
    try {
      await unsaveJob(token, id);
      setSavedJobs(prev => prev.filter(job => job.id !== id));
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: err.message || 'Failed to remove saved job'
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20 text-slate-500 font-semibold">Loading saved jobs...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-in fade-in duration-500">
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-[2.5rem] font-extrabold text-[#111827] tracking-tight">Saved Jobs</h1>
        <p className="text-slate-500 mt-2 text-[15px]">Jobs you've bookmarked to apply for later.</p>
      </div>

      {error && <div className="bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-100 mb-6 font-medium">{error}</div>}

      {savedJobs.length === 0 && !error ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-14 text-center shadow-sm flex flex-col items-center max-w-4xl mx-auto">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f0f3ff] mb-6">
            <Bookmark className="h-8 w-8 text-[#6344F5]" />
          </div>
          <h3 className="text-2xl font-bold text-[#111827]">No saved jobs</h3>
          <p className="mt-3 text-[15px] text-slate-500 max-w-sm">
            You haven't saved any jobs yet. Start exploring opportunities to find your next career move.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto">
            <Link to="/jobs" className="rounded-xl border border-[#6344F5] bg-white px-6 py-3.5 font-bold text-[#6344F5] hover:bg-[#f8f9fc] transition-colors">
              Find Internal Jobs
            </Link>
            <Link to="/remote-jobs" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6344F5] px-6 py-3.5 font-bold text-white hover:bg-[#5a3ae4] transition-colors shadow-sm shadow-indigo-500/20">
              Explore External Jobs <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {savedJobs.map((job) => (
            <div key={job.id} className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] transition-all hover:border-indigo-200 hover:shadow-md h-full">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0f3ff] text-xl font-bold text-[#6344F5]">
                    {job.company?.charAt(0).toUpperCase() || 'J'}
                  </div>
                  <button
                    onClick={() => handleUnsave(job.id)}
                    className="text-slate-400 hover:text-rose-500 transition-colors"
                    title="Remove bookmark"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                <h3 className="text-[1.15rem] font-bold text-[#111827] line-clamp-2 mb-4 leading-snug">
                  {job.isExternal ? (
                    <a href={job.externalLink} target="_blank" rel="noreferrer" className="hover:text-[#6344F5] transition-colors flex items-center gap-1.5">
                      {job.title} <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ml-1">Ext</span>
                    </a>
                  ) : (
                    <Link to={`/jobs/${job.job_id}`} className="hover:text-[#6344F5] transition-colors">
                      {job.title}
                    </Link>
                  )}
                </h3>

                <div className="space-y-2 mt-4 text-[13px] font-bold text-slate-500">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-slate-400" />
                    <span>{job.company}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>{job.location}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4">
                {job.isExternal ? (
                  <Link
                    to={`/remote-jobs/${job.externalIdStr}`}
                    className="block w-full rounded-xl bg-[#6344F5] py-3.5 text-center text-[14px] font-bold text-white transition-all hover:bg-[#5a3ae4] hover:shadow-sm"
                  >
                    View & Apply
                  </Link>
                ) : (
                  <Link
                    to={`/jobs/${job.job_id}`}
                    className="block w-full rounded-xl bg-[#6344F5] py-3.5 text-center text-[14px] font-bold text-white transition-all hover:bg-[#5a3ae4] hover:shadow-sm"
                  >
                    View & Apply
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
