import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { getMe } from './lib/api';
import type { UserResponse } from './types/api';
import EmployerDashboard from './pages/EmployerDashboard';
import ExternalJobs from './pages/ExternalJobs';
import Home from './pages/Home';
import JobDetail from './pages/JobDetail';
import ExternalJobDetail from './pages/ExternalJobDetail';
import Jobs from './pages/Jobs';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import MyApplications from './pages/MyApplications';
import SavedJobs from './pages/SavedJobs';
import AdminDashboard from './pages/AdminDashboard';

const TOKEN_STORAGE_KEY = 'remotein_access_token';

type GuardProps = {
  user: UserResponse | null;
  children: ReactNode;
};

function RequireEmployer({ user, children }: GuardProps) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== 'employer') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ user, children }: GuardProps) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AppLayout({ user, token, sessionLoading, handleLoggedIn, handleLogout }: any) {
  const location = useLocation();
  const isDashboardRoute = location.pathname === '/dashboard';
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute || isDashboardRoute) {
    return (
      <div className="min-h-screen bg-[#f8f9fc]">
        {sessionLoading ? (
          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-200 border-t-indigo-600"></div>
          </div>
        ) : (
          <Routes>
            <Route
              path="/admin/dashboard"
              element={
                <RequireAdmin user={user}>
                  <AdminDashboard token={token} onLogout={handleLogout} />
                </RequireAdmin>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireEmployer user={user}>
                  <EmployerDashboard user={user} token={token} onLogout={handleLogout} />
                </RequireEmployer>
              }
            />
            <Route path="*" element={<Navigate to={user?.role === 'admin' ? "/admin/dashboard" : "/dashboard"} replace />} />
          </Routes>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={user} onLogout={handleLogout} />
      <main className="flex-1 w-full pb-10 pt-[76px]">
        {sessionLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Memuat sesi...</div>
        ) : (
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/jobs" element={<Jobs user={user} token={token} />} />
            <Route path="/jobs/:jobId" element={<JobDetail user={user} />} />
            <Route path="/remote-jobs" element={<ExternalJobs user={user} token={token} />} />
            <Route path="/remote-jobs/:jobId" element={<ExternalJobDetail />} />
            <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin/dashboard' : user.role === 'employer' ? '/dashboard' : '/'} replace /> : <Login onLoggedIn={handleLoggedIn} />} />
            <Route path="/register" element={user ? <Navigate to={user.role === 'admin' ? '/admin/dashboard' : user.role === 'employer' ? '/dashboard' : '/'} replace /> : <Register />} />
            <Route path="/profile" element={user && user.role === 'jobseeker' ? <Profile user={user} token={token} /> : <Navigate to="/login" replace />} />
            <Route path="/applications" element={user && user.role === 'jobseeker' ? <MyApplications user={user} token={token} /> : <Navigate to="/login" replace />} />
            <Route path="/saved-jobs" element={user && user.role === 'jobseeker' ? <SavedJobs user={user} token={token} /> : <Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<UserResponse | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setSessionLoading(false);
        return;
      }
      try {
        const profile = await getMe(token);
        setUser(profile);
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setSessionLoading(false);
      }
    };
    void loadProfile();
  }, [token]);

  const handleLoggedIn = async (nextToken: string) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setToken(nextToken);
    try {
      const profile = await getMe(nextToken);
      setUser(profile);
      return profile;
    } catch (error) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken(null);
      setUser(null);
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <BrowserRouter>
      <AppLayout 
        user={user} 
        token={token} 
        sessionLoading={sessionLoading} 
        handleLoggedIn={handleLoggedIn} 
        handleLogout={handleLogout} 
      />
    </BrowserRouter>
  );
}
