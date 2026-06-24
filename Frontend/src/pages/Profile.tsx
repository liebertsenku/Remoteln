import { useEffect, useState } from 'react';
import { User, Mail, Link as LinkIcon, ShieldCheck, Camera } from 'lucide-react';
import { getMyProfile, createProfile, updateProfile } from '../lib/api';
import type { UserResponse, ProfileResponse } from '../types/api';

export default function Profile({ user, token }: { user: UserResponse; token: string | null }) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    bio: '',
    resume_url: '',
  });
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    if (!token) return;
    const fetchProfile = async () => {
      try {
        const data = await getMyProfile(token);
        setProfile(data);
        setFormData({
          bio: data.bio || '',
          resume_url: data.resume_url || '',
        });
        setSkillTags(data.skills ? data.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s) : []);
      } catch (err: any) {
        if (err.message && err.message.includes('404')) {
          // No profile yet
        } else {
          setError(err.message || 'Failed to load profile');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        bio: formData.bio.trim() || null,
        resume_url: formData.resume_url.trim() || null,
        skills: skillTags.join(', ') || null,
      };

      if (profile) {
        const updated = await updateProfile(token, payload);
        setProfile(updated);
      } else {
        const created = await createProfile(token, payload);
        setProfile(created);
      }
      setSuccess('Profile saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8 text-slate-500">Loading profile...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-[#111827] tracking-tight">My Profile Settings</h1>
        <p className="text-slate-500 mt-2 text-[15px]">Manage your personal information and professional portfolio.</p>
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-10">
        
        {/* Avatar Section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-10">
          <div className="relative inline-block shrink-0">
            <div className="h-[88px] w-[88px] rounded-full bg-gradient-to-br from-[#5a3ae4] to-[#8d2de2] flex items-center justify-center text-3xl font-bold text-white shadow-md shadow-purple-500/20">
              {user.name.substring(0, 2).toUpperCase()}
            </div>
            <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors shadow-sm">
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-[#111827]">{user.name}</h2>
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 tracking-wide uppercase">
                {user.role}
              </span>
            </div>
            <p className="text-[14px] text-slate-500 font-medium">
              Registered on RemoteIn platform
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm font-medium">{error}</div>}
          {success && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100 text-sm font-medium">{success}</div>}

          {/* Readonly Fields */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-700">Full Name</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                readOnly
                value={user.name}
                className="w-full rounded-xl border border-slate-200 bg-[#f8f9fc] py-3.5 pl-11 pr-4 text-[14px] font-medium text-slate-600 cursor-not-allowed outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-700">Email Address</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                readOnly
                value={user.email}
                className="w-full rounded-xl border border-slate-200 bg-[#f8f9fc] py-3.5 pl-11 pr-4 text-[14px] font-medium text-slate-600 cursor-not-allowed outline-none"
              />
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-700">Professional Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-xl border border-slate-200 bg-[#f8f9fc] px-4 py-3.5 text-[14px] text-slate-800 placeholder-slate-400 focus:border-[#6344F5] focus:bg-white focus:ring-1 focus:ring-[#6344F5] outline-none transition-all resize-none leading-relaxed"
              placeholder="Tell employers about your background and what you're looking for..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-700">Skills</label>
            <div className="rounded-xl border border-slate-200 bg-[#f8f9fc] p-2 flex flex-wrap gap-2 focus-within:border-[#6344F5] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#6344F5] transition-all">
              {skillTags.map((tag, idx) => (
                <span key={idx} className="flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[12px] font-bold tracking-wide">
                  {tag}
                  <button 
                    type="button" 
                    onClick={() => setSkillTags(skillTags.filter((_, i) => i !== idx))}
                    className="text-indigo-400 hover:text-indigo-700 focus:outline-none transition-colors"
                  >
                    &times;
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const newSkill = skillInput.trim();
                    if (newSkill && !skillTags.includes(newSkill)) {
                      setSkillTags([...skillTags, newSkill]);
                      setSkillInput('');
                    }
                  } else if (e.key === 'Backspace' && !skillInput && skillTags.length > 0) {
                    e.preventDefault();
                    setSkillTags(skillTags.slice(0, -1));
                  }
                }}
                className="flex-1 bg-transparent border-none outline-none text-[14px] text-slate-800 placeholder-[#6344F5]/50 font-semibold min-w-[140px] py-1.5 px-2"
                placeholder={skillTags.length === 0 ? "Ketik skill (contoh: PHP) lalu Enter" : ""}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-700">Resume / Portfolio URL</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <LinkIcon className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="url"
                name="resume_url"
                value={formData.resume_url}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-[#f8f9fc] py-3.5 pl-11 pr-4 text-[14px] text-slate-800 placeholder-slate-400 focus:border-[#6344F5] focus:bg-white focus:ring-1 focus:ring-[#6344F5] outline-none transition-all"
                placeholder="https://your-portfolio.com"
              />
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="flex items-center gap-2 text-[12px] font-bold text-slate-500">
              <ShieldCheck className="h-4 w-4 text-slate-400" />
              Your profile is visible to premium recruiters.
            </p>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button
                type="button"
                className="flex-1 sm:flex-none px-6 py-3 text-[14px] font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-none px-8 py-3 rounded-xl bg-[#6344F5] text-[14px] font-bold text-white transition-all hover:bg-[#5a3ae4] shadow-sm shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
