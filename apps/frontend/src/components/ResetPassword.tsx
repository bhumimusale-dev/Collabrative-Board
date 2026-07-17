import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

const resetPasswordSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Confirm password must be at least 6 characters" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setError('Invalid or missing password reset token.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.resetPassword(token, data.password);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Failed to reset password. The token may be expired or invalid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white flex items-center justify-center font-sans px-4">
      <div className="w-full max-w-md p-8 rounded-3xl bg-[#F8FAFB] border border-[#E2E5E9] shadow-2xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-500 to-purple-600 flex items-center justify-center shadow-lg shadow-teal-500/10 mb-4">
            <span className="text-xl font-bold text-[#1A1D21]">CX</span>
          </div>
          <h2 className="text-2xl font-bold text-[#1A1D21]">Set New Password</h2>
          <p className="text-sm text-[#5F6B7A] mt-1 text-center">
            Set your new secure password below. All other active sessions will be logged out.
          </p>
        </div>

        {!token && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-600 text-red-400 text-sm rounded-xl relative z-10">
            No reset token found in the URL. Please request a new password reset link.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-600 text-red-400 text-sm rounded-xl relative z-10">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center space-y-4 relative z-10">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-2xl">
              Password has been reset successfully! You can now log in with your new password.
            </div>
            <Link
              to="/login"
              className="block w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-purple-600 hover:from-teal-500 hover:to-purple-500 text-[#1A1D21] font-semibold text-sm shadow-md hover:shadow-teal-500/10 transition-all text-center cursor-pointer"
            >
              Go to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5F6B7A] mb-1">
                New Password
              </label>
              <input
                type="password"
                {...register('password')}
                placeholder="••••••••"
                disabled={!token}
                className="w-full px-4 py-3 rounded-xl border border-[#E2E5E9] bg-white text-[#1A1D21] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm disabled:opacity-50"
              />
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5F6B7A] mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                {...register('confirmPassword')}
                placeholder="••••••••"
                disabled={!token}
                className="w-full px-4 py-3 rounded-xl border border-[#E2E5E9] bg-white text-[#1A1D21] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm disabled:opacity-50"
              />
              {errors.confirmPassword && (
                <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-purple-600 hover:from-teal-500 hover:to-purple-500 text-[#1A1D21] font-semibold text-sm shadow-md hover:shadow-teal-500/10 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Updating password...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
