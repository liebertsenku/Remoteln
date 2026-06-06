import { useState, useEffect } from 'react';
import { RefreshCcw, Activity, ShieldCheck, Clock, Users, LayoutDashboard, Database, ChevronRight } from 'lucide-react';
import { createExternalRefreshRequest, getExternalRefreshStatus, getAdminStats, getAdminRecentUsers } from '../lib/api';
import type { SyncStatusResponse, AdminStatsResponse, UserResponse } from '../types/api';

type TabType = 'overview' | 'users' | 'sync';

export default function AdminDashboard({ token }: { token: string | null }) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Stats State
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Sync State
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [loadingSync, setLoadingSync] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [currentReqId, setCurrentReqId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [statsData, usersData] = await Promise.all([
          getAdminStats(token),
          getAdminRecentUsers(token, 20)
        ]);
        setStats(statsData);
        setUsers(usersData);
      } catch (error) {
        console.error("Failed to load admin data", error);
      } finally {
        setLoadingData(false);
      }
    };
    void fetchData();
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


  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-7xl mx-auto min-h-[70vh] animate-in fade-in duration-500">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sticky top-24">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 leading-tight">Admin<br/>Console</h2>
            </div>
          </div>
          
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'overview' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className={`h-5 w-5 ${activeTab === 'overview' ? 'text-indigo-600' : 'text-slate-400'}`} />
                Overview
              </div>
              {activeTab === 'overview' && <ChevronRight className="h-4 w-4 text-indigo-400" />}
            </button>
            
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'users' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className={`h-5 w-5 ${activeTab === 'users' ? 'text-indigo-600' : 'text-slate-400'}`} />
                Users
              </div>
              {activeTab === 'users' && <ChevronRight className="h-4 w-4 text-indigo-400" />}
            </button>

            <button
              onClick={() => setActiveTab('sync')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'sync' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <RefreshCcw className={`h-5 w-5 ${activeTab === 'sync' ? 'text-indigo-600' : 'text-slate-400'}`} />
                External Sync
              </div>
              {activeTab === 'sync' && <ChevronRight className="h-4 w-4 text-indigo-400" />}
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
            {loadingData ? (
              <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-200 border-t-indigo-600"></div></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Stat Cards */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Users</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{stats?.users.total || 0}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Jobseekers</p>
                  <p className="mt-2 text-3xl font-black text-indigo-600">{stats?.users.jobseekers || 0}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Employers</p>
                  <p className="mt-2 text-3xl font-black text-rose-600">{stats?.users.employers || 0}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Jobs (Int/Ext)</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-3xl font-black text-slate-900">{stats?.jobs.internal || 0}</p>
                    <p className="text-lg font-bold text-slate-400">/ {stats?.jobs.external || 0}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Quick Actions / Info */}
            <div className="mt-8 rounded-[2rem] bg-indigo-50 p-8 border border-indigo-100 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 -mr-16 -mb-16 h-64 w-64 rounded-full bg-white/40 blur-3xl" />
              <h3 className="text-xl font-bold text-indigo-900 relative">Welcome to Admin Console</h3>
              <p className="mt-2 text-indigo-700 max-w-2xl relative">
                This dashboard allows you to monitor the platform's vital statistics and synchronize remote jobs from external providers. Select a menu on the left to explore more.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <h1 className="text-2xl font-bold text-slate-900">Recent Users</h1>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider">Joined At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.length === 0 ? (
                      <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No users found.</td></tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold">
                                {u.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{u.name}</p>
                                <p className="text-slate-500 text-xs mt-0.5">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide border ${
                              u.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              u.role === 'employer' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-medium">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sync' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <h1 className="text-2xl font-bold text-slate-900">External Job Synchronization</h1>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Manual Sync Trigger</h2>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">Pull the latest remote jobs from external sources (Remotive, Arbeitnow, Jobicy) into our database.</p>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Database className="h-6 w-6" />
                  </div>
                </div>

                {syncError && <div className="mt-4 mb-4 bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100 font-medium">{syncError}</div>}

                <button
                  onClick={handleSync}
                  disabled={loadingSync}
                  className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3.5 font-bold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCcw className={`h-5 w-5 ${loadingSync ? 'animate-spin' : ''}`} />
                  {loadingSync ? 'Sync in Progress...' : 'Trigger Full Sync Now'}
                </button>
              </div>

              {syncStatus && (
                <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm relative overflow-hidden">
                  <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-slate-50 blur-3xl" />
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6 relative">
                    <Activity className="h-5 w-5 text-slate-400" />
                    Latest Sync Status
                  </h2>

                  <div className="space-y-5 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-500">Status</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                        syncStatus.status === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        syncStatus.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' :
                        syncStatus.status === 'running' ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {syncStatus.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-500">Jobs Processed</span>
                      <span className="font-black text-slate-900 text-lg">{syncStatus.total_jobs_processed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-500">Started At</span>
                      <span className="text-slate-900 text-sm flex items-center gap-1.5 font-medium">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {syncStatus.started_at ? new Date(syncStatus.started_at).toLocaleString() : '-'}
                      </span>
                    </div>
                    <div className="pt-4 border-t border-slate-100">
                      <span className="text-sm font-semibold text-slate-500 block mb-1">Message Log</span>
                      <span className="text-slate-700 text-sm" title={syncStatus.message || ''}>
                        {syncStatus.message || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
