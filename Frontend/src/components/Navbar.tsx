import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogOut, FileText, Bookmark, User as UserIcon, ChevronDown, ShieldCheck } from 'lucide-react';
import type { UserResponse } from '../types/api';

type NavbarProps = {
 user: UserResponse | null;
 onLogout: () => void;
};

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
 `px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all duration-300 ${
 isActive 
 ? 'text-indigo-650 bg-indigo-50 border border-indigo-100 shadow-sm shadow-indigo-100/10' 
 : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-transparent'
 }`;

export default function Navbar({ user, onLogout }: NavbarProps) {
 const [dropdownOpen, setDropdownOpen] = useState(false);
 const dropdownRef = useRef<HTMLDivElement>(null);
 const location = useLocation();

 useEffect(() => {
 setDropdownOpen(false);
 }, [location.pathname]);

 useEffect(() => {
 function handleClickOutside(event: MouseEvent) {
 if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
 setDropdownOpen(false);
 }
 }
 document.addEventListener("mousedown", handleClickOutside);
 return () => document.removeEventListener("mousedown", handleClickOutside);
 }, []);

 return (
 <header className="fixed inset-x-0 top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-slate-200/50 shadow-sm transition-all duration-300">
 <div className="mx-auto flex h-[76px] w-full max-w-screen-2xl items-center justify-between px-4 sm:px-8">
 <div className="flex items-center gap-8">
 <Link to="/" className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 group">
 <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-base font-extrabold shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
 R
 </div>
 <span>
 Remote<span className="text-indigo-600 group-hover:text-indigo-500 transition-colors duration-300">In</span>
 </span>
 </Link>
 
 <nav className="hidden items-center gap-2 sm:flex mt-0.5">
 <NavLink to="/" end className={navLinkClass}>
 Home
 </NavLink>
 <NavLink to="/jobs" className={navLinkClass}>
 Find Jobs
 </NavLink>
 <NavLink to="/remote-jobs" className={navLinkClass}>
 External Jobs
 </NavLink>
 {user?.role === 'employer' && (
 <NavLink to="/dashboard" className={navLinkClass}>
 Dashboard
 </NavLink>
 )}
 {user?.role === 'admin' && (
 <NavLink to="/admin/dashboard" className={navLinkClass}>
 Admin Dashboard
 </NavLink>
 )}
 </nav>
 </div>

 <div className="flex items-center gap-3">
 {user ? (
 <div className="relative" ref={dropdownRef}>
 <button 
 onClick={() => setDropdownOpen(!dropdownOpen)}
 className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white/80 py-1.5 pl-2 pr-4 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
 >
 <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-extrabold shadow-sm">
 {user.name.charAt(0).toUpperCase()}
 </div>
 <span className="max-w-[120px] truncate">{user.name}</span>
 <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
 </button>

 {dropdownOpen && (
 <div className="absolute right-0 mt-3 w-60 origin-top-right rounded-2xl border border-slate-200/60 bg-white p-2 shadow-2xl ring-1 ring-black/5 focus:outline-none animate-in fade-in slide-in-from-top-2 duration-300 z-50">
 <div className="px-4 py-3 border-b border-slate-100 mb-1.5">
 <p className="text-sm font-extrabold text-slate-900 truncate">{user.name}</p>
 <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
 <span className="inline-block mt-2 rounded bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-indigo-650 tracking-wider">
 {user.role}
 </span>
 </div>

 {user.role === 'jobseeker' && (
 <div className="space-y-0.5">
 <Link to="/profile" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-650 hover:bg-slate-50 hover:text-indigo-600 transition-all">
 <UserIcon className="h-4 w-4 text-slate-400" />
 My Profile
 </Link>
 <Link to="/applications" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-650 hover:bg-slate-50 hover:text-indigo-600 transition-all">
 <FileText className="h-4 w-4 text-slate-400" />
 My Applications
 </Link>
 <Link to="/saved-jobs" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-650 hover:bg-slate-50 hover:text-indigo-600 transition-all">
 <Bookmark className="h-4 w-4 text-slate-400" />
 Saved Jobs
 </Link>
 <div className="my-1.5 border-b border-slate-100"></div>
 </div>
 )}
 
 {user.role === 'employer' && (
 <div className="space-y-0.5">
 <Link to="/dashboard" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-655 hover:bg-slate-50 hover:text-indigo-600 transition-all">
 <UserIcon className="h-4 w-4 text-slate-400" />
 Employer Dashboard
 </Link>
 <div className="my-1.5 border-b border-slate-100"></div>
 </div>
 )}

 {user.role === 'admin' && (
 <div className="space-y-0.5">
 <Link to="/admin/dashboard" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-650 hover:bg-slate-50 hover:text-indigo-600 transition-all">
 <ShieldCheck className="h-4 w-4 text-slate-400" />
 Admin Dashboard
 </Link>
 <div className="my-1.5 border-b border-slate-100"></div>
 </div>
 )}
 
 <button
 onClick={onLogout}
 className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all font-bold"
 >
 <LogOut className="h-4 w-4 text-rose-500" />
 Sign out
 </button>
 </div>
 )}
 </div>
 ) : (
 <>
 <Link to="/login" className="px-4 py-2 text-sm font-bold text-slate-500 transition-colors hover:text-indigo-600">
 Log in
 </Link>
 <Link to="/register" className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all focus:ring-2 focus:ring-indigo-500/50">
 Sign up
 </Link>
 </>
 )}
 </div>
 </div>
 </header>
 );
}
