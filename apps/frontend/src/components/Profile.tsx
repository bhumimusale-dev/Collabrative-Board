import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

const profileSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  bio: z.string().max(160, { message: "Bio cannot exceed 160 characters" }).optional(),
  theme: z.string(),
  language: z.string(),
  timezone: z.string(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export const Profile: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      username: user?.username || '',
      bio: user?.bio || '',
      theme: user?.theme || 'light',
      language: user?.language || 'en',
      timezone: user?.timezone || 'UTC',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        username: user.username,
        bio: user.bio || '',
        theme: user.theme || 'light',
        language: user.language || 'en',
        timezone: user.timezone || 'UTC',
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: ProfileForm) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await api.updateProfile(data);
      updateUser(updated);
      setSuccess('Profile updated successfully!');
    } catch (e: any) {
      setError(e.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];
    const formData = new FormData();
    formData.append('avatar', file);

    setUploadingAvatar(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.uploadAvatar(formData);
      if (user) {
        updateUser({
          ...user,
          avatar: res.avatar_url,
        });
      }
      setSuccess('Avatar uploaded successfully!');
    } catch (e: any) {
      setError(e.message || 'Failed to upload avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 font-sans text-slate-100 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        
        {/* Header Banner */}
        <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600 relative">
          <Link
            to="/dashboard"
            className="absolute top-4 left-4 px-4 py-2 bg-black/30 hover:bg-black/40 backdrop-blur-md text-xs font-semibold text-white rounded-full transition-all flex items-center gap-1"
          >
            ← Back to Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="absolute top-4 right-4 px-4 py-2 bg-red-600/30 hover:bg-red-600/40 border border-red-500/20 backdrop-blur-md text-xs font-semibold text-red-200 rounded-full transition-all"
          >
            Sign Out
          </button>
        </div>

        {/* Profile Card Body */}
        <div className="px-8 pb-8 pt-0 relative">
          
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 mb-8">
            <div className="w-24 h-24 rounded-full border-4 border-slate-900 overflow-hidden bg-slate-800 shadow-xl relative group">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-3xl font-bold text-white uppercase">
                  {user?.name.charAt(0)}
                </div>
              )}

              {/* Upload Overlay */}
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider text-center px-1">
                  {uploadingAvatar ? 'Uploading...' : 'Change'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
            
            <div className="text-center sm:text-left flex-1">
              <h3 className="text-xl font-bold">{user?.name}</h3>
              <p className="text-sm text-slate-400">@{user?.username}</p>
              <div className="mt-2 flex items-center justify-center sm:justify-start gap-2">
                {user?.email_verified ? (
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-full">
                    Verified Account
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase tracking-wider rounded-full">
                    Unverified Account
                  </span>
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-800 mb-8" />

          {/* Feedback Messages */}
          {success && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-2xl">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                />
                {errors.name && (
                  <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  {...register('username')}
                  className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                />
                {errors.username && (
                  <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Bio / About Me
              </label>
              <textarea
                {...register('bio')}
                rows={3}
                placeholder="Write a brief bio about yourself..."
                className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm resize-none"
              />
              {errors.bio && (
                <p className="text-red-400 text-xs mt-1">{errors.bio.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Theme Preference
                </label>
                <select
                  {...register('theme')}
                  className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                >
                  <option value="light">Light Mode</option>
                  <option value="dark">Dark Mode</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Language
                </label>
                <select
                  {...register('language')}
                  className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                >
                  <option value="en">English (US)</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Timezone
                </label>
                <select
                  {...register('timezone')}
                  className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">EST (New York)</option>
                  <option value="Europe/London">GMT (London)</option>
                  <option value="Asia/Kolkata">IST (India)</option>
                  <option value="Asia/Tokyo">JST (Tokyo)</option>
                </select>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? 'Saving Changes...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
