import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Calendar, CheckCircle, Clock, XCircle, FileText, Search, Eye, Rocket, BadgeCheck, Bell } from 'lucide-react';
import { getMyApplications, getJob } from '../lib/api';
import type { UserResponse, ApplicationResponse } from '../types/api';
import confetti from 'canvas-confetti';

type ApplicationWithJob = ApplicationResponse & {
  jobTitle?: string;
  company?: string;
  employerEmail?: string;
};

export default function MyApplications({ token }: { user: UserResponse; token: string | null }) {
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    const fetchApps = async () => {
      try {
        const apps = await getMyApplications(token);

        // Fetch job details for each application to show title and company
        const appsWithJobs = await Promise.all(
          apps.map(async (app) => {
            try {
              const jobData = await getJob(app.job_id);
              return { 
                ...app, 
                jobTitle: jobData.title, 
                company: jobData.company,
                employerEmail: jobData.owner?.email
              };
            } catch {
              return { 
                ...app, 
                jobTitle: 'Unknown Job', 
                company: 'Unknown Company' 
              };
            }
          })
        );

        // Sort by newest first
        const sorted = appsWithJobs.sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime());
        setApplications(sorted);

        if (sorted.some(app => app.status === 'accepted')) {
          setTimeout(() => {
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 }
            });
          }, 500);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load applications');
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, [token]);

  if (loading) {
    return <div className="flex justify-center py-20 text-slate-500 font-semibold">Loading applications...</div>;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-bold text-orange-600 border border-orange-100/50"><Clock className="w-3.5 h-3.5" /> Pending</span>;
      case 'reviewed':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-600 border border-blue-100/50"><Eye className="w-3.5 h-3.5" /> Reviewed</span>;
      case 'accepted':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-600 border border-emerald-100/50"><CheckCircle className="w-3.5 h-3.5" /> Accepted</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-600 border border-rose-100/50"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in duration-500">
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-[2.5rem] font-extrabold text-[#111827] tracking-tight">My Applications</h1>
        <p className="text-slate-500 mt-2 text-[15px]">Track the status of jobs you've applied for.</p>
      </div>

      {error && <div className="bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-100 mb-6 font-medium">{error}</div>}

      {applications.some(app => app.status === 'accepted') && (
        <div className="mb-8 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/30 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 opacity-20 pointer-events-none">
            <CheckCircle className="w-40 h-40" />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <span className="text-3xl">🎉</span> Congratulations!
            </h2>
            <p className="text-emerald-50 font-medium text-[15px]">
              Satu atau lebih lamaran Anda telah diterima! Periksa detailnya di bawah.
            </p>
          </div>
        </div>
      )}

      {applications.length === 0 && !error ? (
        <div className="space-y-8">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-14 text-center shadow-sm flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f0f3ff] mb-6">
              <Briefcase className="h-8 w-8 text-[#6344F5]" />
            </div>
            <h3 className="text-2xl font-bold text-[#111827]">No applications yet</h3>
            <p className="mt-3 text-[15px] text-slate-500 max-w-sm">
              You haven't applied to any jobs. Start exploring opportunities!
            </p>
            <Link to="/jobs" className="mt-8 inline-flex rounded-xl bg-[#6344F5] px-8 py-3.5 font-bold text-white hover:bg-[#5a3ae4] transition-colors shadow-sm shadow-indigo-500/20">
              Find Jobs
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="rounded-2xl bg-[#f8f9fc] p-6 border border-slate-100">
              <Rocket className="h-6 w-6 text-[#6344F5] mb-4" />
              <h4 className="font-bold text-[#111827] text-sm mb-1.5">Fast Track</h4>
              <p className="text-xs text-slate-500 leading-relaxed">Applications are reviewed within 48 hours on average.</p>
            </div>
            <div className="rounded-2xl bg-[#f8f9fc] p-6 border border-slate-100">
              <BadgeCheck className="h-6 w-6 text-[#6344F5] mb-4" />
              <h4 className="font-bold text-[#111827] text-sm mb-1.5">Verified Listings</h4>
              <p className="text-xs text-slate-500 leading-relaxed">Only direct-to-recruiter postings are listed on RemoteIn.</p>
            </div>
            <div className="rounded-2xl bg-[#f8f9fc] p-6 border border-slate-100">
              <Bell className="h-6 w-6 text-[#6344F5] mb-4" />
              <h4 className="font-bold text-[#111827] text-sm mb-1.5">Real-time Updates</h4>
              <p className="text-xs text-slate-500 leading-relaxed">Receive instant feedback on your application status.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_4px_20px_rgb(0,0,0,0.02)] transition-all hover:border-indigo-200 hover:shadow-md">
              <div>
                <div className="flex flex-wrap items-center gap-4 mb-2">
                  <h3 className="text-[1.35rem] font-bold text-[#111827] leading-tight">
                    {app.jobTitle}
                  </h3>
                  {getStatusBadge(app.status)}
                </div>
                <p className="text-[14px] text-slate-600 font-medium mb-4">{app.company}</p>
                <div className="flex flex-wrap items-center gap-6 text-[13px] font-bold text-slate-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    Applied {new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  {app.cover_letter && (
                    <div className="flex items-center gap-2 text-[#6344F5]">
                      <FileText className="h-4 w-4" />
                      Cover letter included
                    </div>
                  )}
                </div>
                {app.status === 'accepted' && app.employerEmail && (
                  <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <p className="text-[13px] text-emerald-800 font-medium leading-relaxed">
                      <strong>Tindak Lanjut:</strong> Selamat! Silakan hubungi <em>employer</em> melalui email di <a href={`mailto:${app.employerEmail}`} className="text-emerald-600 font-bold hover:underline">{app.employerEmail}</a> untuk informasi proses selanjutnya.
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-4 sm:mt-0 sm:shrink-0">
                <Link to={`/jobs/${app.job_id}`} className="inline-flex w-full justify-center rounded-xl bg-[#f0f3ff] px-6 py-2.5 text-[14px] font-bold text-[#6344F5] hover:bg-[#e0e7ff] transition-colors">
                  View Job
                </Link>
              </div>
            </div>
          ))}

          {/* Bottom CTA */}
          <div className="mt-12 rounded-[1.5rem] border-2 border-dashed border-slate-200 bg-white p-12 text-center flex flex-col items-center">
            <Search className="h-10 w-10 text-slate-400 mb-4" />
            <h3 className="text-xl font-bold text-[#111827] mb-2">Looking for more?</h3>
            <p className="text-[14px] text-slate-500 mb-8 max-w-sm mx-auto">
              Discover thousands of remote opportunities tailored for you.
            </p>
            <Link to="/remote-jobs" className="inline-flex rounded-xl bg-[#6344F5] px-8 py-3.5 font-bold text-white hover:bg-[#5a3ae4] transition-colors shadow-sm">
              Explore New Roles &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
