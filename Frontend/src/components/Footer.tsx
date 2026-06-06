import { Link } from 'react-router-dom';

export default function Footer() {
 return (
 <footer className="bg-slate-100/90 border-t border-slate-200/60 py-16 text-slate-600 relative z-10">
 <div className="mx-auto grid w-full max-w-screen-2xl grid-cols-1 gap-8 px-4 sm:px-8 md:grid-cols-4 lg:gap-12">
 <div className="md:col-span-1">
 <Link to="/" className="mb-4 block text-2xl font-black text-slate-900 group">
 Remote<span className="text-indigo-650 group-hover:text-indigo-550 transition-colors">In</span>
 </Link>
 <p className="mb-6 text-sm leading-relaxed text-slate-500">
 Great platform for the job seeker that is passionate about startups. Find your dream job easier.
 </p>
 </div>

 <div>
 <h3 className="mb-4 font-bold text-slate-900 text-sm uppercase tracking-wider">About</h3>
 <ul className="space-y-3 text-sm">
 <li><Link to="#" className="transition-colors hover:text-indigo-650 text-slate-500">Companies</Link></li>
 <li><Link to="#" className="transition-colors hover:text-indigo-650 text-slate-500">Pricing</Link></li>
 <li><Link to="#" className="transition-colors hover:text-indigo-650 text-slate-500">Terms of Use</Link></li>
 <li><Link to="#" className="transition-colors hover:text-indigo-650 text-slate-500">Career Advice</Link></li>
 <li><Link to="#" className="transition-colors hover:text-indigo-650 text-slate-500">Privacy Policy</Link></li>
 </ul>
 </div>

 <div>
 <h3 className="mb-4 font-bold text-slate-900 text-sm uppercase tracking-wider">Resources</h3>
 <ul className="space-y-3 text-sm">
 <li><Link to="#" className="transition-colors hover:text-indigo-650 text-slate-500">Help Docs</Link></li>
 <li><Link to="#" className="transition-colors hover:text-indigo-650 text-slate-500">Guidebooks</Link></li>
 <li><Link to="#" className="transition-colors hover:text-indigo-650 text-slate-500">Platform Updates</Link></li>
 <li><Link to="#" className="transition-colors hover:text-indigo-650 text-slate-500">Contact Support</Link></li>
 </ul>
 </div>

 <div>
 <h3 className="mb-4 font-bold text-slate-900 text-sm uppercase tracking-wider">Get Job Notifications</h3>
 <p className="mb-4 text-sm text-slate-500">The latest job news and curated articles, sent directly to your inbox weekly.</p>
 <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
 <input 
 type="email" 
 placeholder="Email address" 
 className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none transition-all"
 />
 <button type="submit" className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 active:scale-95 transition-all shadow-md shadow-indigo-100">
 Subscribe
 </button>
 </form>
 </div>
 </div>

 <div className="mx-auto mt-12 flex w-full max-w-screen-2xl flex-col items-center justify-between border-t border-slate-200 px-4 pt-8 text-sm sm:px-8 md:flex-row">
 <p className="text-slate-450">2026 © RemoteIn. All rights reserved.</p>
 <div className="mt-4 flex gap-3 md:mt-0">
 <a href="#" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-650 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all">
 fb
 </a>
 <a href="#" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-650 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all">
 in
 </a>
 <a href="#" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-650 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all">
 tw
 </a>
 </div>
 </div>
 </footer>
 );
}
